import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const repository = 'todoist/todoist-sdk-typescript'
const packageName = '@todoist/todoist-sdk'
const workflow = '.github/workflows/release.yml'
const directory = resolve('.tmp/release')
const registries = { npm: 'https://registry.npmjs.org/', github: 'https://npm.pkg.github.com/' }
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-next\.(0|[1-9]\d*))?$/
const json = (path) => JSON.parse(readFileSync(path, 'utf8'))
const hash = (bytes, algorithm = 'sha256', encoding = 'hex') =>
    createHash(algorithm).update(bytes).digest(encoding)
export const run = (command, args, options = {}) =>
    execFileSync(command, args, { encoding: 'utf8', ...options })?.trim() ?? ''
const git = (...args) => run('git', args)
const gh = (path) => JSON.parse(run('gh', ['api', `repos/${repository}/${path}`]))

// semantic-release is analysis-only. Its push-auth probe runs against a local bare copy.
export async function verifyRelease(_config, { nextRelease, lastRelease, branch }) {
    assert.match(nextRelease.version, versionPattern)
    assert(['main', 'next'].includes(branch.name))
    // Tags from interrupted records must not silently become the next release's baseline.
    if (lastRelease.version && compareVersions(lastRelease.version, '17.0.0') > 0) {
        await verifyBaseline(lastRelease)
    }
    mkdirSync(directory, { recursive: true })
    writeFileSync(
        `${directory}/plan.json`,
        JSON.stringify(
            {
                version: nextRelease.version,
                previousVersion: lastRelease.version,
                sourceSha: git('rev-parse', 'HEAD'),
                mainSha: git('rev-parse', 'origin/main'),
                branch: branch.name,
                channel: branch.name === 'main' ? 'latest' : 'next',
            },
            null,
            2,
        ),
    )
}

export async function generateNotes(config, context) {
    const generator = await import('@semantic-release/release-notes-generator')
    const notes = await generator.generateNotes(config, {
        ...context,
        options: { ...context.options, repositoryUrl: `https://github.com/${repository}.git` },
    })
    writeFileSync(
        `${directory}/plan.json`,
        JSON.stringify({ ...json(`${directory}/plan.json`), notes }, null, 2),
    )
    return notes
}

export function validatePackage(pkg, version) {
    assert.match(version, versionPattern)
    assert.equal(pkg.name, packageName)
    assert.equal(pkg.version, version)
    assert.notEqual(pkg.private, true)
    assert.equal(pkg.repository, `https://github.com/${repository}`)
    assert.deepEqual(
        pkg.publishConfig,
        { provenance: false },
        'Packed publishConfig must not override routing/visibility',
    )
    assert.deepEqual(pkg.exports, {
        '.': { types: './dist/types/index.d.ts', default: './dist/esm/index.js' },
    })
    assert.equal(pkg.engines.node, '>=24')
    for (const field of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
    ]) {
        for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
            assert(!name.startsWith('@doist/'), `Unmigrated dependency: ${name}`)
            assert(
                !/^(?:file:|link:|workspace:|npm:|https?:|git)/.test(spec),
                `Non-registry dependency: ${name}`,
            )
        }
    }
    assert.match(
        pkg.dependencies?.['@todoist/sdk-kmp'] ?? '',
        /^\d+\.\d+\.\d+$/,
        'SDK KMP must be a real pinned public release',
    )
}

function pack() {
    const plan = json(`${directory}/plan.json`)
    assert.equal(plan.sourceSha, git('rev-parse', 'HEAD'))
    assert.equal(
        plan.sourceSha,
        process.env.GITHUB_SHA,
        'Workflow must check out its own event SHA',
    )
    assert.equal(process.env.GITHUB_REPOSITORY, repository)
    assert.equal(process.env.GITHUB_REF_NAME, plan.branch)
    const pkg = json('package.json')
    const lock = json('package-lock.json').packages['']
    for (const field of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
    ]) {
        assert.deepEqual(
            lock[field],
            pkg[field],
            'Finalize the lockfile from real registries before packing',
        )
    }
    pkg.version = plan.version
    validatePackage(pkg, plan.version)
    const staging = `${directory}/package`
    assert(!existsSync(staging), 'Use a fresh release directory; retain previous artifacts')
    mkdirSync(staging)
    for (const path of ['dist', 'README.md', 'LICENSE'])
        cpSync(path, `${staging}/${path}`, { recursive: true })
    writeFileSync(`${staging}/package.json`, `${JSON.stringify(pkg, null, 4)}\n`)
    const [packed] = JSON.parse(
        run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], {
            cwd: staging,
        }),
    )
    const bytes = readFileSync(`${directory}/${packed.filename}`)
    const manifest = {
        schemaVersion: 1,
        ...plan,
        name: packageName,
        repository,
        workflow,
        workflowSha: process.env.GITHUB_SHA,
        runId: process.env.GITHUB_RUN_ID,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT,
        filename: packed.filename,
        integrity: `sha512-${hash(bytes, 'sha512', 'base64')}`,
        sha256: hash(bytes),
    }
    writeFileSync(`${directory}/release.json`, `${JSON.stringify(manifest, null, 2)}\n`)
    verifyArtifact()
}

export function validateRun(build, manifest, compare) {
    assert.equal(
        manifest.schemaVersion,
        1,
        'Unsupported schema: recover using the original artifact with reviewed compatible tooling; never repack this version',
    )
    assert.equal(manifest.repository, repository)
    assert.equal(manifest.workflow, workflow)
    assert.equal(build.repository.id, 428678731)
    assert.equal(build.head_repository.id, 428678731)
    assert.equal(build.repository.full_name.toLowerCase(), repository)
    assert.equal(build.head_repository.full_name.toLowerCase(), repository)
    assert.equal(build.workflow_id, 252936157)
    assert.equal(build.path, workflow)
    assert.equal(build.status, 'completed')
    assert.equal(build.conclusion, 'success')
    assert(['push', 'workflow_dispatch'].includes(build.event))
    assert(['main', 'next'].includes(manifest.branch))
    assert.equal(build.head_branch, manifest.branch)
    assert.equal(build.head_sha, manifest.sourceSha)
    assert.equal(manifest.workflowSha, manifest.sourceSha)
    assert.equal(String(build.id), manifest.runId)
    assert.equal(String(build.run_attempt), manifest.runAttempt)
    assert(
        ['ahead', 'identical'].includes(compare(manifest.sourceSha, manifest.branch).status),
        'Source is not in reviewed branch history',
    )
    assert(
        ['ahead', 'identical'].includes(compare(manifest.mainSha, 'main').status),
        'Recorded main is not in reviewed main history',
    )
    assert(
        ['ahead', 'identical'].includes(compare(manifest.mainSha, manifest.sourceSha).status),
        'Source must descend from the recorded main history',
    )
    // C06: historical workflow ID/path/event/source evidence survives later workflow edits.
}

function verifyArtifact() {
    const manifest = json(`${directory}/release.json`)
    assert.equal(
        manifest.schemaVersion,
        1,
        'Unsupported schema: preserve original artifact for reviewed recovery',
    )
    assert.equal(manifest.name, packageName)
    assert.match(manifest.version, versionPattern)
    assert.match(manifest.sourceSha, /^[a-f0-9]{40}$/)
    assert.match(manifest.mainSha, /^[a-f0-9]{40}$/)
    assert.equal(manifest.filename, `todoist-todoist-sdk-${manifest.version}.tgz`)
    assert.equal(manifest.channel, manifest.branch === 'main' ? 'latest' : 'next')
    assert.equal(manifest.version.includes('-next.'), manifest.channel === 'next')
    const tarball = `${directory}/${manifest.filename}`
    const bytes = readFileSync(tarball)
    assert.equal(hash(bytes), manifest.sha256)
    assert.equal(`sha512-${hash(bytes, 'sha512', 'base64')}`, manifest.integrity)
    const entries = run('tar', ['-tzf', tarball]).split('\n')
    assert(entries.includes('package/dist/esm/index.js'))
    assert(entries.includes('package/dist/types/index.d.ts'))
    assert(
        entries.every(
            (entry) =>
                /^(?:package\/(?:package\.json|README\.md|LICENSE)|package\/dist\/(?:esm|types)\/[\w./-]+)$/.test(
                    entry,
                ) && !entry.split('/').includes('..'),
        ),
        'Unexpected packed files',
    )
    assert(
        run('tar', ['-tvzf', tarball])
            .split('\n')
            .every((line) => line.startsWith('-')),
        'Only regular files may be packed',
    )
    validatePackage(
        JSON.parse(run('tar', ['-xOzf', tarball, 'package/package.json'])),
        manifest.version,
    )
    return manifest
}

function validateOrigin(manifest) {
    assert.match(manifest.runId, /^[1-9]\d*$/)
    assert.match(manifest.runAttempt, /^[1-9]\d*$/)
    const build = gh(`actions/runs/${manifest.runId}/attempts/${manifest.runAttempt}`)
    validateRun(build, manifest, (base, head) => gh(`compare/${base}...${head}`))
}

function download(runId) {
    assert.match(runId, /^[1-9]\d*$/)
    const build = gh(`actions/runs/${runId}`)
    assert.equal(build.workflow_id, 252936157)
    assert.equal(build.path, workflow)
    assert(['main', 'next'].includes(build.head_branch))
    assert.equal(build.conclusion, 'success')
    assert(
        !existsSync(directory) || readdirSync(directory).length === 0,
        'Use a fresh release directory; preserve original bytes',
    )
    mkdirSync(directory, { recursive: true })
    run('gh', [
        'run',
        'download',
        runId,
        '--repo',
        repository,
        '--name',
        'todoist-sdk-release',
        '--dir',
        directory,
    ])
    const manifest = verifyArtifact()
    assert.equal(manifest.runId, runId)
    validateOrigin(manifest)
}

function compareVersions(left, right) {
    assert.match(left, versionPattern, 'Unrecognized channel version; use recovery-VERSION')
    assert.match(right, versionPattern)
    const a = left
        .match(versionPattern)
        .slice(1)
        .map((part) => (part === undefined ? Infinity : Number(part)))
    const b = right
        .match(versionPattern)
        .slice(1)
        .map((part) => (part === undefined ? Infinity : Number(part)))
    const i = a.findIndex((value, index) => value !== b[index])
    return i < 0 ? 0 : a[i] < b[i] ? -1 : 1
}

export function publicationDecision(metadata, manifest, tag) {
    assert(
        tag === manifest.channel || tag === `recovery-${manifest.version}`,
        'Use the release channel or recovery-VERSION',
    )
    const existing = metadata?.versions?.[manifest.version]
    if (existing) {
        assert.equal(
            existing.dist.integrity,
            manifest.integrity,
            'Existing version has different bytes',
        )
        return 'already-published'
    }
    const current = metadata?.['dist-tags']?.[manifest.channel]
    if (tag === manifest.channel && current)
        assert(
            compareVersions(current, manifest.version) <= 0,
            'Would move channel backwards; use recovery-VERSION',
        )
    return 'publish'
}

async function metadata(destination) {
    const token = destination === 'github' ? process.env.GH_PACKAGES_TOKEN : undefined
    if (destination === 'github')
        assert(token, 'GH_PACKAGES_TOKEN read access is required even for npm-only publication')
    const response = await fetch(`${registries[destination]}${encodeURIComponent(packageName)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
    })
    if (response.status === 404) return null
    assert(response.ok, `${destination} registry lookup failed: HTTP ${response.status}`)
    const result = await response.json()
    assert(result.versions && result['dist-tags'], 'Incomplete registry metadata')
    return result
}

export async function githubPackageState(expectedVisibility) {
    assert(
        ['private', 'internal', 'public'].includes(expectedVisibility),
        'Set independently approved GITHUB_PACKAGE_VISIBILITY',
    )
    const token = process.env.GH_PACKAGES_TOKEN
    assert(token, 'GH_PACKAGES_TOKEN read access required')
    const get = async (url, requireOwnerScope = false) => {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            redirect: 'error',
            signal: AbortSignal.timeout(30000),
        })
        assert(
            response.ok,
            `GitHub package access/visibility lookup failed: HTTP ${response.status}`,
        )
        if (requireOwnerScope) {
            assert.match(
                response.headers.get('x-oauth-scopes') ?? '',
                /(?:^|,\s*)(?:read|write):packages(?:,|$)/,
                'Absent mirror requires an organization-owner classic token with package read scope',
            )
        }
        return response.json()
    }
    // A registry 404 by itself can hide broken authentication. Confirm authenticated access
    // and an independent package inventory before treating it as permission to create a copy.
    const identity = await get('https://npm.pkg.github.com/-/whoami')
    assert(identity.username, 'GitHub registry identity is unresolved')
    for (let page = 1; page <= 100; page++) {
        const packages = await get(
            `https://api.github.com/orgs/todoist/packages?package_type=npm&per_page=100&page=${page}`,
        )
        assert(Array.isArray(packages))
        const pkg = packages.find((entry) => entry.name === 'todoist-sdk')
        if (pkg) {
            assert.equal(
                pkg.visibility,
                expectedVisibility,
                'GitHub mirror visibility differs from approved value',
            )
            assert.equal(pkg.repository?.id, 428678731, 'GitHub package linkage is unresolved')
            return true
        }
        if (packages.length < 100) {
            // Lists are filtered by package ACLs. A valid repository token plus an empty list
            // cannot establish absence. Only an organization owner can bootstrap an absent
            // mirror; otherwise grant this reader access to the existing package first.
            const membership = await get(
                'https://api.github.com/user/memberships/orgs/todoist',
                true,
            )
            assert.equal(
                membership.state,
                'active',
                'Package absence requires an active organization owner',
            )
            assert.equal(
                membership.role,
                'admin',
                'Filtered package inventory is ambiguous; use an organization-owner read token for first publication',
            )
            assert.equal(membership.organization?.id, 2565372)
            return false
        }
    }
    throw new Error('GitHub package inventory incomplete; stop before writing')
}

async function registryPreflight(manifest) {
    const exists = await githubPackageState(process.env.GITHUB_PACKAGE_VISIBILITY)
    const copies = await preflight(manifest, metadata)
    assert.equal(
        Boolean(copies.github),
        exists,
        'GitHub API/registry disagree; resolve access before writing',
    )
    return copies
}

export async function preflight(manifest, lookup) {
    const copies = {}
    for (const destination of ['npm', 'github']) {
        copies[destination] = await lookup(destination)
        const existing = copies[destination]?.versions?.[manifest.version]
        if (existing)
            assert.equal(
                existing.dist?.integrity,
                manifest.integrity,
                `${destination}: different bytes`,
            )
    }
    return copies
}

export function publishEnvironment(destination, token, environment = process.env) {
    const env = Object.fromEntries(
        Object.entries(environment).filter(
            ([key]) =>
                !/^(npm_config_|npm_token$|node_auth_token$|release_token$|gh_token$|github_token$|gh_packages_token$)/i.test(
                    key,
                ),
        ),
    )
    return {
        ...env,
        NPM_CONFIG_USERCONFIG: `${directory}/${destination === 'npm' ? '.npm-auth' : '.github-auth'}`,
        NPM_CONFIG_GLOBALCONFIG: '/dev/null',
        RELEASE_TOKEN: token ?? '',
        NPM_CONFIG_PROVENANCE: 'false',
    }
}

async function publish(destination, tag) {
    assert(Object.hasOwn(registries, destination))
    const manifest = verifyArtifact()
    validateOrigin(manifest)
    const copies = await registryPreflight(manifest)
    if (publicationDecision(copies[destination], manifest, tag) === 'already-published') {
        console.log(`${destination}: identical artifact exists; tags unchanged`)
        return
    }
    const registry = registries[destination]
    const token = destination === 'github' ? process.env.NODE_AUTH_TOKEN : process.env.NPM_TOKEN
    if (destination === 'github') assert(token, 'NODE_AUTH_TOKEN GitHub write access required')
    const auth = token ? `//${new URL(registry).host}/:_authToken=\${RELEASE_TOKEN}\n` : ''
    writeFileSync(
        `${directory}/.npmrc`,
        `registry=${registry}\n@todoist:registry=${registry}\nprovenance=false\n${auth}`,
        { mode: 0o600 },
    )
    run(
        'npm',
        [
            'publish',
            `${directory}/${manifest.filename}`,
            `--registry=${registry}`,
            `--@todoist:registry=${registry}`,
            `--tag=${tag}`,
            '--ignore-scripts',
            '--provenance=false',
            ...(destination === 'npm' ? ['--access=public'] : []),
        ],
        {
            cwd: directory,
            stdio: 'inherit',
            env: publishEnvironment(destination, token),
        },
    )
    const after = await metadata(destination)
    assert.equal(after?.versions?.[manifest.version]?.dist?.integrity, manifest.integrity)
    assert.equal(after?.['dist-tags']?.[tag], manifest.version)
    if (destination === 'github')
        assert(await githubPackageState(process.env.GITHUB_PACKAGE_VISIBILITY))
}

// A release name alone is not a semantic baseline. Interrupted drafts/uploads are recoverable.
export async function reconcileRecord(manifest, boundary) {
    const tag = `v${manifest.version}`
    let release = await boundary.getRelease(tag)
    let tagSha = await boundary.getTag(tag)
    if (tagSha)
        assert.equal(
            tagSha,
            manifest.sourceSha,
            'Tag points at different source; do not force or recreate it',
        )
    if (!release) {
        await boundary.createDraft(tag)
        release = await boundary.getRelease(tag)
    }
    assert(release, 'Draft creation incomplete; recover with original artifact')
    assert.equal(release.tag_name, tag)
    assert.equal(release.prerelease, manifest.channel === 'next')
    assert.equal(typeof release.draft, 'boolean')
    if (!tagSha) {
        assert(release.draft, 'Published release missing its tag; recover original record manually')
        assert.equal(
            release.target_commitish,
            manifest.sourceSha,
            'Draft target does not identify the exact source',
        )
    }
    for (const filename of [manifest.filename, 'release.json']) {
        const asset = release.assets.find((entry) => entry.name === filename)
        if (asset) await boundary.verifyAsset(asset, filename)
        else {
            await boundary.upload(filename)
            release = await boundary.getRelease(tag)
            const uploaded = release.assets.find((entry) => entry.name === filename)
            assert(uploaded, 'Asset upload incomplete; retry with original artifact')
            await boundary.verifyAsset(uploaded, filename)
        }
    }
    if (release.draft) await boundary.publishDraft(tag)
    release = await boundary.getRelease(tag)
    tagSha = await boundary.getTag(tag)
    assert.equal(tagSha, manifest.sourceSha)
    assert.equal(release.tag_name, tag)
    assert.equal(release.draft, false, 'Release is still a draft; retry with original artifact')
    assert.equal(release.prerelease, manifest.channel === 'next')
    for (const filename of [manifest.filename, 'release.json']) {
        const asset = release.assets.find((entry) => entry.name === filename)
        assert(asset, 'Published record is incomplete; recover with original artifact')
        await boundary.verifyAsset(asset, filename)
    }
}

async function optionalGithub(path) {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || run('gh', ['auth', 'token'])
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
    })
    if (response.status === 404) return null
    assert(response.ok, `GitHub lookup failed: HTTP ${response.status}`)
    return response.json()
}

export async function findRelease(tag) {
    // The tag endpoint only promises published releases; listing includes authenticated drafts.
    for (let page = 1; page <= 100; page++) {
        const releases = await optionalGithub(`releases?per_page=100&page=${page}`)
        assert(Array.isArray(releases), 'Cannot inspect release drafts; stop with original bytes')
        const release = releases.find((entry) => entry.tag_name === tag)
        if (release) return release
        if (releases.length < 100) return null
    }
    throw new Error('Release inventory incomplete; recover original record without recreating it')
}

function releaseAssetBytes(asset) {
    assert.equal(asset.state, 'uploaded', 'Release asset upload is incomplete')
    return execFileSync(
        'gh',
        [
            'api',
            `repos/${repository}/releases/assets/${asset.id}`,
            '-H',
            'Accept: application/octet-stream',
        ],
        { maxBuffer: 50 * 1024 * 1024 },
    )
}

export function validateBaselineRecord(release, manifest, tagSha, tarball) {
    assert(
        release && release.draft === false,
        'Previous release is missing or still draft; recover the original artifact before planning another version',
    )
    assert.equal(release.tag_name, `v${manifest.version}`)
    assert.equal(release.prerelease, manifest.channel === 'next')
    assert.equal(tagSha, manifest.sourceSha)
    assert.equal(hash(tarball), manifest.sha256)
    assert.equal(`sha512-${hash(tarball, 'sha512', 'base64')}`, manifest.integrity)
}

async function verifyBaseline(lastRelease) {
    const release = await findRelease(`v${lastRelease.version}`)
    assert(
        release && !release.draft,
        'Previous release is incomplete; recover original artifact before planning',
    )
    const metadataAsset = release.assets.find((asset) => asset.name === 'release.json')
    assert(metadataAsset, 'Previous release metadata missing; recover original artifact')
    const manifest = JSON.parse(releaseAssetBytes(metadataAsset).toString('utf8'))
    assert.equal(manifest.name, packageName)
    assert.equal(manifest.version, lastRelease.version)
    assert.equal(manifest.sourceSha, lastRelease.gitHead)
    validateOrigin(manifest)
    const artifact = release.assets.find((asset) => asset.name === manifest.filename)
    assert(artifact, 'Previous retained tarball missing; recover original artifact')
    validateBaselineRecord(release, manifest, lastRelease.gitHead, releaseAssetBytes(artifact))
    const copies = await preflight(manifest, metadata)
    for (const copy of Object.values(copies))
        assert.equal(
            copy?.versions?.[manifest.version]?.dist?.integrity,
            manifest.integrity,
            'Previous release requires both registry copies',
        )
}

async function record() {
    const manifest = verifyArtifact()
    validateOrigin(manifest)
    const copies = await registryPreflight(manifest)
    for (const copy of Object.values(copies))
        assert.equal(
            copy?.versions?.[manifest.version]?.dist?.integrity,
            manifest.integrity,
            'Both registry copies are required before recording',
        )
    const notes = `${directory}/notes.md`
    writeFileSync(
        notes,
        `[Posted by Jarvis]\n\n${manifest.notes ?? packageName}\n\nSource: ${manifest.sourceSha}\nBuild: https://github.com/${repository}/actions/runs/${manifest.runId}\nSHA-256: ${manifest.sha256}\n`,
    )
    await reconcileRecord(manifest, {
        getRelease: findRelease,
        getTag: async (tag) => {
            const ref = await optionalGithub(`git/ref/tags/${tag}`)
            if (!ref) return null
            let object = ref.object
            for (let depth = 0; object.type === 'tag' && depth < 5; depth++)
                object = gh(`git/tags/${object.sha}`).object
            assert.equal(object.type, 'commit')
            return object.sha
        },
        createDraft: (tag) =>
            run('gh', [
                'release',
                'create',
                tag,
                '--repo',
                repository,
                '--target',
                manifest.sourceSha,
                '--draft',
                `--prerelease=${manifest.channel === 'next'}`,
                '--title',
                tag,
                '--notes-file',
                notes,
                '--latest=false',
            ]),
        upload: (filename) =>
            run('gh', [
                'release',
                'upload',
                `v${manifest.version}`,
                `${directory}/${filename}`,
                '--repo',
                repository,
            ]),
        verifyAsset: (asset, filename) => {
            const bytes = releaseAssetBytes(asset)
            assert.equal(
                hash(bytes),
                hash(readFileSync(`${directory}/${filename}`)),
                'Release asset differs: recover original bytes; never clobber',
            )
        },
        publishDraft: (tag) =>
            run('gh', [
                'release',
                'edit',
                tag,
                '--repo',
                repository,
                '--draft=false',
                '--latest=false',
            ]),
    })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const [command, ...args] = process.argv.slice(2)
    if (command === 'pack') pack()
    else if (command === 'download') download(args[0])
    else if (command === 'verify') {
        const manifest = verifyArtifact()
        validateOrigin(manifest)
    } else if (command === 'publish') await publish(args[0], args[1])
    else if (command === 'record') await record()
    else
        throw new Error('Expected pack, download RUN_ID, verify, publish npm|github TAG, or record')
}
