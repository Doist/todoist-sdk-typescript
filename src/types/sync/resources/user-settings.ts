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
    legacyPricing: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
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
