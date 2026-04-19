import { z } from 'zod'
import { WebhookEventSchema, WebhookVersionSchema, type WebhookEvent } from '../apps/types'
import { TaskSchema } from '../tasks/types'

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

const BaseWebhookEnvelopeShape = {
    version: WebhookVersionSchema,
    userId: z.string(),
    initiator: WebhookInitiatorSchema,
    triggeredAt: z.coerce.date(),
} as const

function untypedVariant<E extends WebhookEvent>(eventName: E) {
    return z.object({
        ...BaseWebhookEnvelopeShape,
        eventName: z.literal(eventName),
        eventData: z.unknown(),
        eventDataExtra: z.unknown().optional(),
    })
}

/**
 * Possible values for the `updateIntent` field on `item:updated`'s
 * `eventDataExtra`. `item_updated` is the default; the others narrow the
 * reason for the update (for example, a recurring completion or a change of
 * assignee).
 */
export const UPDATE_INTENTS = [
    'item_updated',
    'item_completed',
    'item_uncompleted',
    'responsible_uid_changed',
] as const
/** The reason an `item:updated` event was triggered. */
export type UpdateIntent = (typeof UPDATE_INTENTS)[number]
export const UpdateIntentSchema = z.enum(UPDATE_INTENTS)

/**
 * Optional extra info delivered alongside an `item:updated` event when the
 * initiator is the acting user.
 */
export const ItemUpdatedExtraSchema = z.object({
    oldItem: TaskSchema,
    updateIntent: UpdateIntentSchema,
})

/** Extra info carried on `item:updated` payloads. */
export type ItemUpdatedExtra = z.infer<typeof ItemUpdatedExtraSchema>

// ----- Per-event variant schemas -----

export const ItemAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal('item:added'),
    eventData: TaskSchema,
})
export type ItemAddedPayload = z.infer<typeof ItemAddedPayloadSchema>

export const ItemUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal('item:updated'),
    eventData: TaskSchema,
    eventDataExtra: ItemUpdatedExtraSchema.optional(),
})
export type ItemUpdatedPayload = z.infer<typeof ItemUpdatedPayloadSchema>

export const ItemCompletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal('item:completed'),
    eventData: TaskSchema,
})
export type ItemCompletedPayload = z.infer<typeof ItemCompletedPayloadSchema>

export const ItemUncompletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal('item:uncompleted'),
    eventData: TaskSchema,
})
export type ItemUncompletedPayload = z.infer<typeof ItemUncompletedPayloadSchema>

export const ItemDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal('item:deleted'),
    eventData: TaskSchema,
})
export type ItemDeletedPayload = z.infer<typeof ItemDeletedPayloadSchema>

// ----- Not-yet-typed variants (narrowed in follow-up PRs) -----

/**
 * Wrapper schema for an incoming webhook payload.
 *
 * The backend sends snake_case keys and uses the public event form
 * (`item:added`) in the `event_name` field, so consumers using
 * {@link parseWebhookPayload} receive camelCase fields directly.
 *
 * Typed today: `item:*` events carry a parsed {@link Task}. Other events
 * still expose `eventData` as `unknown`; they will be narrowed in follow-up
 * PRs (notes, projects, sections, labels, filters, reminders).
 */
export const WebhookPayloadSchema = z.discriminatedUnion('eventName', [
    ItemAddedPayloadSchema,
    ItemUpdatedPayloadSchema,
    ItemCompletedPayloadSchema,
    ItemUncompletedPayloadSchema,
    ItemDeletedPayloadSchema,
    untypedVariant('note:added'),
    untypedVariant('note:updated'),
    untypedVariant('note:deleted'),
    untypedVariant('project:added'),
    untypedVariant('project:updated'),
    untypedVariant('project:deleted'),
    untypedVariant('project:archived'),
    untypedVariant('project:unarchived'),
    untypedVariant('section:added'),
    untypedVariant('section:updated'),
    untypedVariant('section:deleted'),
    untypedVariant('section:archived'),
    untypedVariant('section:unarchived'),
    untypedVariant('label:added'),
    untypedVariant('label:updated'),
    untypedVariant('label:deleted'),
    untypedVariant('filter:added'),
    untypedVariant('filter:updated'),
    untypedVariant('filter:deleted'),
    untypedVariant('reminder:fired'),
])

/**
 * A parsed webhook payload. Narrow by `eventName` to access typed
 * `eventData`.
 */
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

export { WebhookEventSchema }
export type { WebhookEvent }
