# Check: tests

Apply to every change that touches code or tests. The quality bar is `.agents/skills/write-tests/references/test-rules.md`.

## Report

- A test deleted, skipped (`.skip`, `.todo`, `xit`), or with an assertion loosened (`toEqual` → `toMatchObject`, exact arguments → `toHaveBeenCalled()`, an exact value → `objectContaining`), without a behaviour change that explains it.
- A new snapshot test, or fake timers outside the retry and timeout tests in `src/transport/`.
- New behaviour with no test, or a test that would still pass with the change undone.
- A `TodoistApi` test that stubs the method or its sub-client instead of answering the request with msw, a new `vi.mock` of an internal module that holds logic, or a mock of the function under test.
- An expected value computed by the code under test.
- A test that reaches the real API or another outside host instead of an msw handler.
- A type contract that rests on `@ts-expect-error` alone: no check type-checks the test files.
- Config that runs fewer tests: `vitest.config.ts` `include`, `exclude` or `setupFiles`, the scripts in `package.json`, the steps in `.github/workflows/CI.yml`.

## Fine

- `.not.toHaveBeenCalled()`, guards like `toBeDefined()` before reading a value, and a partial match on a captured request body when one field is the point, as the test rules describe.
- A test changing its assertions because the behaviour changed on purpose, when the description says so.
- A refactor changing import paths, names or call sites in tests.
- `skipIf` or `runIf` for an environment the test can't run in (a platform, root, a missing tool), with the reason next to it.
- A real server on `127.0.0.1`, with msw told to let its requests through, where the point is real bytes on the wire: the dispatcher's gzip test in `src/transport/http-dispatcher.test.ts`.
