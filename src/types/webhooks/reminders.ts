import { z } from 'zod'
import { type WebhookEvent } from '../apps/types'
import { REMINDER_TYPES, ReminderBaseSchema } from '../sync/resources/reminders'
import { DueDateSchema } from '../tasks/types'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of reminder (`reminder:*`) webhook event names. Single
 * source of truth for the discriminator values — `REMINDER_WEBHOOK_EVENTS`
 * and every `z.literal()` below derive from it.
 */
export const ReminderWebhookEventEnum = {
    Fired: 'reminder:fired',
} as const

/** Webhook events that carry a fired-reminder as their `eventData`. */
export const REMINDER_WEBHOOK_EVENTS = [
    ReminderWebhookEventEnum.Fired,
] as const satisfies readonly WebhookEvent[]

/**
 * A fired-reminder notification as delivered in a webhook payload.
 *
 * `reminder:fired` carries a subset of the full Reminder record (closer
 * to a fired-notification projection), so it doesn't line up with any of
 * the {@link Reminder} discriminated variants directly. This schema
 * reuses {@link ReminderBaseSchema} for the common identity fields and
 * adds the fields always present on a fired notification.
 */
export const WebhookFiredReminderSchema = ReminderBaseSchema.extend({
    type: z.enum(REMINDER_TYPES),
    isUrgent: z.boolean(),
    minuteOffset: z.number().int().nullable(),
    due: DueDateSchema.nullable(),
})

/** A fired-reminder notification delivered in a webhook payload. */
export type WebhookFiredReminder = z.infer<typeof WebhookFiredReminderSchema>

export const ReminderFiredPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(ReminderWebhookEventEnum.Fired),
    eventData: WebhookFiredReminderSchema,
})
export type ReminderFiredPayload = z.infer<typeof ReminderFiredPayloadSchema>
