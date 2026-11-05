# Check: architecture

Rules lint and types can't express. Most are written in `AGENTS.md`; report where a change works around one.

## Report

- A new `TodoistApi` method that builds its own request instead of delegating to its sub-client in `src/clients/`, or an endpoint path written inline instead of in `src/consts/endpoints.ts`.
- A response returned to the caller without passing its Zod schema (the `validate…` helpers in `src/utils/validators.ts`).
- A string union not derived from an exported `as const` array, or `.nullable()` or `.optional()` chained on the array instead of the schema ("String Union Types" in `AGENTS.md`); a Zod schema that isn't exported ("Zod Schemas").
- A static import of a Node-only module (`undici`, `fs`, `node:` built-ins) in code every runtime loads. The SDK also runs in browsers, React Native and Obsidian through `customFetch`; `src/transport/http-dispatcher.ts` and `src/utils/multipart-upload.ts` load theirs lazily.
- A new runtime dependency in `package.json`, which every consumer installs.
- `interface` for an object shape we own, where a `type` alias would do.
- A helper that duplicates one in `src/utils/`.

## Fine

- An exception documented next to the code, with the reason, such as `getUser` and `sync`, which `TodoistApi` handles itself.
- Internal helpers in `src/utils/` that `src/utils/index.ts` does not export.
