/**
 * @type {import('semantic-release').GlobalConfig}
 */

// Analysis reads ordinary GitHub release tags, which have no semantic-release Git notes.
// Use the default analysis channel so it recognizes successive -next.N tags. Publication
// still maps this branch exclusively to the registry's `next` channel in release.mjs.
const prereleaseBranches = [{ name: 'next', prerelease: true, channel: false }]

export default {
    branches: ['main', ...prereleaseBranches],
    // Keep the existing unscoped lineage. Renaming the npm scope must not reset versions.
    tagFormat: 'v${version}',
    dryRun: true,
    plugins: [
        ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
        ['./scripts/release.mjs', { preset: 'conventionalcommits' }],
    ],
}
