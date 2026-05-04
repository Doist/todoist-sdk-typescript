import { z } from 'zod'
import { PREMIUM_STATUSES } from '../../users/types'
import {
    BooleanFromZeroOneSchema,
    DateFormatSchema,
    DayOfWeekSchema,
    TimeFormatSchema,
} from '../user-preferences'

export const FeaturesSchema = z.looseObject({
    karmaDisabled: z.boolean(),
    restriction: z.number().int(),
    karmaVacation: z.boolean(),
    dateistLang: z.any(),
    beta: BooleanFromZeroOneSchema,
    hasPushReminders: z.boolean(),
    dateistInlineDisabled: z.boolean(),
    autoInviteDisabled: z.boolean().optional(),
    goldTheme: z.boolean().optional(),
    migratedFromTdb: z.boolean().optional(),
})

export const TzInfoSchema = z.looseObject({
    timezone: z.string(),
    hours: z.number().int(),
    minutes: z.number().int(),
    isDst: BooleanFromZeroOneSchema,
    gmtString: z.string(),
})

export const JoinableWorkspaceSchema = z.looseObject({
    workspaceId: z.string(),
    workspaceName: z.string(),
    memberCount: z.number().int(),
})

export const GettingStartedGuideProjectSchema = z.looseObject({
    onboardingUseCase: z.string(),
    projectId: z.string(),
    completed: z.boolean(),
    closed: z.boolean(),
})

/**
 * Sync API user resource.
 *
 * This is a superset of the REST `CurrentUserSchema` — the Sync API returns
 * many additional fields for features, onboarding state, and account details.
 */
export const SyncUserSchema = z.looseObject({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    activatedUser: z.boolean(),
    autoReminder: z.number().int(),
    avatarBig: z.string().optional(),
    avatarMedium: z.string().optional(),
    avatarS640: z.string().optional(),
    avatarSmall: z.string().optional(),
    businessAccountId: z.string().nullable(),
    dailyGoal: z.number().int(),
    dateFormat: DateFormatSchema,
    dateistLang: z.string().nullish(),
    daysOff: z.array(z.number().int()),
    featureIdentifier: z.string(),
    features: FeaturesSchema,
    freeTrailExpires: z.coerce.date().optional(),
    hasMagicNumber: z.boolean(),
    hasPassword: z.boolean(),
    hasStartedATrial: z.boolean().optional(),
    imageId: z.string().nullable(),
    inboxProjectId: z.string(),
    isCelebrationsEnabled: z.boolean(),
    isPremium: z.boolean(),
    joinableWorkspace: JoinableWorkspaceSchema.nullable(),
    joinedAt: z.coerce.date(),
    gettingStartedGuideProjects: z.array(GettingStartedGuideProjectSchema).nullable(),
    karma: z.number(),
    karmaTrend: z.string(),
    lang: z.string(),
    mfaEnabled: z.boolean().optional(),
    mobileHost: z.string().nullish(),
    mobileNumber: z.string().nullish(),
    nextWeek: DayOfWeekSchema,
    onboardingLevel: z.string().nullable().optional(),
    onboardingRole: z.string().nullable().optional(),
    onboardingPersona: z.string().nullable().optional(),
    onboardingInitiated: z.boolean().nullable().optional(),
    onboardingCompleted: z.boolean().nullable().optional(),
    onboardingSkipped: z.boolean().optional(),
    onboardingTeamMode: z.boolean().nullable().optional(),
    onboardingUseCases: z.array(z.string()).nullable().optional(),
    premiumStatus: z.enum(PREMIUM_STATUSES),
    premiumUntil: z.coerce.date().nullable(),
    rambleSessionsUsage: z
        .object({
            currentCount: z.number().int(),
            limit: z.number().int(),
            remaining: z.number().int(),
            resetDate: z.coerce.date(),
        })
        .nullable()
        .optional(),
    shareLimit: z.number().int(),
    sortOrder: z.number().int(),
    startDay: DayOfWeekSchema,
    startPage: z.string(),
    themeId: z.string(),
    timeFormat: TimeFormatSchema,
    token: z.string().optional(),
    tzInfo: TzInfoSchema,
    uniquePrefix: z.number().int(),
    verificationStatus: z.string(),
    websocketUrl: z.string(),
    weekendStartDay: z.number().int(),
    weeklyGoal: z.number().int(),
})

export type SyncUser = z.infer<typeof SyncUserSchema>
