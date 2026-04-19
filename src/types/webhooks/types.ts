import { z } from 'zod'
import { WebhookEventSchema, type WebhookEvent } from '../apps/types'
import {
    CommentAddedPayloadSchema,
    CommentDeletedPayloadSchema,
    CommentUpdatedPayloadSchema,
} from './comments'
import {
    FilterAddedPayloadSchema,
    FilterDeletedPayloadSchema,
    FilterUpdatedPayloadSchema,
} from './filters'
import {
    LabelAddedPayloadSchema,
    LabelDeletedPayloadSchema,
    LabelUpdatedPayloadSchema,
} from './labels'
import {
    ProjectAddedPayloadSchema,
    ProjectArchivedPayloadSchema,
    ProjectDeletedPayloadSchema,
    ProjectUnarchivedPayloadSchema,
    ProjectUpdatedPayloadSchema,
} from './projects'
import { ReminderFiredPayloadSchema } from './reminders'
import {
    SectionAddedPayloadSchema,
    SectionArchivedPayloadSchema,
    SectionDeletedPayloadSchema,
    SectionUnarchivedPayloadSchema,
    SectionUpdatedPayloadSchema,
} from './sections'
import {
    TaskAddedPayloadSchema,
    TaskCompletedPayloadSchema,
    TaskDeletedPayloadSchema,
    TaskUncompletedPayloadSchema,
    TaskUpdatedPayloadSchema,
} from './tasks'

/**
 * Wrapper schema for an incoming webhook payload.
 *
 * The backend sends snake_case keys and uses the public event form
 * (`item:added`) in the `event_name` field, so consumers using
 * `parseWebhookPayload` receive camelCase fields directly.
 *
 * Every {@link WebhookEvent} is typed today: `item:*` events carry a parsed
 * {@link Task}; `note:*` events carry a parsed comment (item-comment or
 * project-comment); `label:*` events carry a parsed label; `project:*`
 * events carry a parsed {@link Project} (personal or workspace);
 * `section:*` events carry a parsed {@link WebhookSection}; `filter:*`
 * events carry a parsed {@link Filter}; `reminder:fired` carries a parsed
 * {@link WebhookFiredReminder}.
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
    FilterAddedPayloadSchema,
    FilterUpdatedPayloadSchema,
    FilterDeletedPayloadSchema,
    ReminderFiredPayloadSchema,
])

/**
 * A parsed webhook payload. Narrow by `eventName` to access typed
 * `eventData`.
 */
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

export { WebhookEventSchema }
export type { WebhookEvent }
