import { z } from 'zod'

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
})
/**
 * Represents a user in Todoist (simplified for collaborators).
 * @see https://developer.todoist.com/api/v1/#tag/User
 */
export type User = z.infer<typeof UserSchema>

export const TimezoneInfoSchema = z.object({
    gmtString: z.string(),
    hours: z.number().int(),
    isDst: z.number().int(),
    minutes: z.number().int(),
    timezone: z.string(),
})

/** Available user premium statuses. */
export const PREMIUM_STATUSES = [
    'not_premium',
    'current_personal_plan',
    'legacy_personal_plan',
    'teams_business_member',
] as const
/** Premium subscription status of a user. */
export type PremiumStatus = (typeof PREMIUM_STATUSES)[number]

export const CurrentUserSchema = z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    avatarBig: z.string().nullish(),
    avatarMedium: z.string().nullish(),
    avatarS640: z.string().nullish(),
    avatarSmall: z.string().nullish(),
    businessAccountId: z.string().nullable(),
    isPremium: z.boolean(),
    premiumStatus: z.enum(PREMIUM_STATUSES),
    dateFormat: z.number().int(),
    timeFormat: z.number().int(),
    weeklyGoal: z.number().int(),
    dailyGoal: z.number().int(),
    completedCount: z.number().int(),
    completedToday: z.number().int(),
    karma: z.number(),
    karmaTrend: z.string(),
    lang: z.string(),
    nextWeek: z.number().int(),
    startDay: z.number().int(),
    startPage: z.string(),
    tzInfo: TimezoneInfoSchema,
    inboxProjectId: z.string(),
    daysOff: z.array(z.number().int()),
    weekendStartDay: z.number().int(),
    websocketUrl: z.string().optional(),
})
/**
 * Represents the current authenticated user with detailed information.
 * @see https://developer.todoist.com/api/v1/#tag/User
 */
export type CurrentUser = z.infer<typeof CurrentUserSchema>
