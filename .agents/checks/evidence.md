# Check: evidence

Apply to the PR description and any report from an agent.

## Report

- A behaviour claim ("fixed", "works", "safe", "no regressions") with no test or command that ran it.
- A "Not verified" section missing when something could not be checked: the real Todoist API, the docs site build, the projects that depend on this package, the other Node version CI tests on.
- A change to a public export or response type without the one fact that makes it safe for consumers, or a new endpoint whose schema was never checked against a real response (`npm run api:request`).
- A PR title whose type doesn't match the change: behaviour changes need `feat:`, `fix:` or `perf:` to release (`!` for breaking); tooling, docs and pure restructuring use `chore:`, `ci:`, `docs:`, `test:` or `refactor:` so they don't.

## Fine

- Claims about what the code shows, with the cited line.
