import { z } from 'zod'
import { WebhookVersionSchema } from '../apps/types'

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
 * Fields common to every webhook payload, regardless of `eventName`.
 * Meant to be spread into per-event variant schemas.
 */
export const BaseWebhookEnvelopeShape = {
    version: WebhookVersionSchema,
    userId: z.string(),
    initiator: WebhookInitiatorSchema,
    triggeredAt: z.coerce.date(),
} as const
