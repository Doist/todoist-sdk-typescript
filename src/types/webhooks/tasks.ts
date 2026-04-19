import { z } from 'zod'
import { type WebhookEvent } from '../apps/types'
import { TaskSchema } from '../tasks/types'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of task (`item:*`) webhook event names. Single source of
 * truth for the discriminator values — `TASK_WEBHOOK_EVENTS` and every
 * `z.literal()` below derive from it.
 */
export const TaskWebhookEventEnum = {
    Added: 'item:added',
    Updated: 'item:updated',
    Completed: 'item:completed',
    Uncompleted: 'item:uncompleted',
    Deleted: 'item:deleted',
} as const

/**
 * Webhook events that carry a {@link Task} as their `eventData`.
 *
 * The on-the-wire event names remain `item:*` for historical reasons; the
 * SDK types call them `Task*` to match the rest of the public API where the
 * resource is named `Task`.
 */
export const TASK_WEBHOOK_EVENTS = [
    TaskWebhookEventEnum.Added,
    TaskWebhookEventEnum.Updated,
    TaskWebhookEventEnum.Completed,
    TaskWebhookEventEnum.Uncompleted,
    TaskWebhookEventEnum.Deleted,
] as const satisfies readonly WebhookEvent[]

/**
 * Possible values for the `updateIntent` field on `item:updated`'s
 * `eventDataExtra`. `item_updated` is the default; the others narrow the
 * reason for the update (for example, a recurring completion or a change of
 * assignee).
 *
 * @see https://developer.todoist.com/sync/v1/#webhooks (Events Extra)
 */
export const UPDATE_INTENTS = [
    'item_updated',
    'item_completed',
    'item_uncompleted',
    'responsible_uid_changed',
] as const
/** The reason an `item:updated` event was triggered. */
export type UpdateIntent = (typeof UPDATE_INTENTS)[number]
/**
 * An unrecognised value from a future backend release degrades gracefully to
 * `'item_updated'` rather than crashing the whole payload parse.
 */
export const UpdateIntentSchema = z.enum(UPDATE_INTENTS).catch('item_updated')

/**
 * Extra info delivered alongside an `item:updated` event when the initiator
 * is the acting user. Contains the pre-update task state plus the reason for
 * the update — useful for diffing or for distinguishing manual edits from
 * recurring-task completions.
 *
 * @see https://developer.todoist.com/sync/v1/#webhooks (Events Extra)
 */
export const TaskUpdatedExtraSchema = z.object({
    oldItem: TaskSchema,
    updateIntent: UpdateIntentSchema,
})

/** Extra info carried on `item:updated` payloads. */
export type TaskUpdatedExtra = z.infer<typeof TaskUpdatedExtraSchema>

export const TaskAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(TaskWebhookEventEnum.Added),
    eventData: TaskSchema,
})
export type TaskAddedPayload = z.infer<typeof TaskAddedPayloadSchema>

export const TaskUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(TaskWebhookEventEnum.Updated),
    eventData: TaskSchema,
    eventDataExtra: TaskUpdatedExtraSchema.optional(),
})
export type TaskUpdatedPayload = z.infer<typeof TaskUpdatedPayloadSchema>

export const TaskCompletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(TaskWebhookEventEnum.Completed),
    eventData: TaskSchema,
})
export type TaskCompletedPayload = z.infer<typeof TaskCompletedPayloadSchema>

export const TaskUncompletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(TaskWebhookEventEnum.Uncompleted),
    eventData: TaskSchema,
})
export type TaskUncompletedPayload = z.infer<typeof TaskUncompletedPayloadSchema>

export const TaskDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(TaskWebhookEventEnum.Deleted),
    eventData: TaskSchema,
})
export type TaskDeletedPayload = z.infer<typeof TaskDeletedPayloadSchema>
