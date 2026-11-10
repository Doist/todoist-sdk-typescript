import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { releaseFixture } from './fixtures/release-cli.mjs'

describe('original Actions archive through the actual release CLI', () => {
    it('routes GitHub upload authentication through the actual isolated npm userconfig', () => {
        const fixture = releaseFixture()
        try {
            const result = fixture.invoke('publish', 'github', 'latest')
            expect(result.stderr).toBe('')
            expect(result.status).toBe(0)
            expect(
                fixture.state().writes.map((entry: { command: string }) => entry.command),
            ).toEqual(['npm'])
        } finally {
            fixture.dispose()
        }
    })
    it('accepts the original archive for interactive npm bootstrap with all origin reads before the upload', () => {
        const fixture = releaseFixture()
        try {
            const result = fixture.invoke('publish', 'npm', 'latest')
            expect(result.stderr).toBe('')
            expect(result.status).toBe(0)
            const state = fixture.state()
            expect(state.writes.map((write: { command: string }) => write.command)).toEqual(['npm'])
            const upload = state.calls.findIndex(
                (call: { command: string }) => call.command === 'npm',
            )
            const before = state.calls.slice(0, upload)
            expect(
                before.some((call: { args?: string[] }) =>
                    call.args?.[1].endsWith('/actions/artifacts/77/zip'),
                ),
            ).toBe(true)
            expect(
                before
                    .filter(
                        (call: { url?: string }) =>
                            call.url &&
                            decodeURIComponent(new URL(call.url).pathname) ===
                                '/@todoist/todoist-sdk',
                    )
                    .map((call: { url: string }) => new URL(call.url).host),
            ).toEqual(['registry.npmjs.org', 'npm.pkg.github.com'])
        } finally {
            fixture.dispose()
        }
    })

    it('records stable sources only after dual copies and final release-asset readback, then retries without another write', () => {
        const fixture = releaseFixture()
        try {
            const state = fixture.state()
            state.copies = 'published'
            fixture.writeState(state)
            const result = fixture.invoke('record')
            expect(result.stderr).toBe('')
            expect(result.status).toBe(0)
            const recorded = fixture.state()
            expect(recorded.writes.map((write: { path: string }) => write.path)).toEqual([
                'repos/todoist/todoist-sdk-typescript/git/trees',
                'repos/todoist/todoist-sdk-typescript/git/commits',
                'repos/todoist/todoist-sdk-typescript/git/refs/heads/main',
            ])
            expect(recorded.sourceFiles['CHANGELOG.md']).toBe(
                '## 17.0.1\n\nOriginal release notes.\n\n# Existing history\n',
            )
            const firstWrite = recorded.calls.findIndex((call: { args?: string[] }) =>
                call.args?.includes('--method'),
            )
            const before = recorded.calls.slice(0, firstWrite)
            expect(
                before
                    .filter(
                        (call: { url?: string }) =>
                            call.url &&
                            decodeURIComponent(new URL(call.url).pathname) ===
                                '/@todoist/todoist-sdk',
                    )
                    .map((call: { url: string }) => new URL(call.url).host),
            ).toEqual(['registry.npmjs.org', 'npm.pkg.github.com'])
            expect(
                before
                    .filter((call: { args?: string[] }) =>
                        call.args?.[1].includes('/releases/assets/'),
                    )
                    .map((call: { args: string[] }) => call.args[1].split('/').pop()),
            ).toEqual(['2', '1', '2', '1'])
            const retry = fixture.invoke('record')
            expect(retry.stderr).toBe('')
            expect(retry.status).toBe(0)
            expect(fixture.state().writes).toHaveLength(3)
            for (const name of ['release.json', fixture.manifest.filename])
                expect(readFileSync(resolve(fixture.output, name))).toEqual(
                    readFileSync(resolve(fixture.root, 'original', name)),
                )
        } finally {
            fixture.dispose()
        }
    })

    it.each(['missing-copy', 'missing-timestamp', 'missing-assets'])(
        'does not record source when %s is unresolved',
        (fault) => {
            const fixture = releaseFixture()
            try {
                const state = fixture.state()
                state.copies = 'published'
                if (fault === 'missing-copy') state.copies = 'missing'
                if (fault === 'missing-timestamp') state.release.published_at = null
                if (fault === 'missing-assets') state.release.assets = []
                fixture.writeState(state)
                expect(fixture.invoke('record').status).not.toBe(0)
                expect(fixture.state().writes).toEqual([])
            } finally {
                fixture.dispose()
            }
        },
    )

    it.each([
        ['verify'],
        ['publish', 'npm', 'latest'],
        ['publish', 'github', 'latest'],
        ['record'],
    ])('rejects self-consistent forged local bytes before %s can write', (...args) => {
        const fixture = releaseFixture()
        try {
            fixture.forge()
            const result = fixture.invoke(...args)
            expect(result.stderr).toContain(
                'Local release metadata differs from the authenticated build artifact',
            )
            expect(result.status).not.toBe(0)
            expect(fixture.state().writes).toEqual([])
            expect(
                fixture
                    .state()
                    .calls.filter((call: { command: string }) => call.command === 'fetch'),
            ).toEqual([])
        } finally {
            fixture.dispose()
        }
    })

    it('recovers successful original attempt bytes even after a later failed rerun', () => {
        const fixture = releaseFixture()
        try {
            fixture.cleanOutput()
            const result = fixture.invoke('download', '123', '1')
            expect(result.stderr).toBe('')
            expect(result.status).toBe(0)
            for (const name of ['release.json', fixture.manifest.filename]) {
                expect(readFileSync(resolve(fixture.output, name))).toEqual(
                    readFileSync(resolve(fixture.root, 'original', name)),
                )
            }
            const paths = fixture.state().calls.map((call: { args?: string[] }) => call.args?.[1])
            expect(paths).toContain(
                'repos/todoist/todoist-sdk-typescript/actions/runs/123/attempts/1',
            )
            expect(paths).toContain('repos/todoist/todoist-sdk-typescript/actions/artifacts/77/zip')
            expect(paths).not.toContain('repos/todoist/todoist-sdk-typescript/actions/runs/123')
        } finally {
            fixture.dispose()
        }
    })

    it.each(['digest', 'duplicate', 'expired', 'failed-attempt'])(
        'stops on %s archive evidence before publication',
        (fault) => {
            const fixture = releaseFixture()
            try {
                const state = fixture.state()
                if (fault === 'digest') state.artifact.digest = `sha256:${'0'.repeat(64)}`
                if (fault === 'duplicate') state.artifacts.push({ ...state.artifact, id: 78 })
                if (fault === 'expired') state.artifact.expired = true
                if (fault === 'failed-attempt') state.build.conclusion = 'failure'
                fixture.writeState(state)
                const result = fixture.invoke('publish', 'npm', 'latest')
                expect(result.status).not.toBe(0)
                expect(fixture.state().writes).toEqual([])
                expect(
                    fixture
                        .state()
                        .calls.filter((call: { command: string }) => call.command === 'fetch'),
                ).toEqual([])
            } finally {
                fixture.dispose()
            }
        },
    )
})
