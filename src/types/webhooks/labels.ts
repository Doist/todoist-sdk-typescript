import { z } from 'zod'
import { type WebhookEvent } from '../apps/types'
import { LabelSchema } from '../labels/types'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of label (`label:*`) webhook event names. Single source
 * of truth for the discriminator values — `LABEL_WEBHOOK_EVENTS` and every
 * `z.literal()` below derive from it.
 */
export const LabelWebhookEventEnum = {
    Added: 'label:added',
    Updated: 'label:updated',
    Deleted: 'label:deleted',
} as const

/** Webhook events that carry a label as their `eventData`. */
export const LABEL_WEBHOOK_EVENTS = [
    LabelWebhookEventEnum.Added,
    LabelWebhookEventEnum.Updated,
    LabelWebhookEventEnum.Deleted,
] as const satisfies readonly WebhookEvent[]

/**
 * A label as delivered in a webhook payload.
 *
 * Webhook label payloads differ from the REST label shape in two ways:
 * they use `item_order` (not `order`) and always include `is_deleted`. This
 * schema reuses {@link LabelSchema}, swapping `order` for `itemOrder` on
 * the input side and renaming it back after validation, and surfaces
 * `isDeleted` for downstream filtering.
 */
export const WebhookLabelSchema = LabelSchema.omit({ order: true })
    .extend({
        itemOrder: z.number().int().nullable(),
        isDeleted: z.boolean(),
    })
    .transform(({ itemOrder, ...rest }) => ({
        ...rest,
        order: itemOrder,
    }))

/** A label as delivered in a webhook payload. */
export type WebhookLabel = z.infer<typeof WebhookLabelSchema>

export const LabelAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(LabelWebhookEventEnum.Added),
    eventData: WebhookLabelSchema,
})
export type LabelAddedPayload = z.infer<typeof LabelAddedPayloadSchema>

export const LabelUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(LabelWebhookEventEnum.Updated),
    eventData: WebhookLabelSchema,
})
export type LabelUpdatedPayload = z.infer<typeof LabelUpdatedPayloadSchema>

export const LabelDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(LabelWebhookEventEnum.Deleted),
    eventData: WebhookLabelSchema,
})
export type LabelDeletedPayload = z.infer<typeof LabelDeletedPayloadSchema>
