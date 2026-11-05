---
name: build-feature
description: Builds a new method, endpoint, option or behaviour in thin test-first slices, after settling the open decisions with the owner. Use when asked to "add", "build", "implement", "support" or "create" something, such as a new endpoint, a new `TodoistApi` method or a new field or option.
---

# Build a feature

## 1. Read the closest existing feature

Find the method most like the one you are building and read it end to end: its JSDoc in `src/todoist-api.ts`, its sub-client in `src/clients/`, its types in `src/types/<area>/`, its endpoint in `src/consts/endpoints.ts`, and its test (`src/todoist-api.labels.test.ts` for a plain REST resource). Read `AGENTS.md` ("Layout", "String Union Types", "Zod Schemas"), and the API reference the method's `@see` link points to. Done when you can name the method you will copy patterns from.

## 2. Settle decisions in one round

List what the request leaves open: the method's name and arguments, the endpoint (REST or a sync command), the request and response types, how strict the schema is (required or optional fields, `null`, unknown values), and whether the change is additive or breaking for consumers. Ask the owner all of them at once, each with your recommendation. Don't ask what the code or the API reference can answer. Done when every decision has an answer.

## 3. Write "done" as checkable behaviours

Write each behaviour as a call and the expected result, for example: "`api.getLabels({ limit: 5 })` sends `GET` to the labels endpoint with `limit=5` and returns the labels and `nextCursor`". Each becomes a test. Done when a test could pass or fail on every one.

## 4. Build in thin slices, test first

For each behaviour: write its test against the public interface (the `TodoistApi` method, with msw answering), see it fail, make it pass, run its test file. Follow `write-tests`. Done when every behaviour from step 3 has a passing test you saw fail.

## 5. Update everything the change touches

| You changed                          | Also update                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Added a `TodoistApi` method          | Its sub-client method, the endpoint in `src/consts/endpoints.ts`, and the JSDoc in `src/todoist-api.ts` with its `@see` link              |
| Added or changed a type or schema    | `src/types/<area>/` and `src/types/<area>/index.ts`, so `src/types/index.ts` exports it; the fixture in `src/test-utils/test-defaults.ts` |
| Added a string union                 | The `as const` array and derived type ("String Union Types" in `AGENTS.md`)                                                               |
| Added an export outside `src/types/` | `src/index.ts`, directly or through `src/utils/index.ts`                                                                                  |
| Changed behaviour users read about   | `README.md` and the guides in `website/docs/`                                                                                             |
| Made a breaking change               | A `feat!:` or `fix!:` title, and the "Migration Guide" in `README.md`                                                                     |

Done when each row that applies is handled.

## 6. Verify and report

Follow `verify`. A new endpoint deserves one real call (`npm run api:request`, on a test account) showing the response the schema was written for. If the feature needs restructuring first, do that as a separate change with `refactor`.
