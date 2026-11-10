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
    recordStableSource,
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

describe('stable source recording after publication', () => {
    function sourceBoundary() {
        const files: Record<string, string> = {
            'package.json':
                '{"name":"@todoist/todoist-sdk","version":"17.0.0","description":"keep"}\n',
            'package-lock.json':
                '{"name":"@todoist/todoist-sdk","version":"17.0.0","packages":{"":{"name":"@todoist/todoist-sdk","version":"17.0.0"},"node_modules/example":{"version":"1.0.0","integrity":"retained"}}}\n',
            'CHANGELOG.md': '# Existing history\n\nKeep exactly.\n',
        }
        const writes: { path: string; data: any }[] = []
        let head = 'b'.repeat(40)
        return {
            files,
            writes,
            read: async (path: string) => {
                if (path === 'git/ref/heads/main') return { object: { type: 'commit', sha: head } }
                if (path.startsWith('compare/')) return { status: 'ahead' }
                if (path.startsWith('git/commits/')) return { tree: { sha: 'c'.repeat(40) } }
                if (path.startsWith('contents/'))
                    return {
                        encoding: 'base64',
                        content: Buffer.from(files[path.slice(9).split('?')[0]]).toString('base64'),
                    }
                throw new Error(`Unexpected read ${path}`)
            },
            write: async (path: string, data: any) => {
                writes.push({ path, data })
                if (path === 'git/trees') {
                    for (const file of data.tree) files[file.path] = file.content
                    return { sha: 'd'.repeat(40) }
                }
                if (path === 'git/commits') return { sha: 'e'.repeat(40) }
                if (path === 'git/refs/heads/main') {
                    head = data.sha
                    return {}
                }
                throw new Error(`Unexpected write ${path}`)
            },
        }
    }
    const stable = { ...manifest, previousVersion: '17.0.0', notes: '## 17.0.1\n\nOriginal notes.' }

    it('records only three stable source files after the build, preserving history and retrying without another commit', async () => {
        const boundary = sourceBoundary()
        const first = await recordStableSource(stable, boundary)
        expect(first).toEqual({
            status: 'recorded',
            sourceCommit: 'e'.repeat(40),
            buildCommit: sourceSha,
        })
        expect(boundary.writes.map((entry) => entry.path)).toEqual([
            'git/trees',
            'git/commits',
            'git/refs/heads/main',
        ])
        expect(boundary.files['CHANGELOG.md']).toBe(
            '## 17.0.1\n\nOriginal notes.\n\n# Existing history\n\nKeep exactly.\n',
        )
        expect(JSON.parse(boundary.files['package.json'])).toEqual({
            name: '@todoist/todoist-sdk',
            version: '17.0.1',
            description: 'keep',
        })
        expect(
            JSON.parse(boundary.files['package-lock.json']).packages['node_modules/example'],
        ).toEqual({ version: '1.0.0', integrity: 'retained' })
        expect(boundary.writes[1].data.parents).toEqual(['b'.repeat(40)])
        expect(boundary.writes[1].data.message).toContain(`Release-Build: ${sourceSha}`)
        expect(boundary.writes[2].data).toEqual({ sha: 'e'.repeat(40), force: false })
        expect(await recordStableSource(stable, boundary)).toEqual({
            status: 'already-recorded',
            sourceCommit: 'e'.repeat(40),
            buildCommit: sourceSha,
        })
        expect(boundary.writes).toHaveLength(3)
    })

    it('keeps prereleases out of source recording', async () => {
        const boundary = sourceBoundary()
        boundary.read = async () => {
            throw new Error('Prerelease must not read source')
        }
        expect(
            await recordStableSource(
                { ...stable, channel: 'next', branch: 'next', version: '17.1.0-next.1' },
                boundary,
            ),
        ).toEqual({ status: 'prerelease-excluded' })
        expect(boundary.writes).toEqual([])
    })

    it('stops on partial or newer source versions without overwriting user work', async () => {
        const boundary = sourceBoundary()
        boundary.files['package.json'] = boundary.files['package.json'].replace('17.0.0', '17.0.2')
        await expect(recordStableSource(stable, boundary)).rejects.toThrow('Source versions')
        expect(boundary.writes).toEqual([])
    })

    it('stops on a concurrent main update without force or retrying a stale tree', async () => {
        const boundary = sourceBoundary()
        const original = boundary.write
        boundary.write = async (path, data) => {
            if (path === 'git/refs/heads/main') {
                expect(data.force).toBe(false)
                throw new Error('HTTP 422 non-fast-forward')
            }
            return original(path, data)
        }
        await expect(recordStableSource(stable, boundary)).rejects.toThrow('non-fast-forward')
        expect(boundary.writes.map((entry) => entry.path)).toEqual(['git/trees', 'git/commits'])
    })
})

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
            published_at: null as string | null,
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
                release.published_at = '2026-11-10T12:00:00Z'
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

    it('verifies all existing draft assets before uploading anything into a matching draft', async () => {
        const release = {
            tag_name: 'v17.0.1',
            target_commitish: sourceSha,
            draft: true,
            published_at: null,
            prerelease: false,
            assets: [{ name: 'release.json', state: 'uploaded' }],
        }
        const writes: string[] = []
        await expect(
            reconcileRecord(manifest, {
                getRelease: async () => release,
                getTag: async () => null,
                createDraft: async () => {
                    writes.push('create')
                },
                upload: async (name: string) => {
                    writes.push(name)
                    release.assets.push({ name, state: 'uploaded' })
                },
                verifyAsset: async (asset: { name: string }) => {
                    if (asset.name === 'release.json') throw new Error('metadata bytes differ')
                },
                publishDraft: async () => {
                    writes.push('publish')
                },
            }),
        ).rejects.toThrow('metadata bytes differ')
        expect(writes).toEqual([])
    })

    it('does not accept a draft/tag-name match, wrong commit, wrong prerelease state or conflicting asset as a complete record', async () => {
        const release = {
            tag_name: 'v17.0.1',
            target_commitish: sourceSha,
            draft: true,
            published_at: null,
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
        ).rejects.toThrow('Published record')
    })

    it.each([null, 'invalid', '2026-02-30T12:00:00Z'])(
        'rejects published records without a valid timestamp (%s) before any upload',
        async (publishedAt) => {
            const release = {
                tag_name: 'v17.0.1',
                draft: false,
                prerelease: false,
                published_at: publishedAt,
                assets: [],
            }
            const writes: string[] = []
            await expect(
                reconcileRecord(manifest, {
                    getRelease: async () => release,
                    getTag: async () => sourceSha,
                    createDraft: async () => {
                        writes.push('create')
                    },
                    upload: async () => {
                        writes.push('upload')
                    },
                    publishDraft: async () => {
                        writes.push('publish')
                    },
                    verifyAsset: async () => {},
                }),
            ).rejects.toThrow('Published record')
            expect(writes).toEqual([])
        },
    )

    it('stops on published missing assets instead of silently repairing the record', async () => {
        const writes: string[] = []
        await expect(
            reconcileRecord(manifest, {
                getRelease: async () => ({
                    tag_name: 'v17.0.1',
                    draft: false,
                    prerelease: false,
                    published_at: '2026-11-10T12:00:00Z',
                    assets: [],
                }),
                getTag: async () => sourceSha,
                createDraft: async () => {
                    writes.push('create')
                },
                upload: async () => {
                    writes.push('upload')
                },
                publishDraft: async () => {
                    writes.push('publish')
                },
                verifyAsset: async () => {},
            }),
        ).rejects.toThrow('Published record is incomplete')
        expect(writes).toEqual([])
    })

    it('rejects incomplete draft baselines and verifies published source and original bytes', () => {
        const bytes = Buffer.from('original tarball')
        const baseline = {
            ...manifest,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
        }
        const release = {
            tag_name: 'v17.0.1',
            draft: false,
            prerelease: false,
            published_at: '2026-11-10T12:00:00Z',
            assets: [
                { name: manifest.filename, state: 'uploaded' },
                { name: 'release.json', state: 'uploaded' },
            ],
        }
        expect(() => validateBaselineRecord(release, baseline, sourceSha, bytes)).not.toThrow()
        expect(() =>
            validateBaselineRecord({ ...release, draft: true }, baseline, sourceSha, bytes),
        ).toThrow('still draft')
        expect(() =>
            validateBaselineRecord(release, baseline, sourceSha, Buffer.from('different bytes')),
        ).toThrow()
        expect(() =>
            validateBaselineRecord({ ...release, published_at: null }, baseline, sourceSha, bytes),
        ).toThrow('Published record')
        expect(() =>
            validateBaselineRecord({ ...release, assets: [] }, baseline, sourceSha, bytes),
        ).toThrow('Published record is incomplete')
    })
})
