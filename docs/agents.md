# Working with coding agents

This repository is set up so coding agents prove their work before they call it done. This page explains the parts, what each one guarantees, and where it stops. It grows as each part lands.

## Layers

1. **Git hooks** run for everyone, people and agents alike, on every commit and push.
2. **`npm run verify`** runs every CI check locally and records a pass.
3. **`AGENTS.md`** tells agents what done means. Claude Code reads it through `CLAUDE.md`; Codex and other agents read it directly.
4. **Skills** in `.agents/skills/` give step-by-step procedures for recurring work. They load only when a task needs them.
5. **Review**: fresh reviewers and Doistbot check a finished change against the checks in `.agents/checks/`.

## Rules and what holds them

| Rule                                                                                                              | Held by                                                                         | Certainty                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------- |
| No commits on `main`                                                                                              | `pre-commit` and `commit-msg` → `.agents/scripts/branch-guard.sh`               | Enforced locally; `--no-verify` skips it |
| No pushes to `main`                                                                                               | `pre-push` → `branch-guard.sh`; the "Protect default branch" ruleset            | Enforced on GitHub                       |
| Committed files are linted and formatted                                                                          | `pre-commit` (lefthook, staged files only); CI                                  | Checked in CI                            |
| Type check passes before a commit                                                                                 | `pre-commit`; CI                                                                | Checked in CI                            |
| Tests pass before a push                                                                                          | `pre-push`; CI                                                                  | Checked in CI                            |
| Agent tooling never ships in the npm package                                                                      | `.agents/scripts/package-contents.test.ts`                                      | Checked in CI                            |
| `npm run verify` runs what CI runs                                                                                | `.agents/scripts/lib/steps.test.ts` compares it with the pull-request workflows | Checked in CI                            |
| Run `npm run verify` before calling work done                                                                     | `AGENTS.md`                                                                     | Asked                                    |
| Never weaken a check to pass it                                                                                   | `AGENTS.md`                                                                     | Asked                                    |
| Instructions name only files, links and scripts that exist                                                        | `.agents/scripts/instructions.test.ts`                                          | Checked in CI                            |
| Every skill says when to use it and is linked for Claude Code                                                     | `.agents/scripts/instructions.test.ts`                                          | Checked in CI                            |
| Use the matching skill for each task                                                                              | `AGENTS.md`                                                                     | Asked                                    |
| Tests meet the quality bar                                                                                        | `.agents/skills/write-tests/references/test-rules.md`                           | Asked                                    |
| Review checks say what to report and what is fine, and AGENTS.md links them                                       | `.agents/scripts/instructions.test.ts`                                          | Checked in CI                            |
| A finished change gets a task review, a blast-radius review when public or shared code changed, and a code review | `review-changes` skill                                                          | Asked                                    |
| Reviewers never edit the shared checkout                                                                          | the reviewer brief; `npm run review:worktree` gives them their own              | Asked                                    |

"Checked in CI" means every pull request runs it (`.github/workflows/CI.yml`) and shows the result. The rulesets on `main` require a pull request but not a passing CI run, so a red run is a warning to heed, not a lock. A local hook alone is a speed bump: `git commit --no-verify` skips it.

## Git hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs the hooks, configured in `lefthook.yml`. `npm install` installs them into `.git/hooks` on every install, through the `prepare` script, which runs `lefthook install --reset-hooks-path` before the build it always ran, so a hook added to `lefthook.yml` reaches existing clones. Outside a git checkout, as when npm installs this package from a GitHub tarball, it skips the install and only builds. Lefthook refuses to install or sync hooks while `core.hooksPath` is set locally; the reset removes that setting.

- **`pre-commit`** refuses a commit on `main`, then lints the staged files `npm run check` lints (`src/` and `.agents/scripts/`), formats every staged file `oxfmt` handles (re-staging what the tools fix), and runs the type check. Unstaged changes in a partly staged file are left alone.
- **`commit-msg`** refuses a commit on `main` again. Lefthook runs no pre-commit job when nothing is staged, so without it an empty commit would get past.
- **`pre-push`** refuses a push to `main`, then runs the tests. It checks `git push --dry-run` too.
- If node is not on `PATH` (some GUI git clients), both hooks still apply the branch rule, skip the checks, and say so. CI runs the same checks.
- The default branch is read from `origin/HEAD`, falling back to `main`. Pushes to `next`, the pre-release branch, are allowed: syncing it with `main` is a direct push.

The release workflow commits and pushes to `main` from GitHub Actions, and `npm ci` runs `prepare` there, which installs the hooks. The release step sets `LEFTHOOK=0`, so semantic-release's commit and push run no hooks: every check already ran on the pull request. The guard also skips itself when `GITHUB_ACTIONS=true`, in case another workflow commits with the hooks on. That is the one exemption. Branch protection on GitHub is the real enforcement; the hooks only catch mistakes early.

## `npm run verify`

One command, every check the pull-request workflows run (`CI.yml`, `validate-docs.yml`): lint, format, both type checks, the build, all tests and the package check (`attw`), all of `npm run integrity-checks`. It takes about twenty-five seconds, so it always checks the whole tree. Picking only the affected tests would save a few seconds and add a way to miss something.

- **Before the checks** it stops if Node is older than `package.json` requires, or if `node_modules` does not match the lockfile in either direction, transitive dependencies included (npm's own record of what it installed, `node_modules/.package-lock.json`, against `package-lock.json`): a package still installed after the lockfile dropped it counts too. Both make checks fail, or pass, for reasons unrelated to your change. The Node check runs first, in `.agents/scripts/verify.mjs`, plain JavaScript, so an older Node gets that message instead of failing on the `.ts` extension.
- **Only docs changed** since the branch left `main`: it runs only the format check, since `oxfmt` formats Markdown and YAML too, and records nothing. The agent instructions (`AGENTS.md`, `docs/agents.md`, `.agents/`) count as code, since a test checks every reference in them. Deleting or renaming a doc counts as code too, since the agent docs may name it; adding one after a pass means running verify again.
- **Only files CI alone reads changed** (the docs site in `website/` and `tsconfig.docs.json`, Renovate, `.github/` config other than workflows): it runs only the format check and says CI is the only other check for them. Every workflow counts as code, since a local test compares verify with the two above and checks no other workflow runs commands on pull requests.
- **The docs site build** (`validate-docs.yml`) is the one CI check verify leaves out: it needs its own install in `website/` and takes over a minute. Verify names it after every pass. Run `npm ci && npm run build` in `website/` when a change touches TSDoc comments or the site.
- **Order:** lint, format, both type checks and the build start together. The tests wait for the build, since it starts by deleting `dist/` and the package-contents test packs the checkout. `attw` packs the fresh `dist/` without npm's scripts: in CI its `npm pack` runs `prepare`, which builds the same files again.
- **`CI=true`** is set for the build and the tests, as GitHub Actions sets it; with it, vitest fails on a stray `.only`. `TODOIST_API_TOKEN` and `TODOIST_API_BASE_URL` are removed, with a note, since CI never sets them: a real token never reaches the checks.
- **Output:** one line per step. A failing step prints the last 30 lines of its log and the log's path under `.tmp/agents/logs/`.
- **The record:** after a full pass it writes a content hash of every file local checks read (not docs, not CI-only files) to `.tmp/agents/verified.json` (gitignored). A run that fails, or sees files change while it runs, deletes it.
- **Platforms:** macOS, Linux and WSL. Like the git hooks, it assumes a POSIX shell and runs npm's POSIX launchers in `node_modules/.bin`; on native Windows, run it in WSL.
- **What it cannot see:** the docs site build, the real Todoist API, the projects that depend on this package, and the other Node version CI tests on. It prints these after every run that passes, docs-only ones included.

If a pull-request workflow gains a step, `.agents/scripts/lib/steps.test.ts` fails until verify gains it too, or says why it can't.

## Skills

Each skill is a short procedure with a check at the end of every step. Agents load one when the task matches its description.

| Skill            | For                                         | Ends with                                                                                     |
| ---------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `verify`         | Any change about to be called done          | `npm run verify`, proof matched to the change, an evidence report                             |
| `fix-bug`        | Something broken                            | A test that failed on the symptom, the root cause, undo/restore                               |
| `build-feature`  | A new method, endpoint, option or behaviour | Decisions settled up front, test-first slices, a "touches X" map                              |
| `refactor`       | Structure changes, behaviour unchanged      | Pinned tests, no changed test inputs or assertions                                            |
| `write-tests`    | Writing or changing tests                   | Tests that failed once, meeting the test rules                                                |
| `learn`          | A correction from you                       | A type, lint rule, test or script check that catches the mistake                              |
| `review-changes` | A change you say is ready                   | Task, blast-radius and code reviews; each finding fixed, dismissed with evidence or left open |

The evidence report rates each claim: **said**, **cited** (a line), **traced** (followed the code), **ran** (a test or command executed it), **seen** (against the real API, or in a project built against the change). "Fixed" or "safe" needs **ran**. Anything less is listed under "Not verified".

The test rules were measured against this repository's tests first, so they accept the patterns that are fine here: msw handlers for every request, a partial match on a captured request body when one field is the point, `toBeDefined()` as a guard, `.not.toHaveBeenCalled()` for a call that must not happen, and fake timers for the retry clock. There are no snapshot tests, and the rules keep it that way. They also note that no check type-checks the test files, so a `@ts-expect-error` contract needs a runtime assertion beside it.

## Review

When you say a change is ready, the agent runs `review-changes`:

- **Task review:** a fresh subagent gets your request in your words, what done means and the decisions made, never the author's reasoning. It looks for what is missing or unrequested. Doistbot can't do this, since it never sees the task.
- **Blast-radius review:** when anything reachable from `src/index.ts` changes, or a schema in `src/types/`, the transport, dependencies, the Node engine or build config. It names the one fact that makes the change safe for the projects that depend on this package, and proves it by running code: a build packed with `npm pack` and installed in one of them, or a real call on a test account for a schema change.
- **Code review:** Doistbot locally (`doistbot review --json`, or `--base <branch below>` in a stack) when version 1.0.12+ is installed and `doistbot doctor` passes. Otherwise one subagent per check in `.agents/checks/`. Doistbot reads `AGENTS.md` and its links, so the checks apply to its pull request reviews too.

Findings are fixed, dismissed with evidence (a line or a test run, never an argument), or left open for you. Before any review, the diff and every untracked file are checked for tokens and personal data. Reviewers that need to run code get their own worktree from `npm run review:worktree -- <dir>`; the shared one stays read-only.

The checks cover tests, architecture, security, privacy, the public API and evidence. The public API check holds what consumers rely on: the exports and their types, what each method sends and returns, the Node engine and `package.json#exports`, and whether the PR title asks for the version bump the change needs. Two kinds Doist uses elsewhere don't apply here: there are no translations and no database migrations.

A review costs several agent runs, so it runs when you ask, not on every change. A Doistbot run with a failed provider (`providerFailures`) is partial; the agent should say so.

## How to ask an agent

Give it:

- **the goal**, in a sentence;
- **a done check** that can pass or fail ("`getLabels({ limit: 5 })` sends `limit=5` and returns `nextCursor`");
- **the proof you want** (a failing test first, a real `npm run api:request` call, a build tried in a project that uses the SDK);
- **facts you know** and **real constraints** (a deadline, an export that must not change).

Leave out the method and your theory of the cause. For a vague report, ask the agent to restate it first. Start a new session for unrelated work.

| To start…  | Say                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| a bug fix  | "Fix: <symptom>. Call: <method and arguments>. Expected: <x>." (`fix-bug`)                                         |
| a feature  | "Add <behaviour>. Done when <check>." (`build-feature`)                                                            |
| a refactor | "Refactor <area> so <what gets easier>." (`refactor`)                                                              |
| a review   | "Ready for a PR." (`review-changes`)                                                                               |
| a release  | "Ready to release." Check the PR title type: `feat:`, `fix:`, `perf:` and breaking changes publish; others do not. |

Your part: answer the decision questions, and read the evidence report, especially "Not verified".

## Where the tooling lives

- `.agents/scripts/` holds scripts and their tests, next to the skills, apart from the build and maintenance scripts in `scripts/`. It never ships: `package.json#files` lists only `dist/`, and `.agents/scripts/package-contents.test.ts` checks the packed tarball.
- Skills live in `.agents/skills/`, where Codex reads them. Claude Code reads them through the symlinks in `.claude/skills/`; a test keeps the two in step.
- The tooling runs straight from TypeScript with Node's type stripping, so it only uses erasable syntax (`.agents/scripts/tsconfig.json` enforces this). `npm run type-check` covers it, and `npm run check` lints it, both part of `npm run integrity-checks`.
- Tests run in `npm test` and CI. They copy the tools into throwaway git repositories and never touch your checkout. A test helper clears the variables git exports to hooks, since `npm test` itself runs inside `pre-push`.

## Releases

semantic-release publishes from `main` on every merge, and a pre-release from `next`. The squash-merged PR title decides whether anything ships: `feat:`, `fix:`, `perf:` and any breaking change (`!`) release; `chore:`, `ci:`, `docs:`, `test:` and `refactor:` do not. Changes to the agent tooling use `chore:` or `ci:`, so they never publish a new version. No path filter is needed.

## What fails open

- No node on `PATH` in a GUI client: the hooks skip lint, the type check and the tests, with a message. The branch rule still applies.
- `git commit --no-verify`: every local hook is skipped. CI and branch protection still apply.
- Worktrees share the hooks in `.git/hooks`, so the branch rule works in a new worktree at once. Lint, format, types and tests need `npm ci` in that worktree first. Without the lefthook binary anywhere the hooks look, they print "Can't find lefthook in PATH" and let the commit through.
