import { z } from 'zod'
import { getSectionUrl } from '../../utils/url-helpers'
import { type WebhookEvent } from '../apps/types'
import { SectionBaseSchema } from '../sections/types'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of section (`section:*`) webhook event names. Single
 * source of truth for the discriminator values — `SECTION_WEBHOOK_EVENTS`
 * and every `z.literal()` below derive from it.
 */
export const SectionWebhookEventEnum = {
    Added: 'section:added',
    Updated: 'section:updated',
    Deleted: 'section:deleted',
    Archived: 'section:archived',
    Unarchived: 'section:unarchived',
} as const

/** Webhook events that carry a section as their `eventData`. */
export const SECTION_WEBHOOK_EVENTS = [
    SectionWebhookEventEnum.Added,
    SectionWebhookEventEnum.Updated,
    SectionWebhookEventEnum.Deleted,
    SectionWebhookEventEnum.Archived,
    SectionWebhookEventEnum.Unarchived,
] as const satisfies readonly WebhookEvent[]

/**
 * A section as delivered in a webhook payload.
 *
 * Reuses {@link SectionBaseSchema} and overrides `updatedAt` to allow
 * `null` — tombstones and never-updated sections come through without
 * an `updated_at` value. Surfaces the computed `url` so the exposed shape
 * matches {@link Section}.
 */
export const WebhookSectionSchema = SectionBaseSchema.extend({
    updatedAt: z.coerce.date().nullable(),
}).transform((data) => ({
    ...data,
    url: getSectionUrl(data.id, data.name),
}))

/** A section delivered in a webhook payload. */
export type WebhookSection = z.infer<typeof WebhookSectionSchema>

export const SectionAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(SectionWebhookEventEnum.Added),
    eventData: WebhookSectionSchema,
})
export type SectionAddedPayload = z.infer<typeof SectionAddedPayloadSchema>

export const SectionUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(SectionWebhookEventEnum.Updated),
    eventData: WebhookSectionSchema,
})
export type SectionUpdatedPayload = z.infer<typeof SectionUpdatedPayloadSchema>

export const SectionDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(SectionWebhookEventEnum.Deleted),
    eventData: WebhookSectionSchema,
})
export type SectionDeletedPayload = z.infer<typeof SectionDeletedPayloadSchema>

export const SectionArchivedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(SectionWebhookEventEnum.Archived),
    eventData: WebhookSectionSchema,
})
export type SectionArchivedPayload = z.infer<typeof SectionArchivedPayloadSchema>

export const SectionUnarchivedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(SectionWebhookEventEnum.Unarchived),
    eventData: WebhookSectionSchema,
})
export type SectionUnarchivedPayload = z.infer<typeof SectionUnarchivedPayloadSchema>
