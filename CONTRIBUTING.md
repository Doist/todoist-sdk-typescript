# Contributing to Todoist SDK

The following is a set of guidelines for contributing to the Todoist SDK. Please read these guidelines before creating an issue or pull request.

## Open Development

All work on Todoist SDK happens directly on [GitHub](https://github.com/todoist/todoist-sdk-typescript). Both core team members and external contributors send pull requests that go through the same review process.

## Semantic Versioning

Todoist SDK follows [semantic versioning](https://semver.org/). We release patch versions for bugfixes, minor versions for new features or non-essential changes, and major versions for any breaking changes.

Historical changes are documented in [CHANGELOG.md](CHANGELOG.md); current release notes are retained in the GitHub release record.

## Branch Organization

Submit all changes to the [main](https://github.com/todoist/todoist-sdk-typescript/tree/main) branch (via PR) by default. For pre-release work, target the `next` branch instead — see [Release Process](#release-process-core-team-only) for details.

We do our best to keep `main` in good shape, with all tests passing.

## Development Workflow

After cloning the repository and installing dependencies with `npm install`, several commands are at your disposal:

- `npm run build`: Builds the package for publishing to npm
- `npm run check`: Validates code quality with oxlint and formatting with oxfmt
- `npm run check:fix`: Auto-fixes lint and formatting issues
- `npm run type-check`: Type-checks the source the build compiles, without writing `dist/`, and the agent tooling in `.agents/scripts/`
- `npm test`: Runs all tests with Vitest
- `npm run test:watch`: Runs tests in watch mode
- `npm run integrity-checks`: Runs the full CI validation pipeline (lint, test, build, type checks)
- `npm run verify`: Runs every check CI runs, in parallel, in about twenty-five seconds; run it before opening a pull request

`npm install` also installs the git hooks, run by [lefthook](https://github.com/evilmartians/lefthook) and configured in `lefthook.yml`: commits and pushes to `main` are refused, `pre-commit` lints and formats the staged files and runs the type check, and `pre-push` runs the tests. [`docs/agents.md`](docs/agents.md) explains them.

## Sending a Pull Request

Before submitting a pull request, please take the following into consideration:

- Create your branch from `main` (or from `next` if working on a pre-release feature)
- Follow the [Commit Message Guidelines](#commit-message-guidelines) below
- Add tests for code that should be tested
- Ensure the test suite passes
- Do not override built-in validation and formatting checks

## Commit Message Guidelines

### Commit Message Format

This repository expects all commit messages to follow the [Conventional Commits Specification](https://www.conventionalcommits.org/) to automate semantic versioning and changelog generation.

Each commit message consists of a **header**, an **optional body**, and an **optional footer**:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Commit types such as `feat:` and `fix:` affect versioning and changelog generation. Other types like `build:`, `chore:`, `ci:`, `docs:`, `perf:`, `refactor:`, `style:` and `test:` are valid but will not trigger a release.

A commit that has the text `BREAKING CHANGE:` at the beginning of its optional body or footer, or appends a `!` after the type/scope, introduces a breaking API change (correlating with `MAJOR` in semantic versioning).

### Semantic Pull Request Validation

PR titles are validated against the Conventional Commits format by CI. When squash-merging, the PR title becomes the commit message, so ensure it follows the format (e.g., `feat: add new endpoint`, `fix: correct pagination`).

## Release Process (core team only)

[semantic-release](https://github.com/semantic-release/semantic-release) analyzes Conventional Commits on `main` (stable) and `next` (prerelease), keeping the existing `v${version}` tag lineage. A merge runs `.github/workflows/release.yml` to verify, build and retain one artifact. It does not publish packages or create a release.

An authorized maintainer uses `.github/workflows/publish-release.yml` to publish those original bytes to npm and GitHub Packages, then complete the matching release record. Publication and retries require the protected `npm-release` environment. See [the release runbook](docs/releases.md) for first publication, registry routing, recovery and exact setup.

### Pre-releases

Merge current `main` into `next` before new prerelease work, preserving Git history. The pack workflow requires the selected source to descend from current `main`. Open feature PRs against `next`; their normal Conventional Commits determine versions such as `17.1.0-next.1`. Publish the retained artifact with the `next` dist-tag; prereleases cannot use `latest`. Promote changes through a reviewed forward merge to `main`, which computes a stable version. Do not rebuild or publish the historical old-scope `next` line for this migration.

The GitHub release retains generated notes, the tarball and `release.json`; a published, complete record establishes the next semantic-release baseline. `CHANGELOG.md` keeps its historical contents. The pack step sets the published version in a disposable package directory; `package.json` in source is no longer rewritten by a release bot. Neither retries nor recording create release commits or bump versions again.

### Installing a pre-release

```sh
npm install @todoist/todoist-sdk@next
```

## License

By contributing to Todoist SDK, you agree that your contributions will be licensed under its [MIT license](LICENSE).
