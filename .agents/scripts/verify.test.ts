import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { writeJson, writeVerified } from './lib/state.ts'
import { createTempRepo, type TempRepo } from './lib/test-repo.ts'

// verify.mjs and verify.ts as `npm run verify` runs them: a separate node process, in a throwaway
// repo holding a copy of .agents/scripts. Only the preflight path runs here; lib/verify.test.ts
// covers the steps.
let repo: TempRepo

beforeEach(() => {
    repo = createTempRepo()
    repo.copyFromCheckout(
        '.agents/scripts/verify.mjs',
        '.agents/scripts/verify.ts',
        '.agents/scripts/lib',
    )
    repo.write('.gitignore', '.tmp/\n')
    repo.git(['add', '.'])
    repo.git(['commit', '--quiet', '-m', 'initial'])
})

afterEach(() => repo.cleanup())

function verify(entry = 'verify.ts') {
    return repo.run(process.execPath, [join(repo.dir, '.agents/scripts', entry)])
}

it('stops before the checks, says why, exits 1 and forgets an earlier pass', () => {
    writeJson(join(repo.dir, 'package.json'), { engines: { node: '>=999' } })
    writeVerified(repo.dir, { fingerprint: 'earlier', head: 'x', at: 'then' })

    const result = verify()

    expect(result.status).toBe(1)
    expect(result.stdout).toContain(
        `✗ Node ${process.versions.node} is older than the >=999 this repository needs.`,
    )
    expect(result.stdout).toContain('✗ node_modules is missing. Run `npm ci`.')
    expect(existsSync(join(repo.dir, '.tmp/agents/verified.json'))).toBe(false)
})

it('checks the Node version before loading verify.ts, which an older Node cannot parse', () => {
    writeJson(join(repo.dir, 'package.json'), { engines: { node: '>=999' } })
    writeVerified(repo.dir, { fingerprint: 'earlier', head: 'x', at: 'then' })

    const result = verify('verify.mjs')

    expect(result.status).toBe(1)
    expect(result.stdout).toBe(
        `✗ Node ${process.versions.node} is older than the >=999 this repository needs. ` +
            'Switch versions (see .nvmrc) and run again.\n',
    )
    expect(existsSync(join(repo.dir, '.tmp/agents/verified.json'))).toBe(false)
})

it('hands over to verify.ts on a Node the engines allow', () => {
    writeJson(join(repo.dir, 'package.json'), { engines: { node: '>=1' } })
    const result = verify('verify.mjs')
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('✗ node_modules is missing. Run `npm ci`.\n')
})
