import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import releaseConfig from '../release.config.js'

describe('release workflow local analysis history', () => {
    it('provides real main and next refs to semantic-release when checkout only has local next', async () => {
        const directory = realpathSync(mkdtempSync(resolve(tmpdir(), 'sdk-release-history-')))
        const env = { ...process.env, GIT_ALLOW_PROTOCOL: 'file', GITHUB_REF_NAME: 'next' }
        const git = (...args: string[]) =>
            execFileSync('git', args, {
                cwd: directory,
                env,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            }).trim()
        try {
            git('init', '-b', 'next')
            git('config', 'user.name', 'Fixture')
            git('config', 'user.email', 'fixture@example.com')
            git('config', 'commit.gpgsign', 'false')
            git('commit', '--allow-empty', '-m', 'chore: fixture')
            git('update-ref', 'refs/remotes/origin/main', 'HEAD')
            mkdirSync(resolve(directory, '.tmp'))
            const workflow = readFileSync(
                new URL('../.github/workflows/release.yml', import.meta.url),
                'utf8',
            )
            const section = workflow
                .split('name: Calculate version without publication or remote push probes')[1]
                .split('node_modules/.bin/semantic-release')[0]
            const prelude = section.split('run: |\n')[1].replace(/^ {18}/gm, '')
            execFileSync('sh', ['-eu', '-c', prelude], { cwd: directory, env, stdio: 'pipe' })
            const { default: getBranches } =
                await import('../node_modules/semantic-release/lib/branches/index.js')
            const branches = await getBranches(
                `file://${directory}/.tmp/release-history.git`,
                'next',
                {
                    cwd: directory,
                    env,
                    options: {
                        branches: releaseConfig.branches,
                        tagFormat: releaseConfig.tagFormat,
                    },
                    logger: { log() {} },
                },
            )
            expect(
                branches.map((branch: { name: string; type: string }) => ({
                    name: branch.name,
                    type: branch.type,
                })),
            ).toEqual([
                { name: 'main', type: 'release' },
                { name: 'next', type: 'prerelease' },
            ])
        } finally {
            rmSync(directory, { recursive: true, force: true })
        }
    })
})
