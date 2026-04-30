import { z } from 'zod'
import { BooleanFromZeroOneSchema } from '../sync/user-preferences'

export const StreakSchema = z.object({
    count: z.number(),
    start: z.string(),
    end: z.string(),
})

export const CompletedItemSchema = z.object({
    id: z.string(),
    completed: z.number(),
})

export const ItemsWithDateSchema = z.object({
    items: z.array(CompletedItemSchema),
    totalCompleted: z.number(),
})

export const KarmaUpdateSchema = z.object({
    time: z.string(),
    newKarma: z.number(),
    positiveKarma: z.number(),
    negativeKarma: z.number(),
    positiveKarmaReasons: z.array(z.any()),
    negativeKarmaReasons: z.array(z.any()),
})

export const ProductivityStatsSchema = z.object({
    completedCount: z.number(),
    daysItems: z.array(
        ItemsWithDateSchema.extend({
            date: z.string(),
        }),
    ),
    goals: z.object({
        currentDailyStreak: StreakSchema,
        currentWeeklyStreak: StreakSchema,
        dailyGoal: z.number(),
        ignoreDays: z.array(z.number()),
        karmaDisabled: BooleanFromZeroOneSchema,
        lastDailyStreak: StreakSchema,
        lastWeeklyStreak: StreakSchema,
        maxDailyStreak: StreakSchema,
        maxWeeklyStreak: StreakSchema,
        user: z.string(),
        userId: z.string(),
        vacationMode: BooleanFromZeroOneSchema,
        weeklyGoal: z.number(),
    }),
    karma: z.number(),
    karmaGraphData: z.array(
        z.object({
            date: z.string(),
            karmaAvg: z.number(),
        }),
    ),
    karmaLastUpdate: z.number(),
    karmaTrend: z.string(),
    karmaUpdateReasons: z.array(KarmaUpdateSchema),
    projectColors: z.record(z.string(), z.string()),
    weekItems: z.array(
        ItemsWithDateSchema.extend({
            from: z.string(),
            to: z.string(),
        }),
    ),
})

/**
 * Represents the Productivity stats for the authenticated user.
 * @see https://developer.todoist.com/api/v1/#tag/User/operation/get_productivity_stats_api_v1_tasks_completed_stats_get
 */
export type ProductivityStats = z.infer<typeof ProductivityStatsSchema>

export const ColorSchema = z.object({
    /** The key of the color (i.e. 'berry_red') */
    key: z.string(),
    /** The display name of the color (i.e. 'Berry Red') */
    displayName: z.string(),
    /** The hex value of the color (i.e. '#b8255f') */
    hexValue: z.string(),
})
/**
 * Represents a color in Todoist.
 * @see https://developer.todoist.com/api/v1/#tag/Colors
 */
export type Color = z.infer<typeof ColorSchema>
