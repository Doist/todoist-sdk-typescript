import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJson } from './state.ts'
import { listSome } from './text.ts'
import type { Step } from './verify.ts'

function bin(tool: string): string {
    return `node_modules/.bin/${tool}`
}

// GitHub Actions sets CI=true for every job, and it makes vitest fail on `.only`, so the build and
// the tests run with it to match CI.
const CI_ENV = { CI: 'true' }

/** Every check the pull-request workflows in CHECKED_WORKFLOWS run, with one shared build. */
export const VERIFY_STEPS: Step[] = [
    { name: 'lint', command: bin('oxlint'), args: ['src', '.agents/scripts'] },
    { name: 'format', command: bin('oxfmt'), args: ['--check'] },
    { name: 'types', command: bin('tsc'), args: ['--noEmit', '-p', 'tsconfig.esm.json'] },
    { name: 'types:tools', command: bin('tsc'), args: ['--noEmit', '-p', '.agents/scripts'] },
    { name: 'build', command: 'npm', args: ['run', '--silent', 'build'], env: CI_ENV },
    // The build starts by deleting dist/, and the package-contents test packs the checkout, so the
    // tests start once the build has finished.
    { name: 'tests', command: bin('vitest'), args: ['run'], env: CI_ENV, waitFor: ['build'] },
    // attw packs the checkout, and `npm pack` runs `prepare`, which would build dist/ again while
    // the tests read it. Without scripts it packs the dist/ the build step just wrote, which is
    // what `prepare` rebuilds in CI.
    {
        name: 'attw',
        command: bin('attw'),
        args: ['--pack', '--ignore-rules', 'cjs-resolves-to-esm'],
        after: 'build',
        env: { npm_config_ignore_scripts: 'true' },
    },
]

/**
 * How each `run:` in the checked workflows maps to verify steps. A command run in another folder
 * (`working-directory:`) is written `(folder) command`. For an npm script, the steps must run the
 * script's commands; steps.test.ts compares them with package.json and the workflows, so CI and
 * verify cannot drift apart silently. A step list left empty says why.
 */
export const CI_EQUIVALENTS: { run: string; steps: string[]; why?: string }[] = [
    { run: 'npm ci', steps: [], why: 'the preflight checks node_modules matches the lockfile' },
    {
        run: 'npm run integrity-checks',
        steps: ['lint', 'format', 'types', 'types:tools', 'tests', 'build', 'attw'],
    },
    {
        run: '(website) npm ci',
        steps: [],
        why: 'it installs the docs site, which verify does not build (see BLIND_SPOTS)',
    },
    {
        run: '(website) npm run build',
        steps: [],
        why: 'the docs site build takes over a minute, so verify names it in BLIND_SPOTS instead',
    },
]

/**
 * Variables CI never sets, removed so the checks see what CI sees. `.env.example` names these for
 * `npm run api:request`; with them removed, a real token never reaches the tests.
 */
export const LOCAL_ONLY_ENV = ['TODOIST_API_TOKEN', 'TODOIST_API_BASE_URL']

/** Removes LOCAL_ONLY_ENV from `env`, and returns the names that were set. */
export function removeLocalOnlyEnv(env: NodeJS.ProcessEnv): string[] {
    const removed = LOCAL_ONLY_ENV.filter((name) => env[name] !== undefined)
    for (const name of removed) delete env[name]
    return removed
}

type PackageJson = {
    engines?: { node?: string }
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
}
type Lockfile = {
    packages?: Record<
        string,
        {
            version?: string
            optional?: boolean
            devOptional?: boolean
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
            optionalDependencies?: Record<string, string>
        }
    >
}

const MAX_LISTED = 10

/** Problems that would make the checks fail for reasons unrelated to the change. */
export function preflight(root: string, nodeVersion = process.versions.node): string[] {
    const problems: string[] = []
    const pkg = readJson<PackageJson>(join(root, 'package.json'))
    const minimum = pkg?.engines?.node?.match(/^>=\s*(\d+)/)?.[1]
    const major = Number(nodeVersion.split('.')[0])
    if (minimum && major < Number(minimum)) {
        problems.push(
            `Node ${nodeVersion} is older than the ${pkg?.engines?.node} this repository needs. ` +
                'Switch versions (see .nvmrc) and run again.',
        )
    }

    if (!existsSync(join(root, 'node_modules'))) {
        problems.push('node_modules is missing. Run `npm ci`.')
        return problems
    }
    const lock = readJson<Lockfile>(join(root, 'package-lock.json'))
    if (!lock?.packages) {
        problems.push('package-lock.json is missing or unreadable. Run `npm install`.')
        return problems
    }
    // npm ci refuses to install when package.json and the lockfile disagree, so CI would fail
    // before any check runs.
    const manifest = lock.packages[''] ?? {}
    const disagree: string[] = []
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies'] as const) {
        const wanted = pkg?.[field] ?? {}
        const locked = manifest[field] ?? {}
        for (const name of new Set([...Object.keys(wanted), ...Object.keys(locked)])) {
            if (wanted[name] !== locked[name]) {
                disagree.push(
                    `${name} (package.json: ${wanted[name] ?? 'none'}, lockfile: ${locked[name] ?? 'none'})`,
                )
            }
        }
    }
    if (disagree.length > 0) {
        problems.push(
            `package.json and package-lock.json disagree: ${disagree.join(', ')}. Run \`npm install\`.`,
        )
        return problems
    }

    // npm records the tree it installed in node_modules/.package-lock.json. Comparing every
    // package with the lockfile catches a transitive dependency that changed while every direct one
    // kept its version. Optional packages for other platforms are never installed.
    const installed = readJson<Lockfile>(join(root, 'node_modules/.package-lock.json'))?.packages
    if (!installed) {
        problems.push('node_modules has no record of what npm installed. Run `npm ci`.')
        return problems
    }
    const stale: string[] = []
    for (const [path, entry] of Object.entries(lock.packages)) {
        if (!path.startsWith('node_modules/')) continue
        const name = path.slice('node_modules/'.length)
        const version = installed[path]?.version
        if (version === undefined) {
            if (!entry.optional && !entry.devOptional) {
                stale.push(`${name} missing (lockfile: ${entry.version})`)
            }
        } else if (version !== entry.version) {
            stale.push(`${name} ${version} (lockfile: ${entry.version})`)
        }
    }
    // A package installed with --no-save, or still installed after the lockfile dropped it, keeps
    // its imports working here, while a clean install in CI cannot resolve them.
    for (const [path, entry] of Object.entries(installed)) {
        if (path.startsWith('node_modules/') && !lock.packages[path]) {
            stale.push(
                `${path.slice('node_modules/'.length)} ${entry.version} (not in the lockfile)`,
            )
        }
    }
    if (stale.length > 0) {
        problems.push(
            `node_modules does not match package-lock.json: ${listSome(stale, MAX_LISTED)}. Run \`npm ci\`.`,
        )
    }
    return problems
}

/** What verification cannot see, printed after every run that passes. */
export const BLIND_SPOTS = [
    'the docs site build in website/ (validate-docs.yml), which TSDoc comments and website/ changes reach: run `npm ci && npm run build` in website/ to check it',
    'calls against the real Todoist API: use `npm run api:request`, with a test account token in .env',
    'the projects that depend on this package, such as todoist-mcp and todoist-cli: try a build in one before changing a public export',
    'the other Node version CI tests on (24 and 26); verify uses only yours',
]
