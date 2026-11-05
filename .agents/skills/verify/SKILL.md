---
name: verify
description: Proves a change works before it is called done, and reports the evidence on a ladder from "said" to "ran". Use when you are about to say "done", "fixed", "works" or "ready", when asked to check or test a change, or before opening a pull request.
---

# Verify a change

## 1. Run the checks

```bash
npm run verify
```

It runs every check CI runs (about twenty seconds) and records the pass. Fix every failure; never weaken a check to pass it. Done when it prints `Verified.`, or says only docs changed and only their formatting was checked.

## 2. Prove the change itself

The checks prove nothing broke. Now prove the change does what was asked, with the proof its kind needs:

| Change                                                    | Proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `TodoistApi` method or its sub-client in `src/clients/` | A test in the method's `src/todoist-api.<area>.test.ts` that answers the request with msw, asserts the returned value and, for a write, the request sent (`getLastRequest()` or a captured body). Undo the change once and see it fail.                                                                                                                                                                                                                                                                                                                                                                              |
| A schema or type in `src/types/`                          | A test that feeds the API's raw JSON through the method that parses it and asserts the result, including the case the change is about: a new field, a `null`, an unknown value.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| A helper in `src/utils/` or `src/authentication.ts`       | A test next to it that calls the export.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| The transport (`src/transport/`: retries, dispatcher)     | Its own tests (`fetch-with-retry.test.ts`, `http-dispatcher.test.ts`), which opt out of the transport seam the other tests share.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The public API (exports, types)                           | `npm run verify` type-checks it and runs `attw` on the packed package. To see an export as a consumer does, after `npm run build`: a value with `node -e "import('./dist/esm/index.js').then((m) => console.log(typeof m.Name))"`, and a type-only export, which node sees as `undefined`, with a scratch file that does `import type { Name } from './dist/types/index.js'`, checked by `npx tsc --noEmit --strict --skipLibCheck --module nodenext` on that file. A change consumers feel: `npm run build && npm pack`, install the tarball in a project that uses the SDK, and run its checks. Say which project. |
| Behaviour against the real API                            | `npm run api:request`, with a test account token in `.env`, and the response quoted. Tests answer requests with msw, so the real API is only **seen** this way; say so if you didn't.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Agent tooling (`.agents/scripts`)                         | Its tests in throwaway repos, plus one real run of the hook or command.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Docs only                                                 | Every path and command named exists (`ls`, `npm run`). For `website/`, the docs site build (`npm ci && npm run build` in `website/`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Check the proof can fail: undo the change and see the test fail, or run the scenario that used to break. Done when you have seen it fail and then pass. A refactor is the exception: its proof is the pinned tests passing before and after (see `refactor`).

## 3. Report the evidence

Rate every claim on this ladder:

1. **said:** stated without looking.
2. **cited:** the line that shows it (`path:line`).
3. **traced:** followed the code path through each call.
4. **ran:** a test or command executed the code and showed the result.
5. **seen:** observed against the real API, or in a project built against this change.

Claims about behaviour ("fixed", "works", "safe", "no regressions") need **ran** or higher. A fact the code shows needs **cited**. Anything lower goes under **Not verified**, with why.

Everything `src/index.ts` exports is code other projects rely on. For a change to one, name the one fact that makes it safe for them, and how you proved it.

Report format:

```
What changed: <one line>
Verified:
- <claim> — ran: <command or test>, <what it showed>
Not verified:
- <claim> — <why>
Safe because: <the one fact>, <how you proved it>   (for a change to an export)
```
