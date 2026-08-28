import { z } from 'zod'
import { DueDateSchema } from '../../tasks/types'

export const ReminderBaseSchema = z.looseObject({
    id: z.string(),
    notifyUid: z.string(),
    itemId: z.string(),
    projectId: z.string().optional(),
    isDeleted: z.boolean(),
})

/** Enum-like object of reminder type values. */
export const ReminderTypeEnum = {
    Relative: 'relative',
    Absolute: 'absolute',
    Location: 'location',
} as const
/** Available reminder types. */
export const REMINDER_TYPES = [
    ReminderTypeEnum.Relative,
    ReminderTypeEnum.Absolute,
    ReminderTypeEnum.Location,
] as const
/** Discriminator for reminder type. */
export type ReminderType = (typeof REMINDER_TYPES)[number]

/** Available location reminder triggers. */
export const LOCATION_TRIGGERS = ['on_enter', 'on_leave'] as const
/** Trigger condition for a location-based reminder. */
export type LocationTrigger = (typeof LOCATION_TRIGGERS)[number]

export const LocationReminderSchema = ReminderBaseSchema.extend({
    type: z.literal(ReminderTypeEnum.Location),
    name: z.string(),
    locLat: z.string(),
    locLong: z.string(),
    locTrigger: z.enum(LOCATION_TRIGGERS),
    radius: z.number().int(),
})

export type LocationReminder = z.infer<typeof LocationReminderSchema>

export const AbsoluteReminderSchema = ReminderBaseSchema.extend({
    type: z.literal(ReminderTypeEnum.Absolute),
    due: DueDateSchema,
    isUrgent: z.boolean().optional(),
})

export type AbsoluteReminder = z.infer<typeof AbsoluteReminderSchema>

export const RelativeReminderSchema = ReminderBaseSchema.extend({
    type: z.literal(ReminderTypeEnum.Relative),
    minuteOffset: z.number().int(),
    due: DueDateSchema.optional(),
    isUrgent: z.boolean().optional(),
})

export type RelativeReminder = z.infer<typeof RelativeReminderSchema>

export const ReminderSchema = z.discriminatedUnion('type', [
    LocationReminderSchema,
    AbsoluteReminderSchema,
    RelativeReminderSchema,
])

export type Reminder = z.infer<typeof ReminderSchema>

export const SyncAbsoluteReminderSchema = AbsoluteReminderSchema.extend({
    due: DueDateSchema.nullable(),
})

export type SyncAbsoluteReminder = z.infer<typeof SyncAbsoluteReminderSchema>

export const SyncRelativeReminderSchema = RelativeReminderSchema.extend({
    due: DueDateSchema.nullable().optional(),
})

export type SyncRelativeReminder = z.infer<typeof SyncRelativeReminderSchema>

export const SyncReminderSchema = z.discriminatedUnion('type', [
    LocationReminderSchema,
    SyncAbsoluteReminderSchema,
    SyncRelativeReminderSchema,
])

export type SyncReminder = z.infer<typeof SyncReminderSchema>
