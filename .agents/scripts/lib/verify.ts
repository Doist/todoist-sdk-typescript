import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cleanGitEnv, git } from './git.ts'
import { clearVerified, safeName, stateDir, writeVerified } from './state.ts'
import { changedPaths, changedSince, classify, codeFingerprint, snapshot } from './tree.ts'

export type Step = {
    name: string
    command: string
    args: string[]
    /** Runs only after this step has passed. Steps without one start together. */
    after?: string
    /** Starts only after these steps have finished, passed or not: they share files on disk. */
    waitFor?: string[]
    env?: Record<string, string>
}

export type VerifyOptions = {
    root: string
    steps: Step[]
    /** Where the branch left the default branch; undefined when there is no default branch. */
    base: string | undefined
    baseName?: string
    /** What the checks cannot see, printed after every run that passes, docs-only ones included. */
    blindSpots?: string[]
    out?: (line: string) => void
}

export type VerifyResult = { ok: boolean; recorded: boolean }

/** Where a run's output goes: the checkout it runs in, its log folder, and the printer. */
type RunContext = { root: string; logDir: string; out: (line: string) => void }

const LOG_TAIL_LINES = 30

export function print(line: string): void {
    process.stdout.write(`${line}\n`)
}

export async function runVerify(options: VerifyOptions): Promise<VerifyResult> {
    const { blindSpots = [], out = print } = options
    const result = await check({ ...options, out })
    if (result.ok && blindSpots.length > 0) {
        out('Not covered by these checks:')
        for (const spot of blindSpots) out(`- ${spot}`)
    }
    return result
}

async function check(
    options: VerifyOptions & { out: (line: string) => void },
): Promise<VerifyResult> {
    const { root, steps, base, baseName = 'main', out } = options

    if (base === undefined) {
        out(`No ${baseName} branch found, so checking the whole tree.`)
    } else {
        const changes = changedSince(root, base)
        const kinds = new Set(changes.map(classify))
        if (changes.length > 0 && !kinds.has('code')) {
            // Docs and CI config are still formatted, and CI checks that, so the format step runs.
            const format = steps.find((step) => step.name === 'format')
            if (format && !(await runStep(format, { root, logDir: logDirFor(root), out }))) {
                return { ok: false, recorded: false }
            }
            const checked = format ? 'only their formatting was checked' : 'nothing to check'
            if (kinds.has('unchecked')) {
                const unchecked = changes.filter((path) => classify(path) === 'unchecked')
                out(`No local check reads what changed since ${baseName}: ${unchecked.join(', ')}.`)
                out(`CI is the only check for these; ${checked}. Nothing recorded.`)
            } else {
                out(`Only docs changed since ${baseName}: ${checked}. Nothing recorded.`)
            }
            return { ok: true, recorded: false }
        }
        if (changes.length === 0) out(`No changes since ${baseName}; checking the tree anyway.`)
    }

    // From here the checks run, so a run that does not end in a pass must not leave an earlier
    // pass behind. (A docs-only run returns above: docs are outside the fingerprint, so an
    // earlier pass is still valid.)
    clearVerified(root)
    const before = snapshot(root)

    const passed = await runSteps(steps, { root, logDir: logDirFor(root), out })
    if (!passed) return { ok: false, recorded: false }

    const after = snapshot(root)
    const fingerprint = codeFingerprint(after)
    if (fingerprint !== codeFingerprint(before)) {
        const changed = changedPaths(before, after).filter((path) => classify(path) === 'code')
        out(`Files changed during the run: ${changed.join(', ')}. Nothing recorded; run it again.`)
        return { ok: false, recorded: false }
    }

    const head = git(root, ['rev-parse', 'HEAD'])
    writeVerified(root, {
        fingerprint,
        head: head.ok ? head.stdout.trim() : 'none',
        at: new Date().toISOString(),
    })
    out(`Verified. Recorded fingerprint ${fingerprint.slice(0, 12)}.`)
    return { ok: true, recorded: true }
}

function logDirFor(root: string): string {
    const dir = join(stateDir(root), 'logs')
    mkdirSync(dir, { recursive: true })
    return dir
}

async function runSteps(steps: Step[], context: RunContext): Promise<boolean> {
    const results = new Map<string, Promise<boolean>>()
    // The steps being started right now, so a loop of after/waitFor fails with its names instead
    // of exhausting the stack.
    const starting: string[] = []
    function start(step: Step): Promise<boolean> {
        const existing = results.get(step.name)
        if (existing) return existing
        if (starting.includes(step.name)) {
            const loop = [...starting.slice(starting.indexOf(step.name)), step.name].join(' → ')
            throw new Error(`step ${step.name} runs after itself: ${loop}`)
        }
        starting.push(step.name)
        function find(name: string): Step {
            const found = steps.find((s) => s.name === name)
            if (!found) throw new Error(`step ${step.name} runs after unknown ${name}`)
            return found
        }
        const dependency = step.after ? find(step.after) : undefined
        const waits = (step.waitFor ?? []).map(find)
        const result = Promise.all([
            dependency ? start(dependency) : Promise.resolve(true),
            ...waits.map(start),
        ]).then(([ready]) => {
            if (ready) return runStep(step, context)
            context.out(`- ${step.name} skipped: ${step.after} failed`)
            return false
        })
        results.set(step.name, result)
        starting.pop()
        return result
    }
    const outcomes = await Promise.all(steps.map(start))
    return outcomes.every(Boolean)
}

function runStep(step: Step, { root, logDir, out }: RunContext): Promise<boolean> {
    const logPath = join(logDir, `${safeName(step.name)}.log`)
    const log = createWriteStream(logPath)
    const startedAt = Date.now()
    return new Promise((resolve) => {
        const child = spawn(step.command, step.args, {
            cwd: root,
            env: { ...cleanGitEnv(), ...step.env },
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        child.stdout.pipe(log, { end: false })
        child.stderr.pipe(log, { end: false })
        let finished = false
        function finish(code: number | null, error?: Error): void {
            if (finished) return
            finished = true
            if (error) log.write(`\n${error.message}\n`)
            log.end(() => {
                const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
                if (code === 0) {
                    out(`✓ ${step.name} (${seconds}s)`)
                    resolve(true)
                    return
                }
                const lines = readFileSync(logPath, 'utf8').trimEnd().split('\n')
                out(`✗ ${step.name} (${error ? error.message : `exit ${code}`}, ${seconds}s)`)
                for (const line of lines.slice(-LOG_TAIL_LINES)) out(`    ${line}`)
                out(`    full log: ${relative(process.cwd(), logPath) || logPath}`)
                resolve(false)
            })
        }
        child.on('error', (error) => finish(null, error))
        child.on('close', (code) => finish(code))
    })
}
