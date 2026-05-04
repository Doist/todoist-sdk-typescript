import { z } from 'zod'
import { StringOrNumberSchema } from '../common'
import { UI_EXTENSION_TYPES } from '../ui-extensions/types'

/**
 * Available statuses for a developer application.
 */
export const APP_STATUSES = ['public'] as const
/**
 * Status of a developer application.
 */
export type AppStatus = (typeof APP_STATUSES)[number]

export const AppStatusSchema = z.enum(APP_STATUSES)

/**
 * Webhook event types that can be subscribed to.
 *
 * These are the friendly public names the backend uses in webhook payloads.
 * The on-the-wire config endpoint uses a different (legacy) form (see
 * {@link WEBHOOK_EVENT_WIRE_NAMES}); the SDK converts between the two
 * so consumers only ever work with these pretty names.
 *
 * @see https://developer.todoist.com/sync/v1/#webhooks
 */
export const WEBHOOK_EVENTS = [
    'item:added',
    'item:updated',
    'item:completed',
    'item:uncompleted',
    'item:deleted',
    'note:added',
    'note:updated',
    'note:deleted',
    'project:added',
    'project:updated',
    'project:deleted',
    'project:archived',
    'project:unarchived',
    'section:added',
    'section:updated',
    'section:deleted',
    'section:archived',
    'section:unarchived',
    'label:added',
    'label:updated',
    'label:deleted',
    'filter:added',
    'filter:updated',
    'filter:deleted',
    'reminder:fired',
] as const
/**
 * A webhook event that can be subscribed to.
 */
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const WebhookEventSchema = z.enum(WEBHOOK_EVENTS)

/**
 * Raw wire-format webhook event names used by the config endpoint
 * (`POST/GET /apps/<id>/webhook`). Exported for completeness — prefer
 * {@link WEBHOOK_EVENTS} when working with the SDK.
 */
export const WEBHOOK_EVENT_WIRE_NAMES = [
    'e_item_added',
    'e_item_updated',
    'e_item_completed',
    'e_item_uncompleted',
    'e_item_deleted',
    'e_note_added',
    'e_note_updated',
    'e_note_deleted',
    'e_project_added',
    'e_project_updated',
    'e_project_deleted',
    'e_project_archived',
    'e_project_unarchived',
    'e_section_added',
    'e_section_updated',
    'e_section_deleted',
    'e_section_archived',
    'e_section_unarchived',
    'e_label_added',
    'e_label_updated',
    'e_label_deleted',
    'e_filter_added',
    'e_filter_updated',
    'e_filter_deleted',
    'e_reminder_fired',
] as const
/**
 * Wire-format webhook event name (the `e_*` form).
 */
export type WebhookEventWireName = (typeof WEBHOOK_EVENT_WIRE_NAMES)[number]

export const WebhookEventWireNameSchema = z.enum(WEBHOOK_EVENT_WIRE_NAMES)

/**
 * Translates a wire-format event name (`'e_item_added'`) to its pretty form (`'item:added'`).
 */
export function webhookEventFromWireName(wireName: WebhookEventWireName): WebhookEvent {
    // Strip leading `e_`, replace first `_` with `:`. The resulting string is
    // guaranteed to be a `WebhookEvent` by construction of the two const arrays.
    return wireName.slice(2).replace('_', ':') as WebhookEvent
}

/**
 * Translates a pretty event name (`'item:added'`) to its wire-format form (`'e_item_added'`).
 */
export function webhookEventToWireName(event: WebhookEvent): WebhookEventWireName {
    return ('e_' + event.replace(':', '_')) as WebhookEventWireName
}

/**
 * Available statuses for an app webhook.
 */
export const WEBHOOK_STATUSES = ['active', 'invalid'] as const
/**
 * Delivery status of an app webhook.
 */
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number]

export const WebhookStatusSchema = z.enum(WEBHOOK_STATUSES)

/**
 * Supported webhook payload versions. v9 is deprecated and intentionally excluded.
 */
export const WEBHOOK_VERSIONS = ['1'] as const
/**
 * Webhook payload version.
 */
export type WebhookVersion = (typeof WEBHOOK_VERSIONS)[number]

export const WebhookVersionSchema = z.enum(WEBHOOK_VERSIONS)

/**
 * Available installation types for an app installation.
 */
export const INSTALLATION_TYPES = ['user'] as const
/**
 * Scope of an app installation.
 */
export type InstallationType = (typeof INSTALLATION_TYPES)[number]

export const InstallationTypeSchema = z.enum(INSTALLATION_TYPES)

/**
 * Transforms a comma-separated scope string into `string[] | null`.
 *
 * The backend stores `app_token_scopes` as a single comma-separated string
 * (e.g. `"data:read,task:add"`). Reads are exposed as `string[]` (rather than
 * `Permission[]`) so that newly added backend scopes don't break parsing —
 * writes accept `Permission` for autocomplete while still permitting `string`
 * (via `UpdateAppArgs`), so a fetched `App.appTokenScopes` can be round-tripped
 * back into `updateApp()` without casts.
 *
 * Preserves `null` on read (backend returns `null` for apps that have had
 * their scopes cleared via `updateApp({ appTokenScopes: null })`) so the
 * read and write shapes line up and information is not lost.
 */
export const AppTokenScopesSchema = z
    .string()
    .nullable()
    .transform((value): string[] | null => {
        if (value === null) return null
        if (value === '') return []
        return value.split(',').filter(Boolean)
    })

/**
 * Schema for a developer application.
 * @see https://developer.todoist.com/api/v1/#tag/Apps
 */
export const AppSchema = z.object({
    id: StringOrNumberSchema,
    clientId: z.string(),
    status: AppStatusSchema,
    displayName: z.string(),
    userId: StringOrNumberSchema,
    createdAt: z.coerce.date(),
    serviceUrl: z.string().nullable(),
    oauthRedirectUri: z.string().nullable(),
    description: z.string().nullable(),
    iconSm: z.string().nullable(),
    iconMd: z.string().nullable(),
    iconLg: z.string().nullable(),
    appTokenScopes: AppTokenScopesSchema,
})

/**
 * A developer application.
 */
export type App = z.infer<typeof AppSchema>

/**
 * Schema for a developer application that includes the user count.
 * Returned by most endpoints that manage a single app (get, update, delete).
 */
export const AppWithUserCountSchema = AppSchema.extend({
    userCount: z.number().int(),
})

/**
 * A developer application with authorized user count.
 */
export type AppWithUserCount = z.infer<typeof AppWithUserCountSchema>

/**
 * OAuth client credentials for a developer application.
 */
export const AppSecretsSchema = z.object({
    clientId: z.string(),
    clientSecret: z.string(),
})

/**
 * OAuth client credentials for a developer application.
 */
export type AppSecrets = z.infer<typeof AppSecretsSchema>

/**
 * Webhook verification token for a developer application.
 */
export const AppVerificationTokenSchema = z.object({
    verificationToken: z.string(),
})

/**
 * Webhook verification token for a developer application.
 */
export type AppVerificationToken = z.infer<typeof AppVerificationTokenSchema>

/**
 * Developer test access token for a developer application.
 */
export const AppTestTokenSchema = z.object({
    accessToken: z.string().nullish(),
})

/**
 * Developer test access token for a developer application.
 */
export type AppTestToken = z.infer<typeof AppTestTokenSchema>

/**
 * Distribution token for a developer application.
 */
export const AppDistributionTokenSchema = z.object({
    distributionToken: z.string(),
})

/**
 * Distribution token for a developer application.
 */
export type AppDistributionToken = z.infer<typeof AppDistributionTokenSchema>

/**
 * Subset of an app returned when resolving by distribution token — used by the installation flow.
 * Includes a lightweight list of the app's UI extensions (not full `UIExtension` records).
 */
export const AppByDistributionTokenUiExtensionSchema = z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string().nullable(),
    extensionType: z.enum(UI_EXTENSION_TYPES),
})

/**
 * UI extension metadata returned by the `by_distribution_token` endpoint.
 */
export type AppByDistributionTokenUiExtension = z.infer<
    typeof AppByDistributionTokenUiExtensionSchema
>

export const AppByDistributionTokenSchema = z.object({
    id: StringOrNumberSchema,
    displayName: z.string(),
    description: z.string().nullable(),
    iconMd: z.string().nullable(),
    appTokenScopes: AppTokenScopesSchema,
    uiExtensions: z.array(AppByDistributionTokenUiExtensionSchema),
})

/**
 * Public-facing app info resolved via distribution token — used during installation.
 */
export type AppByDistributionToken = z.infer<typeof AppByDistributionTokenSchema>

/**
 * Schema for an app webhook.
 *
 * Events arrive from the wire in their `e_*` form and are transformed to
 * their pretty `item:added`-style names for SDK consumers.
 */
export const AppWebhookSchema = z.object({
    status: WebhookStatusSchema,
    callbackUrl: z.string(),
    version: WebhookVersionSchema,
    events: z.array(WebhookEventWireNameSchema.transform(webhookEventFromWireName)),
})

/**
 * Webhook configuration for a developer application.
 */
export type AppWebhook = z.infer<typeof AppWebhookSchema>

/**
 * Lightweight view of an app embedded in an installation record.
 * Mirrors `AppSchema` shape — backend returns the same `ApplicationRestView`.
 */
export const InstalledIntegrationSchema = AppSchema

/**
 * Embedded app info on an installation record.
 */
export type InstalledIntegration = z.infer<typeof InstalledIntegrationSchema>

/**
 * Schema for an installed application (integration installed to a user's account).
 */
export const AppInstallationSchema = z.object({
    id: StringOrNumberSchema,
    creator: StringOrNumberSchema,
    createdTs: z.number().int(),
    installationType: InstallationTypeSchema,
    appTokenScopesValidated: z.boolean(),
    integration: InstalledIntegrationSchema.nullable(),
})

/**
 * Installation of a developer application on a user's account.
 */
export type AppInstallation = z.infer<typeof AppInstallationSchema>

/**
 * Lightweight app info included on a user authorization record.
 */
export const UserAuthorizationAppSchema = z.object({
    id: StringOrNumberSchema,
    displayName: z.string(),
    description: z.string().nullable(),
    serviceUrl: z.string().nullable(),
    iconMd: z.string().nullable(),
})

/**
 * App info attached to a user authorization entry.
 */
export type UserAuthorizationApp = z.infer<typeof UserAuthorizationAppSchema>

/**
 * Schema for a user authorization entry — a token the user has granted to a third-party app.
 */
export const UserAuthorizationSchema = z.object({
    accessTokenId: StringOrNumberSchema,
    scope: z.array(z.string()),
    scopeDescriptions: z.array(z.string()),
    createdAt: z.coerce.date(),
    app: UserAuthorizationAppSchema.nullable(),
})

/**
 * A user authorization entry (access token granted to a third-party app).
 */
export type UserAuthorization = z.infer<typeof UserAuthorizationSchema>
