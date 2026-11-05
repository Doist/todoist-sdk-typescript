import { z } from 'zod'

export const NavigationFeatureSchema = z.object({
    name: z.string(),
    shown: z.boolean(),
})

export const QuickAddFeatureSchema = z.object({
    name: z.string(),
    shown: z.boolean(),
})

/**
 * Sync API user settings resource.
 */
export const UserSettingsSchema = z.looseObject({
    completedSoundDesktop: z.boolean(),
    completedSoundMobile: z.boolean(),
    debugLogSendingEnabledUntil: z.string().nullish(),
    /**
     * The Pro price version kept for the account, or `0` when none is kept.
     * Version numbers are not sequential, and new ones can appear at any time.
     */
    legacyPricing: z.number().int(),
    navigation: z
        .object({
            countsShown: z.boolean(),
            features: z.array(NavigationFeatureSchema),
        })
        .loose(),
    reminderDesktop: z.boolean(),
    reminderEmail: z.boolean(),
    reminderPush: z.boolean(),
    resetRecurringSubtasks: z.boolean(),
    aiEmailAssist: z.boolean(),
    theme: z.string().nullable().optional(),
    syncTheme: z.boolean().optional(),
    quickAdd: z
        .object({
            labelsShown: z.boolean(),
            features: z.array(QuickAddFeatureSchema),
        })
        .loose(),
})

export type UserSettings = z.infer<typeof UserSettingsSchema>
