# Release artifacts and recovery

The package is public on npm. The same tarball and version must exist in GitHub Packages before consumers or the release record advance. GitHub mirror visibility is independent: inspect it and pass the approved value; a newly created GitHub package defaults to private. Do not infer visibility or consumer access from the public source repository.

## Migration prerequisites

The intended first release is `@todoist/todoist-sdk@17.0.1`, from the current forward line. Existing `v17.0.0` history remains the semantic-release baseline; the scope does not enter `tagFormat`. Use a `fix:` migration title to select the next patch and recheck current source, npm latest, tags and target-version collisions before release. New features or breaking changes require their normal version, not a forced patch.

`@todoist/sdk-kmp@0.6.2` must first be published and verified in both registries. Until then the migration manifest and old dependency lock entry deliberately disagree: the draft is **WAITING_FOR_PUBLICATION**, not mergeable. After publication, from this checkout with npmjs routing:

```sh
npm install --package-lock-only --ignore-scripts --registry=https://registry.npmjs.org/ --@todoist:registry=https://registry.npmjs.org/
npm ci --ignore-scripts --registry=https://registry.npmjs.org/ --@todoist:registry=https://registry.npmjs.org/
npm run verify
cd website
npm ci --ignore-scripts
npm run build
```

Review the actual lockfile and packed runtime/peer dependencies. No alias, local tarball, invented integrity or old-scope source check satisfies this gate. Public npm consumers must not need private GitHub credentials.

## Administrator setup

An authorized maintainer completes these separately from source preparation:

- [GitHub Actions settings](https://github.com/todoist/todoist-sdk-typescript/settings/actions): confirm workflow access after the owner rename. No shared SDK-dependent publishing action is needed for this repository.
- [Environments](https://github.com/todoist/todoist-sdk-typescript/settings/environments): create `npm-release`, restrict it to `main`, and require maintainer approval. The publisher runs on GitHub-hosted `ubuntu-latest`, Node 24 and npm 11.21.0. Its direct caller is **publish-release.yml**, with `contents: write`, `actions: read`, `packages: write`, and `id-token: write`.
- [GitHub package settings](https://github.com/orgs/todoist/packages/npm/todoist-sdk/settings): inspect visibility, repository linkage, publishing Write and actual consuming repositories' Read access. Local reads require a classic PAT with package access. An absent mirror can only be bootstrapped with an active organization owner’s package-read token (plus `read:org` to verify owner membership): ordinary repository tokens see filtered inventories and cannot prove absence. Preflight uses `GH_PACKAGES_TOKEN`; GitHub upload uses `NODE_AUTH_TOKEN`; repository/run access uses `GH_TOKEN` or an existing `gh` login. Values must never be copied into source or logs.
- [npm settings](https://www.npmjs.com/package/@todoist/todoist-sdk/access): bootstrap the first real artifact interactively. Once the package exists, configure trusted publishing for **todoist / todoist-sdk-typescript / publish-release.yml / npm-release**, explicitly allowing direct `npm publish`. Configure near the next genuine release; manual publication does not test OIDC. See [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/) and [trusted publishing](https://docs.npmjs.com/trusted-publishers/).

GitHub credentials remain in the preflight parent and are removed from npm's publication environment. Each destination uses an isolated directory/config and explicit scope mapping. Automatic provenance is disabled: the publisher run may be newer than the build source, so it cannot truthfully attest its own checkout as that source.

## Build once

Merging into `main` or `next` runs **release.yml** with read-only permissions. It analyzes Conventional Commits, verifies the SDK, packs once, and retains `todoist-sdk-release` containing the tarball and schema-1 `release.json`. It creates no package, Git tag, release or release commit. Its semantic-release push-auth probe is confined to a local bare copy of the checkout.

For a missing build, only an authorized operator may dispatch at the reviewed current branch head:

```sh
REVIEWED_MAIN_SHA=$(gh api repos/todoist/todoist-sdk-typescript/commits/main --jq .sha)
# Compare this to the reviewed commit before dispatch.
gh workflow run release.yml --repo todoist/todoist-sdk-typescript --ref main \
  -f source_sha="$REVIEWED_MAIN_SHA" -f expected_version=17.0.1
gh run list --repo todoist/todoist-sdk-typescript --workflow release.yml \
  --json databaseId,headSha,headBranch,event,conclusion --limit 10
```

The selected SHA, workflow head and checkout must agree. A `next` build must descend from current reviewed `main`; its version/channel is a `-next.N` prerelease on `next`, never `latest`. Historical old-scope prereleases are not migration candidates.

## First npm publication and GitHub mirror

These are future operator commands, never source-verification checks. Select the successful build as `BUILD_RUN_ID`, retain it, and use a fresh reviewed checkout with empty `.tmp/release`:

```sh
node scripts/release.mjs download "$BUILD_RUN_ID"
node scripts/release.mjs verify
# GH_PACKAGES_TOKEN supplies GitHub package READ access, even for npm-only publication.
# Set this to the independently approved mirror visibility; absence is checked separately.
export GITHUB_PACKAGE_VISIBILITY=private
npm login --registry=https://registry.npmjs.org/ --userconfig="$PWD/.tmp/release/.npm-auth"
node scripts/release.mjs publish npm latest
# First GitHub creation also needs the organization-owner read token to prove absence.
# NODE_AUTH_TOKEN is the authorized GitHub package WRITE token, separate from npm login.
node scripts/release.mjs publish github latest
# Once linkage/visibility/read access exist, the workflow's repository token can verify both.
gh workflow run publish-release.yml --repo todoist/todoist-sdk-typescript --ref main \
  -f run_id="$BUILD_RUN_ID" -f destination=record \
  -f github_visibility="$GITHUB_PACKAGE_VISIBILITY"
```

Use Node 24 and npm 11.21.0 (install the CLI under a temporary prefix if needed, never change global configuration). Login and actual npm publication both use terminal input for fresh 2FA. The helper preflights **both registries before every write**, including bootstrap and a single missing mirror: matching bytes skip, different bytes or authentication/network/visibility ambiguity stop. It never republishes an existing version or retags a matching copy. Do not bypass these checks with a standalone publish command.

A filtered empty package list plus a registry 404 never authorizes a write. The helper verifies active organization-owner authority before accepting absence; a repository token fails closed and requires local owner bootstrap or restored access to the existing mirror.

After first mirror creation, independently confirm its actual visibility, linkage and consuming repository ACLs. If the intended visibility differs from its creation default, the administrator resolves that before any subsequent publication or consumer gate. No helper changes package visibility.

## Retries, release records and lineage

Future OIDC publication uses the same publisher with `destination=both`. A missing mirror uses the **original** build run, tarball and metadata; never rerun the build or semantic-release to recover an immutable version. If a channel has advanced, use `dist_tag=recovery-17.0.1` (or the exact retained version). This leaves `latest`/`next` unchanged. Removing the recovery tag is a separate maintainer action after verification, using the matching registry and scope mapping; there is no automatic promotion.

`destination=record` verifies both registry copies without a package upload. Recording checks the exact tag commit, draft/published state, stable/prerelease state and both retained release assets (`.tgz` and `release.json`). It resumes a matching interrupted draft/upload, verifies every asset's actual bytes, publishes the draft, then verifies again. Conflicting tags/assets stop for original-byte recovery; it never forces tags, clobbers assets, deletes or recreates a release. A tag-name match or an incomplete draft is not success. A new-scope semantic-release baseline is accepted only after the previous release is published with matching source, assets and both registry copies. Release bodies begin with `[Posted by Jarvis]` and a blank line.

If GitHub refuses release creation for an older source whose workflow files differ from current `main`, `GITHUB_TOKEN` cannot supply the required Workflows permission. Stop and retain the original artifact. An authorized maintainer uses the same reviewed helper locally with `GH_TOKEN` from an approved GitHub App/PAT granting repository Contents write and Workflows write (classic PAT: appropriate repository access plus `workflow`), and `GH_PACKAGES_TOKEN` for package reads. Run `node scripts/release.mjs verify` and `node scripts/release.mjs record` against the original files. Do not rebuild, force a tag, weaken protection or silently broaden workflow credentials. See [GitHub release creation permissions](https://docs.github.com/en/rest/releases/releases#create-a-release).

Retain the original files and originating run evidence beyond the Actions artifact retention limit (90 days or the organization's shorter cap). The release record also stores them. When an Actions artifact expires, restore those same files into `.tmp/release` and run `verify`, then the required operation. Historical successful workflow ID/path/event, exact run attempt, checkout SHA and reviewed ancestry are validated. Later harmless workflow maintenance does not invalidate the original artifact. Unsupported metadata stops for reviewed compatible recovery tooling; do not repack the version.

After a stable record, the next patch continues the existing lineage (17.0.1 → 17.0.2). Separate prerelease records preserve the `next` channel. Complete interrupted records before the next version analysis. Historical changelog entries, tags and old npm releases remain untouched.

## Real consumer and Pages gates

Compare exact-version integrity in npmjs and GitHub with `release.json`, then perform clean consumer installs through each actual routing/authentication configuration. For GitHub routing, use a temporary user config with `@todoist:registry=https://npm.pkg.github.com/` and a token scoped to that host. npmjs installs must work without GitHub access. Publication success alone does not prove consumer permissions.

The documentation uses `https://todoist.github.io/todoist-sdk-typescript/`. **Merging this PR also triggers deploy-docusaurus.yml**, which builds and deploys Pages using `github-pages`; do not merge before rename, dependency, build and Pages readiness gates. Inspect [Pages settings](https://github.com/todoist/todoist-sdk-typescript/settings/pages) and [environment restrictions](https://github.com/todoist/todoist-sdk-typescript/settings/environments), then verify the new homepage, authorization page, generated API deep links, canonical URLs and assets after the authorized deployment. The old host is not a promised redirect. Source preparation never dispatches deployment.
