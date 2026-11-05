import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeJson } from './state.ts'
import { CI_EQUIVALENTS, preflight, removeLocalOnlyEnv, VERIFY_STEPS } from './steps.ts'
import { REPO_ROOT } from './test-repo.ts'
import { CHECKED_WORKFLOWS } from './tree.ts'

const WORKFLOWS_DIR = join(REPO_ROOT, '.github/workflows')

function readWorkflow(name: string): string {
    return readFileSync(join(WORKFLOWS_DIR, name), 'utf8')
}

// Lines of a `run: |` script that only steer the shell or print. Every other line runs something.
const SHELL_GUARD =
    /^(if|then|else|elif|fi|for|while|do|done|case|esac|echo|printf|exit|true|false|#|:|\{|\})(\s|;|$)/

/** The `working-directory:` of the step a line belongs to, if it sets one. */
function workingDirectory(lines: string[], index: number): string | undefined {
    let start = index
    while (start > 0 && !/^\s*- /.test(lines[start] ?? '')) start--
    const indent = (lines[start] ?? '').search(/\S/)
    for (const line of lines.slice(start)) {
        if (line !== lines[start] && line.trim() && line.search(/\S/) <= indent) break
        const match = line.match(/^\s*(?:- )?working-directory: (.+)$/)
        if (match) return (match[1] ?? '').trim().replace(/^\.\//, '')
    }
    return undefined
}

/**
 * The commands a workflow runs: each one-line `run:`, and every line of a `run: |` script that is
 * not a shell guard, so a check added to a script cannot hide behind the command already there.
 * A command run in another folder is written `(folder) command`.
 */
function workflowCommands(text: string): string[] {
    const commands: string[] = []
    const lines = text.split('\n')
    lines.forEach((line, index) => {
        const match = line.match(/^(\s+)(?:- )?run: (.+)$/)
        if (!match) return
        const [, indent = '', value = ''] = match
        const folder = workingDirectory(lines, index)
        const prefix = folder ? `(${folder}) ` : ''
        if (!value.startsWith('|')) {
            commands.push(`${prefix}${value.trim()}`)
            return
        }
        for (const next of lines.slice(index + 1)) {
            if (next.trim() && next.search(/\S/) <= indent.length) break
            const command = next.trim()
            if (command && !SHELL_GUARD.test(command)) commands.push(`${prefix}${command}`)
        }
    })
    return commands
}

/** The `on:` trigger, inline (`on: [push, pull_request]`) or as an indented block. */
function triggers(text: string): string {
    const match = text.match(/^["']?on["']?:(.*)\n((?:(?:[ \t].*)?\n)*)/m)
    return match ? `${match[1]}\n${match[2]}` : ''
}

function runsOnPullRequests(text: string): boolean {
    return /\bpull_request(_target)?\b/.test(triggers(text))
}

describe('reading workflows', () => {
    it.each([
        ['on:\n    pull_request:\n', true],
        ['on:\n    pull_request_target:\n        types: [opened]\n', true],
        ['on: [push, pull_request]\n', true],
        ['on: { pull_request: {} }\n', true],
        ['"on": pull_request\n', true],
        ['on:\n    issues:\n        types: [opened]\n', false],
        ["on:\n    push:\njobs:\n    a:\n        if: github.event_name == 'pull_request'\n", false],
    ])('%j runs on pull requests: %s', (text, expected) => {
        expect(runsOnPullRequests(text)).toBe(expected)
    })

    it('takes every command of a script, whatever runs it, and skips its shell guards', () => {
        const text = [
            'steps:',
            '    - run: |',
            '          if ! gh skill --help >/dev/null 2>&1; then',
            '              echo "skipping"',
            '              exit 0',
            '          fi',
            '          ./scripts/extra-check.sh',
            '          pnpm lint',
            '          gh skill publish --dry-run',
            '    - run: npm test',
            '',
        ].join('\n')
        expect(workflowCommands(text)).toEqual([
            './scripts/extra-check.sh',
            'pnpm lint',
            'gh skill publish --dry-run',
            'npm test',
        ])
    })

    it('names the folder a step runs in, before or after its command', () => {
        const text = [
            'steps:',
            '    - name: Install',
            '      working-directory: ./website',
            '      run: npm ci',
            '    - name: Build',
            '      run: npm run build',
            '      working-directory: website',
            '    - run: npm test',
            '',
        ].join('\n')
        expect(workflowCommands(text)).toEqual([
            '(website) npm ci',
            '(website) npm run build',
            'npm test',
        ])
    })
})

type Scripts = Record<string, string>

function normalize(command: string): string {
    return command.trim().replace(/^npx /, '')
}

/**
 * The commands behind a command, with npm scripts and `npm-run-all` lists expanded, so a step
 * that runs `npm run build` matches a CI script that lists `build` among others.
 */
function expand(command: string, scripts: Scripts): string[] {
    const normalized = normalize(command)
    const [, run, test] = normalized.match(/^npm (?:run (?:--silent )?(\S+)|(test))$/) ?? []
    const script = run ?? test
    if (script) {
        const body = scripts[script]
        if (body === undefined) return [`<missing npm script ${script}>`]
        return body.split('&&').flatMap((part) => expand(part, scripts))
    }
    const all = normalized.match(/^npm-run-all (.+)$/)?.[1]
    if (all) return all.split(/\s+/).flatMap((name) => expand(`npm run ${name}`, scripts))
    return [normalized]
}

describe('verify covers CI', () => {
    const scripts = (
        JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as { scripts: Scripts }
    ).scripts

    it('reads every pull-request workflow that runs a command', () => {
        const running = readdirSync(WORKFLOWS_DIR)
            .filter((name) => /\.ya?ml$/.test(name))
            .filter((name) => {
                const text = readWorkflow(name)
                return runsOnPullRequests(text) && workflowCommands(text).length > 0
            })
            .map((name) => `.github/workflows/${name}`)
        expect(running.toSorted()).toEqual(CHECKED_WORKFLOWS.toSorted())
    })

    it('has an equivalent for every command in those workflows, and only those', () => {
        const commands = new Set(
            CHECKED_WORKFLOWS.flatMap((path) => workflowCommands(readWorkflow(basename(path)))),
        )
        expect(commands.size).toBeGreaterThan(3)
        expect([...commands].toSorted()).toEqual(
            CI_EQUIVALENTS.map((entry) => entry.run).toSorted(),
        )
    })

    it('says why a command has no verify step', () => {
        for (const entry of CI_EQUIVALENTS) {
            if (entry.steps.length === 0) expect(entry.why, entry.run).toBeTruthy()
        }
    })

    // As sets: verify runs its steps in parallel, so the order in a script says nothing about it.
    it('runs the same commands as the package.json scripts CI calls', () => {
        function stepCommands(name: string): string[] {
            const step = VERIFY_STEPS.find((candidate) => candidate.name === name)
            const command = [basename(step?.command ?? ''), ...(step?.args ?? [])].join(' ')
            return expand(command, scripts)
        }
        const scripted = CI_EQUIVALENTS.filter((entry) => entry.steps.length > 0)
        expect(scripted.length).toBeGreaterThan(0)
        for (const entry of scripted) {
            expect(entry.run, entry.run).toMatch(/^npm (run \S+|test)$/)
            const ci = new Set(expand(entry.run, scripts))
            const verify = new Set(entry.steps.flatMap(stepCommands))
            expect({ run: entry.run, commands: [...verify].toSorted() }).toEqual({
                run: entry.run,
                commands: [...ci].toSorted(),
            })
        }
    })

    it('names only steps that exist', () => {
        const names = VERIFY_STEPS.map((step) => step.name)
        for (const entry of CI_EQUIVALENTS) {
            for (const step of entry.steps) expect(names).toContain(step)
        }
        for (const step of VERIFY_STEPS) {
            if (step.after) expect(names).toContain(step.after)
            for (const other of step.waitFor ?? []) expect(names).toContain(other)
        }
    })

    it('runs the build and the tests with CI=true, as GitHub Actions does', () => {
        for (const name of ['build', 'tests']) {
            const step = VERIFY_STEPS.find((candidate) => candidate.name === name)
            expect(step?.env, name).toEqual({ CI: 'true' })
        }
    })

    it('removes the variables CI never sets, and says which it removed', () => {
        const env: NodeJS.ProcessEnv = { TODOIST_API_TOKEN: 'real-token', PATH: '/bin' }
        expect(removeLocalOnlyEnv(env)).toEqual(['TODOIST_API_TOKEN'])
        expect(env).toEqual({ PATH: '/bin' })
    })

    it('starts the tests once the build has written dist/, and packs it without rebuilding', () => {
        const tests = VERIFY_STEPS.find((candidate) => candidate.name === 'tests')
        const attw = VERIFY_STEPS.find((candidate) => candidate.name === 'attw')
        expect(tests?.waitFor).toContain('build')
        expect(attw?.after).toBe('build')
        expect(attw?.env).toEqual({ npm_config_ignore_scripts: 'true' })
    })
})

describe('preflight', () => {
    let root: string

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'agent-preflight-'))
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
        })
        writeJson(join(root, 'package-lock.json'), {
            packages: {
                '': { dependencies: { zod: '1.0.0' }, devDependencies: { vitest: '2.0.0' } },
                'node_modules/zod': { version: '1.0.0' },
                'node_modules/vitest': { version: '2.0.0' },
            },
        })
        writeInstalled({
            'node_modules/zod': { version: '1.0.0' },
            'node_modules/vitest': { version: '2.0.0' },
        })
    })

    // What npm records about the tree it installed.
    function writeInstalled(packages: Record<string, { version: string }>): void {
        writeJson(join(root, 'node_modules/.package-lock.json'), { packages })
    }

    afterEach(() => rmSync(root, { recursive: true, force: true }))

    it('passes a current install on a supported Node', () => {
        expect(preflight(root, '24.0.0')).toEqual([])
    })

    it('rejects a Node older than package.json engines', () => {
        const [problem] = preflight(root, '22.22.2')
        expect(problem).toContain('Node 22.22.2 is older than the >=24')
    })

    it('names a dependency whose installed version differs from the lockfile', () => {
        writeInstalled({
            'node_modules/zod': { version: '0.9.0' },
            'node_modules/vitest': { version: '2.0.0' },
        })
        expect(preflight(root, '24.0.0')).toEqual([
            'node_modules does not match package-lock.json: zod 0.9.0 (lockfile: 1.0.0). Run `npm ci`.',
        ])
    })

    it('names a dependency that is not installed', () => {
        writeInstalled({ 'node_modules/zod': { version: '1.0.0' } })
        expect(preflight(root, '24.0.0')[0]).toContain('vitest missing (lockfile: 2.0.0)')
    })

    it('names a transitive dependency that changed while every direct one kept its version', () => {
        const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as {
            packages: Record<string, unknown>
        }
        lock.packages['node_modules/undici'] = { version: '7.1.0' }
        writeJson(join(root, 'package-lock.json'), lock)
        writeInstalled({
            'node_modules/zod': { version: '1.0.0' },
            'node_modules/vitest': { version: '2.0.0' },
            'node_modules/undici': { version: '7.0.0' },
        })
        expect(preflight(root, '24.0.0')).toEqual([
            'node_modules does not match package-lock.json: undici 7.0.0 (lockfile: 7.1.0). Run `npm ci`.',
        ])
    })

    it('accepts optional packages for other platforms that were never installed', () => {
        const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as {
            packages: Record<string, unknown>
        }
        lock.packages['node_modules/lefthook-darwin-arm64'] = { version: '1.0.0', optional: true }
        lock.packages['node_modules/@oxfmt/win32-x64'] = { version: '1.0.0', devOptional: true }
        writeJson(join(root, 'package-lock.json'), lock)
        expect(preflight(root, '24.0.0')).toEqual([])
    })

    it('says when node_modules has no record of what npm installed', () => {
        rmSync(join(root, 'node_modules/.package-lock.json'))
        expect(preflight(root, '24.0.0')).toEqual([
            'node_modules has no record of what npm installed. Run `npm ci`.',
        ])
    })

    it('names a dependency package.json and the lockfile disagree on', () => {
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.1.0', added: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
        })
        expect(preflight(root, '24.0.0')).toEqual([
            'package.json and package-lock.json disagree: zod (package.json: 1.1.0, lockfile: 1.0.0), added (package.json: 1.0.0, lockfile: none). Run `npm install`.',
        ])
    })

    it('names an optional dependency package.json and the lockfile disagree on', () => {
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
            optionalDependencies: { keyring: '2.0.0' },
        })
        expect(preflight(root, '24.0.0')).toEqual([
            'package.json and package-lock.json disagree: keyring (package.json: 2.0.0, lockfile: none). Run `npm install`.',
        ])
    })

    it('says when the lockfile is missing', () => {
        rmSync(join(root, 'package-lock.json'))
        expect(preflight(root, '24.0.0')).toEqual([
            'package-lock.json is missing or unreadable. Run `npm install`.',
        ])
    })

    it('says when node_modules is missing', () => {
        rmSync(join(root, 'node_modules'), { recursive: true })
        expect(preflight(root, '24.0.0')).toEqual(['node_modules is missing. Run `npm ci`.'])
    })
})
