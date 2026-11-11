---
sidebar_label: Authorization
sidebar_position: 2
---

# Authorization

The Todoist API uses OAuth2 for authentication. This guide provides a quick overview of the authentication flow using our TypeScript client.

## Quick Start

```typescript
import {
    getAuthStateParameter,
    getAuthorizationUrl,
    getAuthToken,
} from '@todoist/sdk'

// 1. Generate state parameter and store it
const state = getAuthStateParameter()

// 2. Get authorization URL
const url = getAuthorizationUrl('YOUR_CLIENT_ID', ['data:read', 'task:add'], state)

// 3. Redirect user to the authorization URL
// 4. Handle OAuth callback and get code

// 5. Exchange code for token
const { accessToken } = await getAuthToken({
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    code: 'CODE_FROM_CALLBACK',
})
```

## Using the Access Token

```typescript
import { TodoistApi } from '@todoist/sdk'

// Initialize API with access token
const api = new TodoistApi(accessToken)

// Use API methods
const task = await api.addTask({
    content: 'Buy groceries',
    dueString: 'tomorrow at 12:00',
    priority: 4,
})
```

## Available Functions

-   [`getAuthStateParameter()`](./api/functions/getAuthStateParameter) - Creates secure state parameter
-   [`getAuthorizationUrl()`](./api/functions/getAuthorizationUrl) - Generates OAuth2 authorization URL
-   [`getAuthToken()`](./api/functions/getAuthToken) - Exchanges code for access token
-   [`revokeToken()`](./api/functions/revokeToken) - Revokes an access token (RFC 7009)

## Available Scopes

-   `task:add` - Only create new tasks
-   `data:read` - Read-only access
-   `data:read_write` - Read and write access
-   `data:delete` - Full access including delete
-   `project:delete` - Can delete projects
-   `backups:read` - Can read the user's list of backups without MFA

📖 For detailed implementation steps and security considerations, consult the [Todoist API v1 Authorization Guide](https://todoist.com/api/v1/docs#tag/Authorization).
