import { z } from 'zod'
import { type WebhookEvent } from '../apps/types'
import { AttachmentSchema } from '../comments/types'
import { TaskSchema } from '../tasks/types'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of comment (`note:*`) webhook event names. Single source
 * of truth for the discriminator values — `COMMENT_WEBHOOK_EVENTS` and every
 * `z.literal()` below derive from it.
 *
 * The on-the-wire event names remain `note:*` for historical reasons; the
 * SDK types use `Comment*` to match the rest of the public API where the
 * resource is named `Comment`.
 */
export const CommentWebhookEventEnum = {
    Added: 'note:added',
    Updated: 'note:updated',
    Deleted: 'note:deleted',
} as const

/**
 * Webhook events that carry a comment as their `eventData`.
 */
export const COMMENT_WEBHOOK_EVENTS = [
    CommentWebhookEventEnum.Added,
    CommentWebhookEventEnum.Updated,
    CommentWebhookEventEnum.Deleted,
] as const satisfies readonly WebhookEvent[]

/**
 * Fields common to both item and project comment payloads.
 *
 * `postedAt` and `postedUid` are nullable here (unlike
 * {@link RawCommentSchema}) because webhook payloads may omit them — for
 * example when the poster could not be resolved, or on a deleted-note
 * tombstone.
 */
const WebhookCommentBaseSchema = z.object({
    id: z.string(),
    content: z.string(),
    postedAt: z.coerce.date().nullable(),
    postedUid: z.string().nullable(),
    fileAttachment: AttachmentSchema.nullable(),
    uidsToNotify: z.array(z.string()).nullable(),
    reactions: z.record(z.string(), z.array(z.string())).nullable(),
    isDeleted: z.boolean(),
})

/**
 * A comment attached to a task, delivered in a webhook payload.
 *
 * Webhook item-comment payloads carry two fields that don't appear on the
 * REST comment resource: `url` (the direct task URL) and `item` (the full
 * embedded {@link Task}). Both are parsed here so consumers handling a
 * `note:added` event also get the task it belongs to.
 *
 * `itemId` is exposed as `taskId` to match the rest of the SDK surface.
 */
export const WebhookItemCommentSchema = WebhookCommentBaseSchema.extend({
    itemId: z.string(),
    url: z.string(),
    item: TaskSchema,
}).transform(({ itemId, ...rest }) => ({
    ...rest,
    taskId: itemId,
}))

/** A comment attached to a task, delivered in a webhook payload. */
export type WebhookItemComment = z.infer<typeof WebhookItemCommentSchema>

/**
 * A comment attached to a project, delivered in a webhook payload.
 *
 * Project comments do not carry the extra `url` or embedded project fields
 * that item comments carry for the parent task.
 */
export const WebhookProjectCommentSchema = WebhookCommentBaseSchema.extend({
    projectId: z.string(),
})

/** A comment attached to a project, delivered in a webhook payload. */
export type WebhookProjectComment = z.infer<typeof WebhookProjectCommentSchema>

/**
 * The `eventData` of a `note:*` webhook payload — either an item comment
 * (includes `taskId` and an embedded {@link Task}) or a project comment
 * (includes `projectId`). Narrow with `'taskId' in eventData`.
 */
export const WebhookCommentSchema = z.union([WebhookItemCommentSchema, WebhookProjectCommentSchema])

/** A comment delivered in a webhook payload. */
export type WebhookComment = z.infer<typeof WebhookCommentSchema>

export const CommentAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(CommentWebhookEventEnum.Added),
    eventData: WebhookCommentSchema,
})
export type CommentAddedPayload = z.infer<typeof CommentAddedPayloadSchema>

export const CommentUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(CommentWebhookEventEnum.Updated),
    eventData: WebhookCommentSchema,
})
export type CommentUpdatedPayload = z.infer<typeof CommentUpdatedPayloadSchema>

export const CommentDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(CommentWebhookEventEnum.Deleted),
    eventData: WebhookCommentSchema,
})
export type CommentDeletedPayload = z.infer<typeof CommentDeletedPayloadSchema>
