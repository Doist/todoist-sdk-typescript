# Agent Guidelines

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
