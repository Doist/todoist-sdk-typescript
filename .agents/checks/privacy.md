# Check: privacy and secrets

This repository is public, and the npm package ships `dist/` to every consumer. The docs site in `website/` is public too.

## Report

- A secret, API token, client secret or password, even an expired one.
- Real user data in fixtures, tests or docs: real names, emails, task content, or Todoist IDs copied from an account, including a response pasted from `npm run api:request`.
- Personal identifiers in docs and examples: real emails, usernames, home-directory paths, local repository names. Use placeholders (`alice@example.com`, `~/code`).
- Internal details: private hostnames, internal URLs, staging servers, Doist-internal tools or documents.
- A new path in `package.json#files` that should not be published.
- Untracked files the change doesn't need, such as logs, scratch files or a pasted API response. Gitignored files (`.env`, `.tmp/`) never reach a review; flag one only if the change adds it with `git add -f` or removes it from `.gitignore`.

## Fine

- Made-up fixtures (`src/test-utils/test-defaults.ts`, `example.com`, "This is a task").
- Public URLs: `todoist.com`, `api.todoist.com`, the public API reference, GitHub.
- `TODOIST_API_BASE_URL` documented as an option, without a private value.
