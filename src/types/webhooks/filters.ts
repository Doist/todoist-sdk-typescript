import { z } from 'zod'
import { type WebhookEvent } from '../apps/types'
import { FilterSchema } from '../sync/resources/filters'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of filter (`filter:*`) webhook event names. Single
 * source of truth for the discriminator values — `FILTER_WEBHOOK_EVENTS`
 * and every `z.literal()` below derive from it.
 */
export const FilterWebhookEventEnum = {
    Added: 'filter:added',
    Updated: 'filter:updated',
    Deleted: 'filter:deleted',
} as const

/** Webhook events that carry a filter as their `eventData`. */
export const FILTER_WEBHOOK_EVENTS = [
    FilterWebhookEventEnum.Added,
    FilterWebhookEventEnum.Updated,
    FilterWebhookEventEnum.Deleted,
] as const satisfies readonly WebhookEvent[]

/**
 * Webhook filter payloads match the shared {@link Filter} resource shape,
 * so `eventData` reuses `FilterSchema` directly — no webhook-specific
 * schema is needed.
 */
export const FilterAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(FilterWebhookEventEnum.Added),
    eventData: FilterSchema,
})
export type FilterAddedPayload = z.infer<typeof FilterAddedPayloadSchema>

export const FilterUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(FilterWebhookEventEnum.Updated),
    eventData: FilterSchema,
})
export type FilterUpdatedPayload = z.infer<typeof FilterUpdatedPayloadSchema>

export const FilterDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(FilterWebhookEventEnum.Deleted),
    eventData: FilterSchema,
})
export type FilterDeletedPayload = z.infer<typeof FilterDeletedPayloadSchema>
