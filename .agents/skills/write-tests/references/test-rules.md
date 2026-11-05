# Test rules

Calibrated on this repository's tests (about 2,560 in `src/`, November 2026). Each rule says what to flag and what is fine, because a rule that flags good tests teaches agents to damage them.

## 1. It can fail

You saw the test fail once: before the fix, or with the feature undone. A test that has never failed may be testing nothing.

A `@ts-expect-error` line asserts something only when a type check reads it, and none does for test files: `npm run type-check` covers what the build compiles, which leaves tests out. A type contract (`src/todoist-api.projects.test.ts:40`) needs a runtime assertion too, or it proves nothing today.

## 2. It asserts outcomes

Assert what the caller gets or what reaches the API: the returned value, the request sent (URL, method, headers, body), `toHaveBeenCalledWith(<exact args>)`, the error thrown. Flag an assertion that cannot tell right from wrong.

| Flag                                                                                                 | Fine                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toHaveBeenCalled()` as the only evidence the behaviour happened: nothing checks arguments or output | `toHaveBeenCalled()` next to assertions on the arguments (`src/transport/fetch-with-retry.test.ts:237`)                                                                                         |
|                                                                                                      | `.not.toHaveBeenCalled()`: proves a call did **not** happen, such as the global `fetch` when a paired transport is in use (`src/transport/fetch-with-retry.test.ts:88`)                         |
| `toBeDefined()` as the last word on a value                                                          | The same as a guard right before reading the value's fields (`src/todoist-api.uploads.test.ts:54`)                                                                                              |
| `toMatchObject` or `objectContaining` where the point of the test is the whole value                 | `toMatchObject` on a captured request body when the test is about one field being sent (`src/todoist-api.projects.test.ts:155`); `objectContaining` for the `fetch` options beside an exact URL |
| A test whose only assertion is that no error was thrown, when the behaviour is a result              | `not.toThrow()` when accepting the input **is** the behaviour (`src/utils/url-helpers.test.ts:121`)                                                                                             |

Judge a test by its point, the behaviour its name describes. A weak assertion beside the ones that carry that point is fine.

## 3. Expected values come from outside the code under test

Write the expected value out as literals (a lookup table or `it.each` rows are fine), or take it from the fixtures in `src/test-utils/test-defaults.ts`. Flag an expectation that calls the code under test, or recomputes the answer the way the code does, such as converting a fixture with the SDK's own case-conversion helper.

## 4. Mock only real boundaries

The boundary here is the HTTP API, mocked with msw: a handler per request (`server.use(...)`, 290 or so), and the transport seam in `src/test-utils/transport-seam.ts` that routes requests through the global `fetch` so msw sees them. Other boundaries: the file system (`vi.mock('fs')` in the upload tests), `uuid` for request ids (`src/transport/http-client.test.ts:9`), `undici` when simulating another runtime (`vi.doMock`, `src/transport/http-dispatcher.test.ts:113`), and a `customFetch` passed to `TodoistApi`. A real local HTTP server in the dispatcher tests is fine.

| Flag                                                                                     | Fine                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A **new** `vi.mock` of an internal module that holds logic, to make setup easier         | The boundaries above. Existing one-offs (`vi.mock('./utils/multipart-upload')` in the apps, templates, UI extension and workspace tests): tolerated, not a pattern to copy |
| A `vi.spyOn` or stub on a `TodoistApi` method or a sub-client, instead of an msw handler |                                                                                                                                                                            |
| Mocking the function the test is about, or one that computes its expected value          |                                                                                                                                                                            |

## 5. No skipped or focused tests

None exist. `.only` fails in CI (`CI=true`, which `npm run verify` sets too). Don't add `.skip`, `.todo` or `xit` to get green. Fine: `skipIf`/`runIf` for a platform or a missing tool, with the reason in a comment.

## 6. Fake timers only for the retry clock

Two tests use fake timers, both for retry and timeout delays (`src/transport/fetch-with-retry.test.ts:145`). Fine there, with `advanceTimersByTimeAsync` and the timers restored afterwards. Flag a real sleep that only hopes something has finished; await the promise or use `vi.waitFor`.

## 7. No snapshots

None exist: tests assert exact values, requests and errors. Keep it that way. A new snapshot records whatever the output is the first time it runs, so it proves nothing about what it should be.

## 8. Generated and contract tests

`src/utils/filter-queries.conformance.test.ts` is generated by `scripts/generate-filter-query-definitions.mjs` from Todoist's own cases: regenerate it, don't edit it by hand. A test that reads source or config to enforce a rule across the package is fine; flag one that reads a source file to check one function's behaviour, and call the function instead.

## 9. No real user data

Fixtures are made up: `test-defaults.ts`, `example.com`, fake tokens such as `DEFAULT_AUTH_TOKEN`. This repository is public. Never paste a real API response from your own account into a fixture without replacing its names, emails, IDs and content.
