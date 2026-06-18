import { v4 as uuid } from 'uuid'
import {
    getAuthBaseUri,
    getSyncBaseUri,
    ENDPOINT_AUTHORIZATION,
    ENDPOINT_GET_TOKEN,
    ENDPOINT_REVOKE,
    ENDPOINT_REGISTER,
    ENDPOINT_REST_ACCESS_TOKENS_MIGRATE,
} from './consts/endpoints'
import { request, isSuccess } from './transport/http-client'
import { TodoistRequestError } from './types'
import { CustomFetch } from './types/http'

/**
 * Options for authentication functions
 */
export type AuthOptions = {
    baseUrl?: string
    customFetch?: CustomFetch
}

/** Available OAuth2 permission scopes. */
export const PERMISSIONS = [
    'task:add',
    'data:read',
    'data:read_write',
    'data:delete',
    'project:delete',
    'backups:read',
    'billing:read',
    'billing:read_write',
    'dev:app_console',
] as const
/**
 * Permission scope that can be requested during OAuth2 authorization.
 * @see {@link https://developer.todoist.com/api/v1/#tag/Authorization}
 */
export type Permission = (typeof PERMISSIONS)[number]

/** Supported token endpoint authentication methods for dynamic client registration. */
export const TOKEN_ENDPOINT_AUTH_METHODS = [
    'client_secret_post',
    'client_secret_basic',
    'none',
] as const
/**
 * Authentication method used at the token endpoint.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591#section-2 RFC 7591 Section 2}
 */
export type TokenEndpointAuthMethod = (typeof TOKEN_ENDPOINT_AUTH_METHODS)[number]

/**
 * Parameters for registering a new OAuth client via Dynamic Client Registration.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591 RFC 7591}
 */
export type ClientRegistrationRequest = {
    redirectUris: string[]
    clientName?: string
    clientUri?: string
    logoUri?: string
    scope?: readonly Permission[]
    grantTypes?: string[]
    responseTypes?: string[]
    tokenEndpointAuthMethod?: TokenEndpointAuthMethod
}

type RawClientRegistrationResponse = {
    clientId: string
    clientSecret?: string
    clientName: string
    redirectUris: string[]
    scope?: string
    grantTypes: string[]
    responseTypes: string[]
    tokenEndpointAuthMethod: string
    clientIdIssuedAt?: number
    clientSecretExpiresAt?: number
    clientUri?: string
    logoUri?: string
}

/**
 * Response from a successful dynamic client registration.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591#section-3.2.1 RFC 7591 Section 3.2.1}
 */
export type ClientRegistrationResponse = Omit<
    RawClientRegistrationResponse,
    'clientIdIssuedAt' | 'clientSecretExpiresAt' | 'scope'
> & {
    scope?: Permission[]
    clientIdIssuedAt?: Date
    /** `null` indicates the client secret never expires. Absent when no secret is issued. */
    clientSecretExpiresAt?: Date | null
}

/**
 * Parameters required to exchange an authorization code for an access token.
 * @see https://developer.todoist.com/api/v1/#tag/Authorization/OAuth
 */
export type AuthTokenRequestArgs = {
    clientId: string
    clientSecret: string
    code: string
}
/**
 * Response from a successful OAuth2 token exchange.
 * @see https://developer.todoist.com/api/v1/#tag/Authorization/OAuth
 */
export type AuthTokenResponse = {
    accessToken: string
    tokenType: string
    /**
     * Refresh token for use with {@link refreshAuthToken}.
     *
     * Only present when the OAuth app has refresh tokens enabled. New apps have
     * this on by default; legacy apps must opt in. Apps without it receive a
     * non-expiring access token and no `refreshToken`/`expiresIn`.
     */
    refreshToken?: string
    /** Access token lifetime in seconds. Present only when the app issues refresh tokens. */
    expiresIn?: number
}

/**
 * Parameters required to exchange a refresh token for a new access token.
 * @see https://developer.todoist.com/api/v1/#tag/Authorization/OAuth
 */
export type RefreshTokenRequestArgs = {
    clientId: string
    clientSecret: string
    refreshToken: string
}

/**
 * Parameters required to revoke a token using RFC 7009 compliant endpoint.
 * @see https://developer.todoist.com/api/v1/#tag/Authorization
 */
export type RevokeTokenRequestArgs = {
    clientId: string
    clientSecret: string
    token: string
}

/**
 * Parameters required to migrate a personal API token to an OAuth token.
 */
export type MigratePersonalTokenArgs = {
    /** The unique Client ID of the registered Todoist application. */
    clientId: string
    /** The unique Client Secret of the registered Todoist application. */
    clientSecret: string
    /** The personal API token obtained from email/password authentication. */
    personalToken: string
    /** Scopes for the new OAuth token. */
    scope: readonly Permission[]
}

/**
 * Response from a successful personal token migration.
 */
export type MigratePersonalTokenResponse = {
    /** The new OAuth access token, or null if migration failed. */
    accessToken: string | null
    /** The token type (always 'Bearer'). */
    tokenType: string
    /** Token expiration time in seconds. */
    expiresIn: number
}

/**
 * Creates a Basic Authentication header value from client credentials.
 * @param clientId - The OAuth client ID
 * @param clientSecret - The OAuth client secret
 * @returns The Basic Auth header value (without the 'Basic ' prefix)
 */
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
    const credentials = `${clientId}:${clientSecret}`
    return Buffer.from(credentials).toString('base64')
}

/**
 * Generates a random state parameter for OAuth2 authorization.
 * The state parameter helps prevent CSRF attacks.
 *
 * @example
 * ```typescript
 * const state = getAuthStateParameter()
 * // Store state in session
 * const authUrl = getAuthorizationUrl(clientId, ['data:read'], state)
 * ```
 *
 * @returns A random UUID v4 string
 */
export function getAuthStateParameter(): string {
    return uuid()
}

/**
 * Generates the authorization URL for the OAuth2 flow.
 *
 * The `clientId` can be either a traditional client ID string (e.g. from
 * {@link registerClient}) or an HTTPS URL pointing to a client metadata document,
 * as defined in {@link https://drafts.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/ RFC draft-ietf-oauth-client-id-metadata-document}.
 *
 * @example
 * ```typescript
 * const url = getAuthorizationUrl({
 *   clientId: 'your-client-id',
 *   permissions: ['data:read', 'task:add'],
 *   state,
 * })
 * // Redirect user to url
 * ```
 *
 * @returns The full authorization URL to redirect users to
 * @see https://developer.todoist.com/api/v1/#tag/Authorization/OAuth
 */
export function getAuthorizationUrl({
    clientId,
    permissions,
    state,
    baseUrl,
}: {
    clientId: string
    permissions: readonly Permission[]
    state: string
    baseUrl?: string
}): string {
    if (!permissions?.length) {
        throw new Error('At least one scope value should be passed for permissions.')
    }

    const scope = permissions.join(',')
    return `${getAuthBaseUri(
        baseUrl,
    )}${ENDPOINT_AUTHORIZATION}?client_id=${encodeURIComponent(clientId)}&scope=${scope}&state=${state}`
}

/**
 * Exchanges an authorization code for an access token.
 *
 * @example
 * ```typescript
 * const { accessToken } = await getAuthToken({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   code: authCode
 * })
 * ```
 *
 * @returns The access token response
 * @throws {@link TodoistRequestError} If the token exchange fails
 */
export async function getAuthToken(
    args: AuthTokenRequestArgs,
    options?: AuthOptions,
): Promise<AuthTokenResponse> {
    if (typeof options === 'string') {
        throw new TypeError(
            'Passing baseUrl as a string is no longer supported. Use an options object instead: getAuthToken(args, { baseUrl })',
        )
    }
    const baseUrl = options?.baseUrl
    const customFetch = options?.customFetch

    try {
        const response = await request<AuthTokenResponse>({
            httpMethod: 'POST',
            baseUri: getAuthBaseUri(baseUrl),
            relativePath: ENDPOINT_GET_TOKEN,
            apiToken: undefined,
            payload: args,
            customFetch,
        })

        if (response.status !== 200 || !response.data?.accessToken) {
            throw new TodoistRequestError(
                'Authentication token exchange failed.',
                response.status,
                response.data,
            )
        }

        return response.data
    } catch (error) {
        // Re-throw with custom message for authentication failures
        const err = error as TodoistRequestError
        throw new TodoistRequestError(
            'Authentication token exchange failed.',
            err.httpStatusCode,
            err.responseData,
        )
    }
}

/**
 * Exchanges a refresh token for a new access token using the OAuth2
 * `refresh_token` grant.
 *
 * Only relevant for OAuth apps that have refresh tokens enabled (default for
 * new apps; legacy apps must opt in). Apps without refresh tokens never receive
 * a `refreshToken` from {@link getAuthToken}, so they have nothing to pass here —
 * their access tokens do not expire.
 *
 * @example
 * ```typescript
 * const { accessToken, refreshToken } = await refreshAuthToken({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   refreshToken: storedRefreshToken,
 * })
 * ```
 *
 * @returns The refreshed token. The response may include a new `refreshToken`
 * (rotated by the server); persist it in place of the previous one when present.
 * @throws {@link TodoistRequestError} If the refresh fails
 */
export async function refreshAuthToken(
    args: RefreshTokenRequestArgs,
    options?: AuthOptions,
): Promise<AuthTokenResponse> {
    if (typeof options === 'string') {
        throw new TypeError(
            'Passing baseUrl as a string is no longer supported. Use an options object instead: refreshAuthToken(args, { baseUrl })',
        )
    }
    const baseUrl = options?.baseUrl
    const customFetch = options?.customFetch

    try {
        const response = await request<AuthTokenResponse>({
            httpMethod: 'POST',
            baseUri: getAuthBaseUri(baseUrl),
            relativePath: ENDPOINT_GET_TOKEN,
            apiToken: undefined,
            payload: {
                clientId: args.clientId,
                clientSecret: args.clientSecret,
                refreshToken: args.refreshToken,
                grantType: 'refresh_token',
            },
            customFetch,
        })

        if (response.status !== 200 || !response.data?.accessToken) {
            throw new TodoistRequestError(
                'Authentication token refresh failed.',
                response.status,
                response.data,
            )
        }

        return response.data
    } catch (error) {
        // Re-throw with custom message for authentication failures
        const err = error as TodoistRequestError
        throw new TodoistRequestError(
            'Authentication token refresh failed.',
            err.httpStatusCode,
            err.responseData,
        )
    }
}

/**
 * Revokes a token using the RFC 7009 OAuth 2.0 Token Revocation standard.
 *
 * This function uses HTTP Basic Authentication with client credentials and follows
 * the RFC 7009 specification for token revocation.
 *
 * @example
 * ```typescript
 * await revokeToken({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   token: 'access-token-to-revoke'
 * })
 * ```
 *
 * @returns True if revocation was successful
 * @see https://datatracker.ietf.org/doc/html/rfc7009
 * @see https://developer.todoist.com/api/v1/#tag/Authorization
 */
export async function revokeToken(
    args: RevokeTokenRequestArgs,
    options?: AuthOptions,
): Promise<boolean> {
    if (typeof options === 'string') {
        throw new TypeError(
            'Passing baseUrl as a string is no longer supported. Use an options object instead: revokeToken(args, { baseUrl })',
        )
    }
    const baseUrl = options?.baseUrl
    const customFetch = options?.customFetch

    const { clientId, clientSecret, token } = args

    // Create Basic Auth header as per RFC 7009
    const basicAuth = createBasicAuthHeader(clientId, clientSecret)
    const customHeaders = {
        Authorization: `Basic ${basicAuth}`,
    }

    // Request body only contains the token and optional token_type_hint
    const requestBody = {
        token,
        token_type_hint: 'access_token',
    }

    const response = await request({
        httpMethod: 'POST',
        baseUri: getSyncBaseUri(baseUrl),
        relativePath: ENDPOINT_REVOKE,
        apiToken: undefined,
        payload: requestBody,
        requestId: undefined,
        hasSyncCommands: false,
        customHeaders: customHeaders,
        customFetch,
    })

    return isSuccess(response)
}

/**
 * Migrates a personal API token to an OAuth access token.
 *
 * This allows applications to transition users from personal API tokens
 * to proper OAuth tokens without requiring the user to go through the
 * full OAuth authorization flow.
 *
 * @example
 * ```typescript
 * const { accessToken } = await migratePersonalToken({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   personalToken: 'user-personal-token',
 *   scope: 'data:read_write,data:delete'
 * })
 * ```
 *
 * @returns The new OAuth token response
 * @throws {@link TodoistRequestError} If the migration fails
 */
export async function migratePersonalToken(
    args: MigratePersonalTokenArgs,
    options?: AuthOptions,
): Promise<MigratePersonalTokenResponse> {
    const baseUrl = options?.baseUrl
    const customFetch = options?.customFetch

    try {
        const response = await request<MigratePersonalTokenResponse>({
            httpMethod: 'POST',
            baseUri: getSyncBaseUri(baseUrl),
            relativePath: ENDPOINT_REST_ACCESS_TOKENS_MIGRATE,
            apiToken: undefined,
            payload: { ...args, scope: args.scope.join(',') },
            customFetch,
        })

        if (response.status !== 200 || !response.data?.accessToken) {
            throw new TodoistRequestError(
                'Personal token migration failed.',
                response.status,
                response.data,
            )
        }

        return response.data
    } catch (error) {
        const err = error as TodoistRequestError
        throw new TodoistRequestError(
            'Personal token migration failed.',
            err.httpStatusCode,
            err.responseData,
        )
    }
}

/**
 * Registers a new OAuth client via Dynamic Client Registration (RFC 7591).
 *
 * @example
 * ```typescript
 * const client = await registerClient({
 *   redirectUris: ['https://example.com/callback'],
 *   clientName: 'My App',
 *   scope: ['data:read_write', 'task:add'],
 * })
 * // Use client.clientId and client.clientSecret for OAuth flows
 * ```
 *
 * @returns The registered client details
 * @throws {@link TodoistRequestError} If the registration fails
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591 RFC 7591}
 */
export async function registerClient(
    args: ClientRegistrationRequest,
    options?: AuthOptions,
): Promise<ClientRegistrationResponse> {
    const baseUrl = options?.baseUrl
    const customFetch = options?.customFetch

    try {
        const response = await request<RawClientRegistrationResponse>({
            httpMethod: 'POST',
            baseUri: getAuthBaseUri(baseUrl),
            relativePath: ENDPOINT_REGISTER,
            apiToken: undefined,
            payload: { ...args, scope: args.scope?.join(' ') },
            customFetch,
        })

        if (!isSuccess(response) || !response.data?.clientId) {
            throw new TodoistRequestError(
                'Dynamic client registration failed.',
                response.status,
                response.data,
            )
        }

        const { clientIdIssuedAt, clientSecretExpiresAt, scope, ...rest } = response.data
        return {
            ...rest,
            scope: scope ? (scope.split(' ') as Permission[]) : undefined,
            clientIdIssuedAt:
                clientIdIssuedAt !== undefined ? new Date(clientIdIssuedAt * 1000) : undefined,
            clientSecretExpiresAt:
                clientSecretExpiresAt === undefined
                    ? undefined
                    : clientSecretExpiresAt === 0
                      ? null
                      : new Date(clientSecretExpiresAt * 1000),
        }
    } catch (error) {
        const err = error as TodoistRequestError
        throw new TodoistRequestError(
            'Dynamic client registration failed.',
            err.httpStatusCode,
            err.responseData,
        )
    }
}
