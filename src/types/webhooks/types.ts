import { z } from 'zod'
import { WebhookEventSchema, WebhookVersionSchema } from '../apps/types'

/**
 * Collaborator info for the user that triggered a webhook event.
 * @see https://developer.todoist.com/sync/v1/#webhooks
 */
export const WebhookInitiatorSchema = z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
    imageId: z.string().nullable(),
    isPremium: z.boolean(),
})

/**
 * Collaborator info for the user that triggered a webhook event.
 */
export type WebhookInitiator = z.infer<typeof WebhookInitiatorSchema>

/**
 * Wrapper schema for an incoming webhook payload.
 *
 * Validates the envelope common to every webhook event. `eventData` is
 * intentionally typed as `unknown` for now — per-event variants will narrow
 * this to the appropriate resource type in follow-up work (items, projects,
 * sections, labels, notes, filters, reminders).
 *
 * The backend sends snake_case keys and uses the public event form
 * (`item:added`) in the `event_name` field, so consumers using
 * {@link parseWebhookPayload} receive camelCase fields directly.
 */
export const WebhookPayloadSchema = z.object({
    version: WebhookVersionSchema,
    userId: z.string(),
    initiator: WebhookInitiatorSchema,
    eventName: WebhookEventSchema,
    eventData: z.unknown(),
    triggeredAt: z.coerce.date(),
    eventDataExtra: z.unknown().optional(),
})

/**
 * A parsed webhook payload.
 */
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>
