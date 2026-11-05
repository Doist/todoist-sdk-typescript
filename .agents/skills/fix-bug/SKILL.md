---
name: fix-bug
description: Fixes a bug by reproducing it in a failing test first, then making the smallest change that turns it green. Use when something is "broken", "wrong", "fails", "doesn't work", throws an error, or a user, an issue or a project that uses the SDK reports a bug.
---

# Fix a bug

## 1. Restate the symptom

Write down what happens, what should happen, and what triggers it: the SDK call, its arguments, and the API response that shows the bug. A report from a project that uses the SDK needs the call into the SDK, not only that project's symptom. If the report is vague, restate it to the owner and ask before going further. Done when the symptom fits in one sentence.

## 2. Reproduce it in a test

Write a test that fails on the exact symptom, at the lowest layer that shows it:

- a `TodoistApi` method → its `src/todoist-api.<area>.test.ts`, with msw answering the request with the response that triggers the bug;
- a response the SDK rejects or misreads → the API's raw JSON in the msw handler, and the parsed result asserted;
- a helper → its `*.test.ts` next to it, calling the export;
- retries, timeouts or the HTTP dispatcher → the tests in `src/transport/`.

Follow `write-tests` for helpers and the quality bar. Run the test and see it fail **for the reason in step 1**, not a typo or a missing handler. Done when the failure message describes the bug.

## 3. Find the root cause

Trace from the symptom to the first place the data goes wrong. Name it with `path:line`. A fix at the symptom (a special case, a retry, a try/catch) is not a root cause. Done when you can say why the code does what it does.

## 4. Make the smallest fix

Change only what the root cause needs. Note other bugs you find for a separate fix; don't fix them here. Restructuring goes to `refactor`, as its own change. If the fix changes a public type or a value consumers rely on, say so: it may need a breaking-change title.

## 5. Prove the fix is needed

Undo the fix: the test fails. Restore it: the test passes. Then `npm run verify`. Done when you have seen both and verify prints `Verified.`

## When it doesn't work

After three fixes that didn't turn the test green, stop. Your model of the bug is wrong. Re-read the failing output, question the test, and list what you have ruled out before trying again. Tell the owner if you're stuck.

## Report

Use the `verify` report format. Include the test name, the root cause line, the undo/restore result, and whether the fix was checked against the real API (`npm run api:request`).
