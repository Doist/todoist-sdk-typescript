# Todoist SDK

The official TypeScript SDK for the Todoist REST API.

## Installation

Requires Node 20.18.1+.

```
npm install @doist/todoist-sdk
```

### Usage

An example of initializing the API client and fetching a user's tasks:

```typescript
import { TodoistApi } from '@doist/todoist-sdk'

const api = new TodoistApi('YOURTOKEN')

api.getTasks()
    .then((tasks) => console.log(tasks))
    .catch((error) => console.log(error))
```

### Documentation

For more detailed reference documentation, have a look at the [Todoist API v1 Documentation](https://todoist.com/api/v1/docs).

### Migration Guide

If you're migrating from an older version of the Todoist API (v9), please refer to the [official migration guide](https://todoist.com/api/v1/docs#tag/Migrating-from-v9) for detailed information about the changes and breaking updates.

Key changes in v1 include:

- Updated endpoint structure
- New pagination system
- Unified error response format
- Object renames (e.g., items → tasks, notes → comments)
- URL renames and endpoint signature changes

## Custom HTTP Clients

The Todoist API client supports custom HTTP implementations to enable usage in environments with specific networking requirements, such as:

- **Obsidian plugins** - Desktop app with strict CORS policies
- **Browser extensions** - Custom HTTP APIs with different security models
- **Electron apps** - Requests routed through IPC layer
- **React Native** - Different networking stack
- **Enterprise environments** - Proxy configuration, custom headers, or certificate handling

### Basic Usage

```typescript
import { TodoistApi } from '@doist/todoist-sdk'

// Using the new options-based constructor
const api = new TodoistApi('YOURTOKEN', {
    baseUrl: 'https://custom-api.example.com', // optional
    customFetch: myCustomFetch, // your custom fetch implementation
})

// Legacy constructor (deprecated but supported)
const apiLegacy = new TodoistApi('YOURTOKEN', 'https://custom-api.example.com')
```

### Custom Fetch Interface

Your custom fetch function must implement this interface:

```typescript
type CustomFetch = (
    url: string,
    options?: RequestInit & { timeout?: number },
) => Promise<CustomFetchResponse>

type CustomFetchResponse = {
    ok: boolean
    status: number
    statusText: string
    headers: Record<string, string>
    text(): Promise<string>
    json(): Promise<unknown>
}
```

### OAuth with Custom Fetch

OAuth authentication functions (`getAuthToken`, `revokeAuthToken`, `revokeToken`) support custom fetch through an options object:

```typescript
// New options-based usage
const { accessToken } = await getAuthToken(args, {
    baseUrl: 'https://custom-auth.example.com',
    customFetch: myCustomFetch,
})

await revokeToken(args, {
    customFetch: myCustomFetch,
})

// Legacy usage (deprecated)
const { accessToken } = await getAuthToken(args, baseUrl)
```

When the authorization server issues a `refreshToken`, use `refreshAuthToken`
to obtain a new access token once the current one expires, without sending the
user back through the authorization flow:

```typescript
const refreshed = await refreshAuthToken({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    refreshToken: storedRefreshToken,
})

// The server may rotate the refresh token — persist refreshed.refreshToken
// when present, otherwise keep using the previous one.
```

> **Note:** Refresh tokens are only issued to OAuth apps that have them enabled.
> This is on by default for new apps; legacy apps must opt in. Apps without
> refresh tokens receive a non-expiring access token, so `getAuthToken` returns
> no `refreshToken`/`expiresIn` and there is nothing to refresh.

### Important Notes

- All existing transforms (snake_case ↔ camelCase) work automatically with custom fetch
- Retry logic and error handling are preserved
- File uploads work with custom fetch implementations
- The custom fetch function should handle FormData for multipart uploads
- Timeout parameter is optional and up to your custom implementation

## Development and Testing

Instead of having an example app in the repository to assist development and testing, we have included [ts-node](https://github.com/TypeStrong/ts-node) as a dev dependency. This allows us to have a scratch file locally that can import and utilize the API while developing or reviewing pull requests without having to manage a separate app project.

- `npm install`
- Add a file named `scratch.ts` in the `src` folder.
- Configure your IDE to run the scratch file with `ts-node` (instructions for [VSCode](https://medium.com/@dupski/debug-typescript-in-vs-code-without-compiling-using-ts-node-9d1f4f9a94a), [WebStorm](https://www.jetbrains.com/help/webstorm/running-and-debugging-typescript.html#ws_ts_run_debug_server_side_ts_node)), or you can optionally run ts-node in a terminal using instructions [here](https://github.com/TypeStrong/ts-node) (`npx ts-node ./src/scratch.ts` should be enough).
- Import and call the relevant modules and run the scratch file.

Example scratch.ts file:

```
/* eslint-disable no-console */
import { TodoistApi } from './todoist-api'

const token = 'YOURTOKEN'
const api = new TodoistApi(token)

api.getProjects()
    .then((projects) => {
        console.log(projects)
    })
    .catch((error) => console.error(error))
```

### Local API Requests With .env

For live API verification, you can run raw requests with a local token:

1. Copy `.env.example` to `.env`.
2. Set `TODOIST_API_TOKEN` in `.env`.
3. Run requests with `npm run api:request -- ...`.
4. Optional: set `TODOIST_API_BASE_URL` in `.env` (defaults to `https://api.todoist.com`).

Examples:

```bash
npm run api:request -- --path /api/v1/tasks
npm run api:request -- --method POST --path /api/v1/tasks --body '{"content":"API smoke test"}'
npm run api:request -- --method POST --path /api/v1/tasks/123 --body '{"due_string":"no date"}'
npm run api:request -- --path /api/v1/tasks --query '{"project_id":"123","limit":10}'
```

To see all options:

```bash
npm run api:request -- --help
```

## Releases

This project uses [Release Please](https://github.com/googleapis/release-please) to automate releases. Releases are created automatically based on [Conventional Commits](https://www.conventionalcommits.org/).

### For Contributors

When making changes, use conventional commit messages:

- `feat:` - New features (triggers a minor version bump)
- `fix:` - Bug fixes (triggers a patch version bump)
- `feat!:` or `BREAKING CHANGE:` - Breaking changes (triggers a major version bump)
- `chore:`, `docs:`, `refactor:`, `perf:` - Other changes (included in changelog)

Example:

```
feat: add support for recurring tasks
fix: resolve issue with date parsing
feat!: remove deprecated getTask method
```

### For Maintainers

The release process is fully automated:

1. **Automatic PR Creation**: When commits are merged to `main`, Release Please automatically creates or updates a release PR with:
    - Updated version in `package.json`
    - Updated `CHANGELOG.md`
    - Aggregated changes since the last release

2. **Review and Merge**: Review the release PR to ensure the version bump and changelog are correct, then merge it.

3. **Automatic Release**: Upon merging the release PR:
    - A GitHub release is automatically created with the new version tag
    - The `publish.yml` workflow is triggered by the tag
    - The package is automatically published to NPM

Users of the API client can then update to the new version in their `package.json`.

### Feedback

Any feedback, such as bugs, questions, comments, etc. can be reported as _Issues_ in this repository, and will be handled by us in Todoist.

### Contributions

We would also love contributions in the form of _Pull requests_ in this repository.
