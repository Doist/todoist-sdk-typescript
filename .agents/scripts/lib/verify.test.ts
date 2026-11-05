import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readVerified, stateDir, writeVerified } from './state.ts'
import { createTempRepo, type TempRepo } from './test-repo.ts'
import { codeFingerprint, snapshot } from './tree.ts'
import { runVerify, type Step } from './verify.ts'

// runVerify with stand-in steps (shell one-liners) in a throwaway repo. The real steps are
// covered by steps.test.ts and by running `npm run verify` itself.
let repo: TempRepo
let base: string
let lines: string[]

function pass(name: string, extra: Partial<Step> = {}): Step {
    return { name, command: 'sh', args: ['-c', `echo ${name} ok`], ...extra }
}

function fail(name: string): Step {
    return {
        name,
        command: 'sh',
        args: ['-c', 'i=1; while [ $i -le 40 ]; do echo "line $i"; i=$((i + 1)); done; exit 3'],
    }
}

function verify(steps: Step[], options: { base?: string | null } = {}) {
    return runVerify({
        root: repo.dir,
        steps,
        base: options.base === null ? undefined : (options.base ?? base),
        out: (line) => lines.push(line),
    })
}

beforeEach(() => {
    repo = createTempRepo()
    repo.write('.gitignore', '.tmp/\n')
    repo.write('src/a.ts', 'export const a = 1\n')
    repo.write('README.md', 'readme\n')
    repo.git(['add', '.'])
    repo.git(['commit', '--quiet', '-m', 'initial'])
    base = repo.git(['rev-parse', 'HEAD']).stdout.trim()
    repo.git(['switch', '--quiet', '-c', 'feature'])
    lines = []
})

afterEach(() => repo.cleanup())

describe('a code change', () => {
    beforeEach(() => repo.write('src/a.ts', 'export const a = 2\n'))

    it('records the fingerprint of the exact tree it verified', async () => {
        const result = await verify([pass('lint'), pass('tests')])
        expect(result).toEqual({ ok: true, recorded: true })
        expect(readVerified(repo.dir)?.fingerprint).toBe(codeFingerprint(snapshot(repo.dir)))
        expect(lines.some((line) => /^✓ lint \(\d+\.\ds\)$/.test(line))).toBe(true)
    })

    it('records nothing when a step fails, and forgets an earlier pass', async () => {
        writeVerified(repo.dir, { fingerprint: 'earlier', head: 'x', at: 'then' })
        const result = await verify([pass('lint'), fail('tests')])
        expect(result).toEqual({ ok: false, recorded: false })
        expect(readVerified(repo.dir)).toBeUndefined()
    })

    it('prints one line per step, and on failure the log tail and its path', async () => {
        await verify([pass('lint'), fail('tests')])
        const failure = lines.findIndex((line) => line.startsWith('✗ tests (exit 3'))
        expect(failure).toBeGreaterThan(-1)
        expect(lines.slice(failure + 1, failure + 31)).toEqual(
            Array.from({ length: 30 }, (_, i) => `    line ${i + 11}`),
        )
        const logPath = join(stateDir(repo.dir), 'logs/tests.log')
        expect(lines[failure + 31]).toContain('full log: ')
        expect(lines[failure + 31]).toContain('tests.log')
        expect(readFileSync(logPath, 'utf8')).toContain('line 1\n')
    })

    it('prints the tail of a log too large to read whole', async () => {
        const noisy: Step = {
            name: 'tests',
            command: 'sh',
            args: [
                '-c',
                'i=1; while [ $i -le 5000 ]; do echo "noise $i padding padding padding"; i=$((i + 1)); done; echo last; exit 1',
            ],
        }
        await verify([noisy])
        const failure = lines.findIndex((line) => line.startsWith('✗ tests'))
        expect(lines.slice(failure + 1, failure + 31).at(-1)).toBe('    last')
        expect(lines[failure + 1]).toBe('    noise 4972 padding padding padding')
    })

    it('runs a dependent step only after its dependency passed', async () => {
        await verify([fail('build'), pass('schemas', { after: 'build' })])
        expect(lines).toContain('- schemas skipped: build failed')
        expect(readVerified(repo.dir)).toBeUndefined()
    })

    it('starts a step that waits for another only once that one has finished', async () => {
        // The writer's short wait gives a reader that started too early time to miss the file.
        const writer = pass('build', { args: ['-c', 'sleep 0.2; echo built > .tmp/built.txt'] })
        const reader = pass('tests', { args: ['-c', 'cat .tmp/built.txt'], waitFor: ['build'] })
        expect(await verify([reader, writer])).toEqual({ ok: true, recorded: true })
        expect(lines.findIndex((line) => line.startsWith('✓ build'))).toBeLessThan(
            lines.findIndex((line) => line.startsWith('✓ tests')),
        )
    })

    it('still runs a step when the one it waits for fails', async () => {
        await verify([fail('build'), pass('tests', { waitFor: ['build'] })])
        expect(lines.some((line) => line.startsWith('✓ tests'))).toBe(true)
        expect(readVerified(repo.dir)).toBeUndefined()
    })

    it('names the steps when after and waitFor make a loop', async () => {
        const looping = [pass('lint', { after: 'build' }), pass('build', { waitFor: ['lint'] })]
        await expect(verify(looping)).rejects.toThrow(
            'step lint runs after itself: lint → build → lint',
        )
    })

    it('fails when a command cannot start', async () => {
        const result = await verify([{ name: 'lint', command: 'no-such-command-xyz', args: [] }])
        expect(result.ok).toBe(false)
        // ENOENT, or EACCES when PATH holds a folder the user cannot search (as on WSL).
        expect(lines[0]).toMatch(/^✗ lint \(spawn no-such-command-xyz (ENOENT|EACCES)/)
    })

    it('records nothing when files change during the run', async () => {
        const editor = pass('tests', { args: ['-c', 'echo edited > src/b.ts'] })
        const result = await verify([pass('lint'), editor])
        expect(result).toEqual({ ok: false, recorded: false })
        expect(lines.at(-1)).toContain('Files changed during the run: src/b.ts')
        expect(readVerified(repo.dir)).toBeUndefined()
    })

    it('keeps an earlier pass when only files CI alone reads changed', async () => {
        repo.write('src/a.ts', 'export const a = 2\n')
        await verify([pass('lint')])
        const earlier = readVerified(repo.dir)
        repo.git(['add', '.'])
        repo.git(['commit', '--quiet', '-m', 'code'])
        repo.write('.github/renovate.json', '{}\n')
        lines = []
        await runVerify({
            root: repo.dir,
            steps: [pass('lint')],
            base: repo.git(['rev-parse', 'HEAD']).stdout.trim(),
            out: (line) => lines.push(line),
        })
        expect(readVerified(repo.dir)).toEqual(earlier)
        expect(readVerified(repo.dir)?.fingerprint).toBe(codeFingerprint(snapshot(repo.dir)))
    })

    it('names a doc added during the run, which changes the fingerprint', async () => {
        const writer = pass('tests', { args: ['-c', 'echo new > docs-added.md'] })
        expect(await verify([pass('lint'), writer])).toEqual({ ok: false, recorded: false })
        expect(lines.at(-1)).toContain('Files changed during the run: docs-added.md')
    })

    it('forgets an earlier pass when a doc is added, and keeps it when one is edited', async () => {
        await verify([pass('lint')])
        const earlier = readVerified(repo.dir)
        repo.git(['add', '.'])
        repo.git(['commit', '--quiet', '-m', 'code'])
        const head = repo.git(['rev-parse', 'HEAD']).stdout.trim()
        repo.write('README.md', 'edited\n')
        await runVerify({ root: repo.dir, steps: [pass('lint')], base: head, out: () => {} })
        expect(readVerified(repo.dir)).toEqual(earlier)
        repo.write('docs/new.md', 'new\n')
        await runVerify({ root: repo.dir, steps: [pass('lint')], base: head, out: () => {} })
        expect(readVerified(repo.dir)).toBeUndefined()
    })

    it('keeps the pass when only a file CI alone reads changes during the run', async () => {
        const editor = pass('tests', {
            args: ['-c', 'mkdir -p .github && echo x > .github/renovate.json'],
        })
        const result = await verify([pass('lint'), editor])
        expect(result).toEqual({ ok: true, recorded: true })
        expect(readVerified(repo.dir)?.fingerprint).toBe(codeFingerprint(snapshot(repo.dir)))
    })

    it('keeps its logs and state out of the fingerprint', async () => {
        await verify([pass('lint')])
        expect(existsSync(join(stateDir(repo.dir), 'logs/lint.log'))).toBe(true)
        expect(readVerified(repo.dir)?.fingerprint).toBe(codeFingerprint(snapshot(repo.dir)))
    })
})

describe('what it cannot see', () => {
    const blindSpots = ['the real API']

    function run(steps: Step[]) {
        return runVerify({
            root: repo.dir,
            steps,
            base,
            blindSpots,
            out: (line) => lines.push(line),
        })
    }

    it('names it after a pass', async () => {
        repo.write('src/a.ts', 'export const a = 2\n')
        expect(await run([pass('lint')])).toEqual({ ok: true, recorded: true })
        expect(lines.slice(-2)).toEqual(['Not covered by these checks:', '- the real API'])
    })

    it('names it after a docs-only run too, which records nothing', async () => {
        repo.write('README.md', 'changed\n')
        expect(await run([pass('format')])).toEqual({ ok: true, recorded: false })
        expect(lines.slice(-2)).toEqual(['Not covered by these checks:', '- the real API'])
    })

    it('says nothing of it after a failure', async () => {
        repo.write('src/a.ts', 'export const a = 2\n')
        expect(await run([fail('lint')])).toEqual({ ok: false, recorded: false })
        expect(lines).not.toContain('Not covered by these checks:')
    })
})

describe('what counts as a change', () => {
    it('sees an untracked file as a change', async () => {
        repo.write('src/new.ts', 'new\n')
        expect(await verify([pass('lint')])).toEqual({ ok: true, recorded: true })
        expect(lines[0]).toMatch(/^✓ lint/)
    })

    it('sees committed changes on the branch', async () => {
        repo.write('src/a.ts', 'committed\n')
        repo.git(['commit', '--quiet', '-am', 'change'])
        expect(await verify([pass('lint')])).toEqual({ ok: true, recorded: true })
        expect(lines[0]).toMatch(/^✓ lint/)
    })

    it('keeps an earlier pass when only docs changed', async () => {
        const fingerprint = codeFingerprint(snapshot(repo.dir))
        writeVerified(repo.dir, { fingerprint, head: 'x', at: 'then' })
        repo.write('README.md', 'changed\n')
        await verify([pass('lint')])
        expect(readVerified(repo.dir)?.fingerprint).toBe(fingerprint)
    })

    it('runs the checks when any workflow changes, since a local test reads them all', async () => {
        repo.write('.github/workflows/release.yml', 'on: push\n')
        expect(await verify([pass('lint')])).toEqual({ ok: true, recorded: true })
    })

    it('checks only the formatting of a docs-only change', async () => {
        repo.write('README.md', 'changed\n')
        const result = await verify([fail('lint'), pass('format')])
        expect(result).toEqual({ ok: true, recorded: false })
        expect(lines.at(-1)).toBe(
            'Only docs changed since main: only their formatting was checked. Nothing recorded.',
        )
    })

    it('fails a docs-only change whose formatting fails', async () => {
        repo.write('README.md', 'changed\n')
        expect(await verify([pass('lint'), fail('format')])).toEqual({ ok: false, recorded: false })
        expect(lines[0]).toMatch(/^✗ format/)
    })

    it('checks the formatting of a change only CI reads', async () => {
        repo.write('.github/renovate.json', '{}\n')
        expect(await verify([pass('lint'), fail('format')])).toEqual({ ok: false, recorded: false })
    })

    it('runs the checks when a doc is deleted, since the agent docs may name it', async () => {
        rmSync(join(repo.dir, 'README.md'))
        expect(await verify([pass('lint')])).toEqual({ ok: true, recorded: true })
    })

    it('runs the checks when the agent instructions change, since a test reads them', async () => {
        repo.write('AGENTS.md', 'rules\n')
        expect(await verify([pass('lint')])).toEqual({ ok: true, recorded: true })
    })

    it('has nothing to check for a docs-only change', async () => {
        repo.write('README.md', 'changed\n')
        const result = await verify([fail('lint')])
        expect(result).toEqual({ ok: true, recorded: false })
        expect(lines).toEqual(['Only docs changed since main: nothing to check. Nothing recorded.'])
    })

    it('records nothing when only files CI alone reads changed', async () => {
        repo.write('.github/renovate.json', '{}\n')
        repo.write('README.md', 'changed\n')
        const result = await verify([pass('lint')])
        expect(result).toEqual({ ok: true, recorded: false })
        expect(lines[0]).toContain('.github/renovate.json')
        expect(readVerified(repo.dir)).toBeUndefined()
    })

    it('checks everything when a workflow changes along with code', async () => {
        repo.write('.github/workflows/release.yml', 'on: push\n')
        repo.write('src/a.ts', 'changed\n')
        expect(await verify([pass('lint')])).toEqual({ ok: true, recorded: true })
    })

    it('checks the whole tree, and says so, without a default branch', async () => {
        repo.write('README.md', 'changed\n')
        const result = await verify([pass('lint')], { base: null })
        expect(result).toEqual({ ok: true, recorded: true })
        expect(lines[0]).toBe('No main branch found, so checking the whole tree.')
    })

    it('checks the tree when nothing changed', async () => {
        const result = await verify([pass('lint')])
        expect(result).toEqual({ ok: true, recorded: true })
        expect(lines[0]).toBe('No changes since main; checking the tree anyway.')
    })
})
