# Check: public API

What consumers see: everything reachable from `src/index.ts` (`TodoistApi` and its methods, the authentication helpers, the types and Zod schemas, the exported utilities), with its names, signatures, argument and response types, defaults, errors and behaviour, plus the Node engine, the peer dependency on `type-fest`, and `package.json#exports`. Consumers include Doist's own projects (todoist-mcp, todoist-cli) and third-party code. semantic-release reads the PR title to pick the version.

## Report

- A renamed or removed export, method, argument or response field, a narrowed argument type, a widened response type, a schema that now rejects data it accepted, or a changed default, without a breaking-change PR title (`feat!:`, `fix!:`).
- A raised Node engine, a raised `type-fest` peer range, or a changed `package.json#exports`, without a breaking-change title.
- A new method or option in a `fix:` PR, or a behaviour fix in a `feat:` one: the title sets the version bump.
- A change in what a method sends to the API (path, method, body or query keys) without a test that pins the request.
- A public method without JSDoc, or JSDoc that no longer matches what the method does.
- `README.md` or the guides in `website/docs/` out of step with the change.

## Fine

- New exports, methods and optional arguments (additive) in a `feat:` PR.
- New optional fields in a response type, since the API may add fields at any time.
- Internal modules not reachable from `src/index.ts`.
