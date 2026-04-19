import { z } from 'zod'
import { WEBHOOK_EVENTS, WebhookEventSchema, type WebhookEvent } from '../apps/types'
import {
    COMMENT_WEBHOOK_EVENTS,
    CommentAddedPayloadSchema,
    CommentDeletedPayloadSchema,
    CommentUpdatedPayloadSchema,
} from './comments'
import { BaseWebhookEnvelopeShape } from './envelope'
import {
    LABEL_WEBHOOK_EVENTS,
    LabelAddedPayloadSchema,
    LabelDeletedPayloadSchema,
    LabelUpdatedPayloadSchema,
} from './labels'
import {
    PROJECT_WEBHOOK_EVENTS,
    ProjectAddedPayloadSchema,
    ProjectArchivedPayloadSchema,
    ProjectDeletedPayloadSchema,
    ProjectUnarchivedPayloadSchema,
    ProjectUpdatedPayloadSchema,
} from './projects'
import {
    SECTION_WEBHOOK_EVENTS,
    SectionAddedPayloadSchema,
    SectionArchivedPayloadSchema,
    SectionDeletedPayloadSchema,
    SectionUnarchivedPayloadSchema,
    SectionUpdatedPayloadSchema,
} from './sections'
import {
    TASK_WEBHOOK_EVENTS,
    TaskAddedPayloadSchema,
    TaskCompletedPayloadSchema,
    TaskDeletedPayloadSchema,
    TaskUncompletedPayloadSchema,
    TaskUpdatedPayloadSchema,
} from './tasks'

/**
 * Events whose payloads have been narrowed per resource. Each phase adds to
 * this list; {@link UntypedWebhookPayloadSchema} below is derived by taking
 * every {@link WebhookEvent} not present here.
 */
const TYPED_WEBHOOK_EVENTS = [
    ...TASK_WEBHOOK_EVENTS,
    ...COMMENT_WEBHOOK_EVENTS,
    ...LABEL_WEBHOOK_EVENTS,
    ...PROJECT_WEBHOOK_EVENTS,
    ...SECTION_WEBHOOK_EVENTS,
] as const satisfies readonly WebhookEvent[]

/**
 * Webhook events whose `eventData` has not yet been narrowed per resource.
 * Derived from {@link WEBHOOK_EVENTS} so there is a single source of truth:
 * adding a new event to the shared constant automatically flows through to
 * the payload schema.
 */
type UntypedWebhookEvent = Exclude<WebhookEvent, (typeof TYPED_WEBHOOK_EVENTS)[number]>

const untypedEventNames = WEBHOOK_EVENTS.filter(
    (event): event is UntypedWebhookEvent =>
        !(TYPED_WEBHOOK_EVENTS as readonly WebhookEvent[]).includes(event),
)

/**
 * A single branch covering every event whose payload has not yet been typed
 * per resource. Follow-up PRs will replace slices of this with dedicated
 * variants (filters, reminders).
 */
export const UntypedWebhookPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.enum(untypedEventNames as [UntypedWebhookEvent, ...UntypedWebhookEvent[]]),
    eventData: z.unknown(),
    eventDataExtra: z.unknown().optional(),
})

/**
 * Wrapper schema for an incoming webhook payload.
 *
 * The backend sends snake_case keys and uses the public event form
 * (`item:added`) in the `event_name` field, so consumers using
 * `parseWebhookPayload` receive camelCase fields directly.
 *
 * Typed today: `item:*` events carry a parsed {@link Task}; `note:*` events
 * carry a parsed comment (item-comment or project-comment); `label:*` events
 * carry a parsed label; `project:*` events carry a parsed {@link Project}
 * (personal or workspace); `section:*` events carry a parsed
 * {@link WebhookSection}. Other events still expose `eventData` as
 * `unknown`; they will be narrowed in follow-up PRs (filters, reminders).
 */
export const WebhookPayloadSchema = z.discriminatedUnion('eventName', [
    TaskAddedPayloadSchema,
    TaskUpdatedPayloadSchema,
    TaskCompletedPayloadSchema,
    TaskUncompletedPayloadSchema,
    TaskDeletedPayloadSchema,
    CommentAddedPayloadSchema,
    CommentUpdatedPayloadSchema,
    CommentDeletedPayloadSchema,
    LabelAddedPayloadSchema,
    LabelUpdatedPayloadSchema,
    LabelDeletedPayloadSchema,
    ProjectAddedPayloadSchema,
    ProjectUpdatedPayloadSchema,
    ProjectDeletedPayloadSchema,
    ProjectArchivedPayloadSchema,
    ProjectUnarchivedPayloadSchema,
    SectionAddedPayloadSchema,
    SectionUpdatedPayloadSchema,
    SectionDeletedPayloadSchema,
    SectionArchivedPayloadSchema,
    SectionUnarchivedPayloadSchema,
    UntypedWebhookPayloadSchema,
])

/**
 * A parsed webhook payload. Narrow by `eventName` to access typed
 * `eventData`.
 */
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

export { WebhookEventSchema }
export type { WebhookEvent }
