import { z } from 'zod'
import { WEBHOOK_EVENTS, WebhookEventSchema, type WebhookEvent } from '../apps/types'
import { BaseWebhookEnvelopeShape } from './envelope'
import {
    TASK_WEBHOOK_EVENTS,
    TaskAddedPayloadSchema,
    TaskCompletedPayloadSchema,
    TaskDeletedPayloadSchema,
    TaskUncompletedPayloadSchema,
    TaskUpdatedPayloadSchema,
} from './tasks'

/**
 * Webhook events whose `eventData` has not yet been narrowed per resource.
 * Derived from {@link WEBHOOK_EVENTS} so there is a single source of truth:
 * adding a new event to the shared constant automatically flows through to
 * the payload schema.
 */
type UntypedWebhookEvent = Exclude<WebhookEvent, (typeof TASK_WEBHOOK_EVENTS)[number]>

const untypedEventNames = WEBHOOK_EVENTS.filter(
    (event): event is UntypedWebhookEvent =>
        !(TASK_WEBHOOK_EVENTS as readonly WebhookEvent[]).includes(event),
)

/**
 * A single branch covering every event whose payload has not yet been typed
 * per resource. Follow-up PRs will replace slices of this with dedicated
 * variants (notes, projects, sections, labels, filters, reminders).
 */
const UntypedWebhookPayloadSchema = z.object({
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
 * Typed today: `item:*` events carry a parsed {@link Task}. Other events
 * still expose `eventData` as `unknown`; they will be narrowed in follow-up
 * PRs (notes, projects, sections, labels, filters, reminders).
 */
export const WebhookPayloadSchema = z.discriminatedUnion('eventName', [
    TaskAddedPayloadSchema,
    TaskUpdatedPayloadSchema,
    TaskCompletedPayloadSchema,
    TaskUncompletedPayloadSchema,
    TaskDeletedPayloadSchema,
    UntypedWebhookPayloadSchema,
])

/**
 * A parsed webhook payload. Narrow by `eventName` to access typed
 * `eventData`.
 */
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

export { WebhookEventSchema }
export type { WebhookEvent }
