import type { Permission } from '../../authentication'
import type { AppIconSize } from '../../consts/endpoints'
import type { AppClientType, InstallationType, WebhookEvent, WebhookVersion } from './types'

/**
 * Arguments for creating a new developer application.
 */
export type AddAppArgs = {
    /** Display name of the application. */
    displayName: string
    /** The application's service URL. */
    serviceUrl: string
}

/**
 * Arguments for updating a developer application.
 * All fields are optional — only provided fields are updated.
 *
 * Pass `appTokenScopes` as an array (e.g. `['data:read', 'task:add']`);
 * the SDK serializes it to the comma-separated string the backend expects.
 */
export type UpdateAppArgs = {
    /** Updated display name. */
    displayName?: string
    /** Updated OAuth redirect URI. Pass `null` to clear. */
    oauthRedirectUri?: string | null
    /** Updated service URL. */
    serviceUrl?: string
    /** Updated app description. */
    description?: string
    /**
     * Updated list of scopes the app may request. Pass `null` to clear.
     *
     * Typed as `Permission | (string & {})` so known scopes get autocomplete
     * while still permitting plain strings — needed so a fetched
     * `App['appTokenScopes']` (typed `string[] | null`) can be passed back
     * to `updateApp()` without casts.
     */
    appTokenScopes?: readonly (Permission | (string & {}))[] | null
    /**
     * Updated OAuth client type. Set to `'public'` for apps that cannot keep a
     * secret (native apps, browser extensions, CLIs), so they exchange
     * authorization codes with PKCE alone. The client secret is kept, so
     * switching back to `'confidential'` needs no new one.
     *
     * Dynamically registered clients cannot change it: the API rejects the
     * update with `BAD_REQUEST`.
     */
    clientType?: AppClientType
}

/**
 * Arguments for uploading an app icon.
 */
export type UploadAppIconArgs = {
    /** The application ID. */
    appId: string
    /** The icon file to upload (Buffer, Stream, or file path). */
    file: Buffer | NodeJS.ReadableStream | string | Blob
    /** The file name (required for Buffer/Stream uploads). */
    fileName?: string
    /** Icon size variant. Defaults to `'medium'`. */
    size?: AppIconSize
}

/**
 * Arguments for configuring (creating or updating) an app webhook.
 */
export type UpdateAppWebhookArgs = {
    /** The application ID. */
    appId: string
    /** The URL the webhook will POST events to. */
    callbackUrl: string
    /** Events the webhook should receive. Must be unique. */
    events: readonly WebhookEvent[]
    /** Webhook payload version. Defaults to the backend's latest supported version. */
    version?: WebhookVersion
}

/**
 * Arguments for installing a developer application via its distribution token.
 */
export type InstallAppArgs = {
    /** The distribution token for the app being installed. */
    distributionToken: string
    /** Type of installation to create. */
    installationType: InstallationType
    /** Whether the requesting client has validated the app's requested scopes with the user. */
    appTokenScopesValidated?: boolean
}

/**
 * Arguments for updating an app installation.
 */
export type UpdateAppInstallationArgs = {
    /** Updated validated-scopes flag. */
    appTokenScopesValidated?: boolean
}

/**
 * Arguments for revoking a user's authorization of a third-party app.
 */
export type RevokeUserAuthorizationArgs = {
    /** The ID of the access token to revoke. */
    accessTokenId: string
}
