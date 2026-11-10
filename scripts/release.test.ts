import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import releaseConfig from '../release.config.js'
import { http, HttpResponse, server } from '../src/test-utils/msw-setup'
import {
    preflight,
    findRelease,
    githubPackageState,
    publicationDecision,
    publishEnvironment,
    reconcileRecord,
    run,
    validatePackage,
    validateBaselineRecord,
    validateRun,
} from './release.mjs'

const sourceSha = 'a'.repeat(40)
const manifest = {
    schemaVersion: 1,
    name: '@todoist/todoist-sdk',
    repository: 'todoist/todoist-sdk-typescript',
    workflow: '.github/workflows/release.yml',
    sourceSha,
    workflowSha: sourceSha,
    branch: 'main',
    mainSha: sourceSha,
    version: '17.0.1',
    channel: 'latest',
    integrity: 'sha512-retained-bytes',
    filename: 'todoist-todoist-sdk-17.0.1.tgz',
    runId: '123',
    runAttempt: '1',
}
const build = {
    id: 123,
    repository: { id: 428678731, full_name: 'todoist/todoist-sdk-typescript' },
    head_repository: { id: 428678731, full_name: 'todoist/todoist-sdk-typescript' },
    workflow_id: 252936157,
    path: '.github/workflows/release.yml',
    status: 'completed',
    conclusion: 'success',
    event: 'workflow_dispatch',
    head_branch: 'main',
    head_sha: sourceSha,
    run_attempt: 1,
}
const matching = { versions: { '17.0.1': { dist: { integrity: 'sha512-retained-bytes' } } } }

describe('retained release publication', () => {
    it('rejects filtered absence from an ordinary token, requiring owner authority for bootstrap', async () => {
        vi.stubEnv('GH_PACKAGES_TOKEN', 'fake-github-read')
        server.use(
            http.get('https://npm.pkg.github.com/-/whoami', () =>
                HttpResponse.json({ username: 'fixture' }),
            ),
            http.get('https://api.github.com/orgs/todoist/packages', () => HttpResponse.json([])),
            http.get('https://api.github.com/user/memberships/orgs/todoist', () =>
                HttpResponse.json(
                    {
                        state: 'active',
                        role: 'member',
                        organization: { id: 2565372 },
                    },
                    { headers: { 'x-oauth-scopes': 'read:org, read:packages' } },
                ),
            ),
        )
        try {
            await expect(githubPackageState('private')).rejects.toThrow('ambiguous')
            server.use(
                http.get('https://api.github.com/user/memberships/orgs/todoist', () =>
                    HttpResponse.json(
                        {
                            state: 'active',
                            role: 'admin',
                            organization: { id: 2565372 },
                        },
                        { headers: { 'x-oauth-scopes': 'read:org, read:packages' } },
                    ),
                ),
            )
            expect(await githubPackageState('private')).toBe(false)
            server.use(
                http.get('https://api.github.com/orgs/todoist/packages', () =>
                    HttpResponse.json([
                        {
                            name: 'todoist-sdk',
                            visibility: 'private',
                            repository: { id: 428678731 },
                        },
                    ]),
                ),
            )
            expect(await githubPackageState('private')).toBe(true)
            await expect(githubPackageState('public')).rejects.toThrow('visibility')
        } finally {
            vi.unstubAllEnvs()
        }
    })

    it('finds interrupted drafts through authenticated paginated release listing', async () => {
        const pages: string[] = []
        const draft = { id: 9, tag_name: 'v17.0.1', draft: true, prerelease: false, assets: [] }
        vi.stubEnv('GH_TOKEN', 'fake-github-token')
        server.use(
            http.get(
                'https://api.github.com/repos/todoist/todoist-sdk-typescript/releases',
                ({ request }) => {
                    const page = new URL(request.url).searchParams.get('page')!
                    pages.push(page)
                    expect(request.headers.get('Authorization')).toBe('Bearer fake-github-token')
                    return HttpResponse.json(
                        page === '1'
                            ? Array.from({ length: 100 }, (_, i) => ({ tag_name: `v16.0.${i}` }))
                            : [draft],
                    )
                },
            ),
        )
        try {
            expect(await findRelease('v17.0.1')).toEqual(draft)
            expect(pages).toEqual(['1', '2'])
        } finally {
            vi.unstubAllEnvs()
        }
    })

    it('continues stable and prerelease lineage with actual semantic-release and note-free GitHub tags', async () => {
        const { default: getLastRelease } =
            await import('../node_modules/semantic-release/lib/get-last-release.js')
        const { default: getNextVersion } =
            await import('../node_modules/semantic-release/lib/get-next-version.js')
        const nextConfig = releaseConfig.branches[1] as { name: string; channel: boolean }
        const tags = [
            { version: '17.0.1', gitTag: 'v17.0.1', channels: [null] },
            { version: '17.1.0-next.1', gitTag: 'v17.1.0-next.1', channels: [null] },
        ]
        const branch = { ...nextConfig, type: 'prerelease', prerelease: 'next', tags }
        const lastRelease = getLastRelease({
            branch,
            options: { tagFormat: releaseConfig.tagFormat },
        })
        expect(lastRelease.version).toBe('17.1.0-next.1')
        expect(
            getNextVersion({
                branch,
                lastRelease,
                nextRelease: { type: 'minor', channel: null },
                logger: { log() {} },
            }),
        ).toBe('17.1.0-next.2')
        const main = { name: 'main', type: 'release', tags }
        const stable = getLastRelease({
            branch: main,
            options: { tagFormat: releaseConfig.tagFormat },
        })
        expect(stable.version).toBe('17.0.1')
        expect(
            getNextVersion({
                branch: main,
                lastRelease: stable,
                nextRelease: { type: 'patch' },
                logger: { log() {} },
            }),
        ).toBe('17.0.2')
    })
    it('checks both registries before returning a publish decision, including a single mirror', async () => {
        const reads: string[] = []
        await expect(
            preflight(manifest, async (destination: string) => {
                reads.push(destination)
                return destination === 'npm'
                    ? matching
                    : { versions: { '17.0.1': { dist: { integrity: 'sha512-other-bytes' } } } }
            }),
        ).rejects.toThrow('different bytes')
        expect(reads).toEqual(['npm', 'github'])
        await expect(
            preflight(manifest, async () => {
                throw new Error('HTTP 401')
            }),
        ).rejects.toThrow('HTTP 401')
    })

    it('skips an identical copy without retagging, and blocks downgrades', () => {
        expect(publicationDecision(matching, manifest, 'latest')).toBe('already-published')
        const newer = { versions: {}, 'dist-tags': { latest: '17.1.0' } }
        expect(() => publicationDecision(newer, manifest, 'latest')).toThrow('backwards')
        expect(publicationDecision(newer, manifest, 'recovery-17.0.1')).toBe('publish')
        expect(publicationDecision(null, manifest, 'latest')).toBe('publish')
    })

    it('keeps prereleases off latest and guards the next channel separately', () => {
        const next = { ...manifest, branch: 'next', channel: 'next', version: '17.1.0-next.1' }
        expect(() => publicationDecision(null, next, 'latest')).toThrow('channel')
        expect(() =>
            publicationDecision(
                { versions: {}, 'dist-tags': { next: '17.1.0-next.2' } },
                next,
                'next',
            ),
        ).toThrow('backwards')
        expect(publicationDecision(null, next, 'next')).toBe('publish')
    })

    it('accepts the historical trusted run after harmless current workflow maintenance', () => {
        const compare = () => ({ status: 'ahead' })
        expect(() => validateRun(build, manifest, compare)).not.toThrow()
        // Validation uses the historical workflow identity and source ancestry, not current bytes.
        expect(() =>
            validateRun({ ...build, head_sha: 'b'.repeat(40) }, manifest, compare),
        ).toThrow()
        expect(() => validateRun({ ...build, event: 'pull_request' }, manifest, compare)).toThrow()
        expect(() => validateRun({ ...build, workflow_id: 1 }, manifest, compare)).toThrow()
        expect(() => validateRun(build, manifest, () => ({ status: 'diverged' }))).toThrow(
            'history',
        )
        expect(() => validateRun(build, { ...manifest, schemaVersion: 2 }, compare)).toThrow(
            'original artifact',
        )
    })

    it('isolates npm credentials and preserves terminal input on successful subprocesses', () => {
        const env = publishEnvironment('npm', undefined, {
            PATH: '/bin',
            GH_TOKEN: 'fake-gh',
            GITHUB_TOKEN: 'fake-gh',
            GH_PACKAGES_TOKEN: 'fake-read',
            NODE_AUTH_TOKEN: 'fake-gh',
            NPM_CONFIG_REGISTRY: 'https://npm.pkg.github.com/',
            ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com/oidc',
        })
        expect(env.GH_TOKEN).toBeUndefined()
        expect(env.GITHUB_TOKEN).toBeUndefined()
        expect(env.GH_PACKAGES_TOKEN).toBeUndefined()
        expect(env.NODE_AUTH_TOKEN).toBeUndefined()
        expect(env.NPM_CONFIG_REGISTRY).toBeUndefined()
        expect(env.NPM_CONFIG_PROVENANCE).toBe('false')
        expect(env.ACTIONS_ID_TOKEN_REQUEST_URL).toBe('https://example.com/oidc')
        expect(run(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'inherit' })).toBe('')
        expect(() =>
            run(process.execPath, ['-e', 'process.exit(2)'], { stdio: 'inherit' }),
        ).toThrow()
    })

    it('rejects private, old-scope, local or registry-overriding package metadata', () => {
        const pkg = {
            name: '@todoist/todoist-sdk',
            version: '17.0.1',
            repository: 'https://github.com/todoist/todoist-sdk-typescript',
            publishConfig: { provenance: false },
            exports: { '.': { types: './dist/types/index.d.ts', default: './dist/esm/index.js' } },
            engines: { node: '>=24' },
            dependencies: { '@todoist/sdk-kmp': '0.6.2' },
        }
        expect(() => validatePackage(pkg, '17.0.1')).not.toThrow()
        expect(() => validatePackage({ ...pkg, private: true }, '17.0.1')).toThrow()
        expect(() =>
            validatePackage(
                { ...pkg, publishConfig: { registry: 'https://example.com/' } },
                '17.0.1',
            ),
        ).toThrow()
        expect(() =>
            validatePackage({ ...pkg, dependencies: { '@doist/sdk-kmp': '0.6.0' } }, '17.0.1'),
        ).toThrow()
        expect(() =>
            validatePackage(
                { ...pkg, dependencies: { '@todoist/sdk-kmp': 'file:../fixture' } },
                '17.0.1',
            ),
        ).toThrow()
    })

    it('resumes a matching interrupted draft, uploads only missing original assets, then verifies publication', async () => {
        const release = {
            tag_name: 'v17.0.1',
            target_commitish: sourceSha,
            draft: true,
            prerelease: false,
            assets: [{ name: 'todoist-todoist-sdk-17.0.1.tgz', state: 'uploaded' }],
        }
        let tagSha: string | null = null
        const writes: string[] = []
        const verified: string[] = []
        await reconcileRecord(manifest, {
            getRelease: async () => release,
            getTag: async () => tagSha,
            createDraft: async () => {
                throw new Error('must not recreate a matching draft')
            },
            upload: async (name: string) => {
                writes.push(`upload ${name}`)
                release.assets.push({ name, state: 'uploaded' })
            },
            verifyAsset: async (asset: { name: string }, name: string) => {
                expect(asset.name).toBe(name)
                verified.push(name)
            },
            publishDraft: async () => {
                writes.push('publish draft')
                release.draft = false
                tagSha = sourceSha
            },
        })
        expect(writes).toEqual(['upload release.json', 'publish draft'])
        expect(verified).toEqual([
            'todoist-todoist-sdk-17.0.1.tgz',
            'release.json',
            'todoist-todoist-sdk-17.0.1.tgz',
            'release.json',
        ])
    })

    it('does not accept a draft/tag-name match, wrong commit, wrong prerelease state or conflicting asset as a complete record', async () => {
        const release = {
            tag_name: 'v17.0.1',
            target_commitish: sourceSha,
            draft: true,
            prerelease: false,
            assets: [{ name: manifest.filename }, { name: 'release.json' }],
        }
        const boundary = {
            getRelease: async () => release,
            getTag: async () => sourceSha,
            createDraft: async () => {
                throw new Error('unexpected creation')
            },
            upload: async () => {
                throw new Error('unexpected upload')
            },
            verifyAsset: async () => {},
            publishDraft: async () => {},
        }
        await expect(reconcileRecord(manifest, boundary)).rejects.toThrow('still a draft')
        await expect(
            reconcileRecord(manifest, { ...boundary, getTag: async () => 'b'.repeat(40) }),
        ).rejects.toThrow('different source')
        await expect(
            reconcileRecord(manifest, {
                ...boundary,
                getRelease: async () => ({ ...release, prerelease: true }),
            }),
        ).rejects.toThrow()
        await expect(
            reconcileRecord(manifest, {
                ...boundary,
                verifyAsset: async () => {
                    throw new Error('asset bytes differ')
                },
            }),
        ).rejects.toThrow('asset bytes differ')
        await expect(
            reconcileRecord(manifest, {
                ...boundary,
                getRelease: async () => ({ ...release, draft: false, assets: [] }),
            }),
        ).rejects.toThrow('unexpected upload')
    })

    it('rejects incomplete draft baselines and verifies published source and original bytes', () => {
        const bytes = Buffer.from('original tarball')
        const baseline = {
            ...manifest,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
        }
        const release = { tag_name: 'v17.0.1', draft: false, prerelease: false }
        expect(() => validateBaselineRecord(release, baseline, sourceSha, bytes)).not.toThrow()
        expect(() =>
            validateBaselineRecord({ ...release, draft: true }, baseline, sourceSha, bytes),
        ).toThrow('still draft')
        expect(() =>
            validateBaselineRecord(release, baseline, sourceSha, Buffer.from('different bytes')),
        ).toThrow()
    })
})
