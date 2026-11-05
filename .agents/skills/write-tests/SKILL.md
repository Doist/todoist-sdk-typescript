---
name: write-tests
description: Writes or changes tests in this repository to its quality bar, with the right helpers and layer. Use when adding, fixing or reviewing tests, when a change "needs a test", or when deciding whether a test may change.
---

# Write tests

## Where tests live

- Next to the code: `src/utils/colors.ts` → `src/utils/colors.test.ts`. `TodoistApi` methods are tested by area in `src/todoist-api.<area>.test.ts`. Vitest, globals on, `clearMocks: true`.
- `TodoistApi` tests build the client with a fake token, answer each request with msw (`server.use(http.get(url, resolver))`, the URL built from `getSyncBaseUri()` and the constants in `src/consts/endpoints.ts`), and assert the returned value and the request sent. msw fails any request no handler answers.
- Every test runs through two setup files: `src/test-utils/msw-setup.ts` starts the msw server, and `src/test-utils/transport-seam.ts` routes requests through the global `fetch` so msw sees them. Only the transport's own tests opt out of the seam.
- `TodoistApi` tests import it from `.` (`src/index.ts`) or `./todoist-api`; other tests import the module under test directly.
- Agent tooling tests live in `.agents/scripts/` and run copies of the tools in throwaway repos (`.agents/scripts/lib/test-repo.ts`).

## Helpers

From `src/test-utils/` (never shipped): `server`, `http`, `HttpResponse`, `getLastRequest`, `captureRequest`, `mockApiResponse`, `mockApiError` for the mocked API; fixtures such as `DEFAULT_AUTH_TOKEN`, `DEFAULT_TASK`, `DEFAULT_PROJECT`, `DEFAULT_LABEL` and `DEFAULT_USER` from `test-defaults.ts`; `rawTask`, `envelope` and `sign` for webhook payloads; `assertInstance` to narrow a caught error; `createObsidianFetchAdapter` for the custom fetch tests. Use them instead of hand-rolling entities or request capture. A new entity gets its fixture in `test-defaults.ts`.

## The quality bar

Read [references/test-rules.md](references/test-rules.md) before writing or reviewing a test. In short: a test counts only if it can fail. It asserts outcomes, takes expected values from outside the code under test, mocks only real boundaries, and you saw it fail once.

Done when each new test has failed once for the right reason, and then passes.

## When an existing test may change

- **The behaviour changed on purpose** (a feature or a fix): change the assertions that describe it, and say which in the report.
- **A refactor:** only how the test reaches the code (imports, names, call sites). Never its inputs or assertions, including the requests it expects.
- **Never** to make a failing check pass without a behaviour change: no `.skip`, no deleted test, no looser matcher (`toEqual` → `toMatchObject`, exact arguments → `toHaveBeenCalled()`).
