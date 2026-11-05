# Agent Guidelines

The official TypeScript SDK for the Todoist API, published to npm as `@doist/todoist-sdk`. ESM-only, Node ≥ 24, `zod` v4 for response validation.

## Definition of done

- **Done means proven:** a test that failed before the change and passes after, at the public interface (a `TodoistApi` method or an export, against the API mocked with msw), or a real call (`npm run api:request`, on a test account). For a refactor: tests that pin the behaviour, passing before and after. Reading code or a passing compile is not proof.
- **Run `npm run verify` before calling a change done.** It runs every check CI runs, in about twenty-five seconds, and records the pass. It prints what it cannot see, and when only docs changed it checks just their formatting.
- **Never weaken a check to pass it.** Don't skip, delete or loosen tests, edit lint, type or test config to get green, or use `--no-verify`. If a check looks wrong, say so and stop.
- **Report honestly:** what ran, what it showed, and what you did not verify.

## Skills

Use the matching skill without being asked. They live in `.agents/skills/` (Claude Code reads them through `.claude/skills/`).

- `verify`: before saying a change is done, fixed or ready.
- `fix-bug`: something is broken or wrong.
- `build-feature`: a new method, endpoint, option or behaviour.
- `refactor`: changing structure without changing behaviour. Other tasks send restructuring here, as a separate change.
- `write-tests`: writing or changing tests; `.agents/skills/write-tests/references/test-rules.md` is the quality bar.
- `learn`: after a correction, to turn it into a check.
- `review-changes`: when the owner says a change is ready for a PR, or asks for a review.

## Review checks

Reviewers, Doistbot included, apply these to every change:

- [Tests](.agents/checks/tests.md): not weakened, new behaviour tested.
- [Architecture](.agents/checks/architecture.md): rules lint can't express.
- [Security](.agents/checks/security.md): the API token, OAuth secrets, webhook signatures.
- [Privacy and secrets](.agents/checks/privacy.md): this repository is public.
- [Public API](.agents/checks/public-api.md): what consumers see, and the version bump it needs.
- [Evidence](.agents/checks/evidence.md): claims backed by what ran.

## Commands

```bash
npm run build             # compile src/ to dist/ (tsconfig.esm.json), then fix the import paths
npm run type-check        # tsc --noEmit for what the build compiles, and for the agent tooling
npm run check             # oxlint + oxfmt --check
npm run check:fix         # oxlint --fix + oxfmt
npm test                  # vitest run
npm run integrity-checks  # what CI runs: clean, check, type-check, test, build, attw
npm run verify            # every CI check at once, with a recorded pass; run it before a PR
```

## Layout

- `src/index.ts` is the public API: everything it re-exports ships to every consumer.
- `src/todoist-api.ts` holds `TodoistApi`, with the user-facing JSDoc for every method. Most methods delegate to an internal sub-client in `src/clients/` (`label-client.ts` and so on), which calls `request` from `src/transport/http-client.ts` and validates the response; `sync` goes through `src/transport/sync-request.ts`.
- `src/types/<area>/` holds the Zod schemas and the types derived from them (`src/types/<area>/types.ts`) and the request and response shapes (`src/types/<area>/requests.ts`). `src/consts/endpoints.ts` holds the endpoint paths.
- `src/authentication.ts` holds the OAuth helpers; `src/utils/` the helpers, some exported through `src/utils/index.ts`.
- Tests sit next to the code. `TodoistApi` tests are `src/todoist-api.<area>.test.ts`, with the API mocked by msw (`src/test-utils/msw-setup.ts`) and fixtures from `src/test-utils/test-defaults.ts`.

## Git hooks and agent tooling

- Commits and pushes to `main` are refused by the git hooks. Work on a branch.
- Agent tooling lives in `.agents/scripts/`, apart from the build and maintenance scripts in `scripts/`. It never ships: `package.json#files` lists only `dist/`, and a test checks the packed tarball.
- How it all fits together: [`docs/agents.md`](docs/agents.md).

## String Union Types

When defining a string union type, always derive it from a `const` array with `as const`. This gives you both a runtime array and a type from a single source of truth.

### Pattern

```ts
export const EXAMPLE_VALUES = ['a', 'b', 'c'] as const
export type ExampleValue = (typeof EXAMPLE_VALUES)[number]

// If used in a Zod schema:
z.enum(EXAMPLE_VALUES)
```

### Rules

- **Naming**: `SCREAMING_SNAKE_CASE` for const arrays, `PascalCase` for types
- **Export**: Always export const arrays and types
- **Chaining**: Never put `.nullable()` or `.optional()` on the const array — chain those on the schema after `z.enum()`
- **Placement**: Place the const array and type immediately above the first usage
- **Reuse**: If the same values appear in multiple files, define the const array once and import it elsewhere
- **JSDoc**: Add a brief JSDoc comment to both the const array and the derived type so IDE hover shows documentation on each

### Exception: Discriminated unions with `z.literal()`

When the same string values are used as `z.literal()` discriminators across multiple schemas (e.g. in a discriminated union where each variant has its own schema), use an `as const` enum-like object as the single source of truth, then derive the array from it:

```ts
export const ExampleTypeEnum = {
    Foo: 'foo',
    Bar: 'bar',
} as const
export const EXAMPLE_TYPES = [ExampleTypeEnum.Foo, ExampleTypeEnum.Bar] as const
export type ExampleType = (typeof EXAMPLE_TYPES)[number]

// In schemas:
z.literal(ExampleTypeEnum.Foo)
```

This avoids duplicating string literals across multiple `z.literal()` calls and type definitions. See `ReminderTypeEnum` for a real example.

## Zod Schemas

- **Export**: All Zod schemas should be exported
