import type { DateFormat, DayOfWeek, TimeFormat } from '../user-preferences'

export type UserStatusEffectArgs = {
    scope?: { mode?: string }
}

/** Only supplied fields change. Null removes optional fields and effects. */
export type UserStatusArgs = {
    /** Required when creating a status; omit to preserve the existing message. */
    message?: string
    emoji?: string | null
    /** Must be in the future; null removes expiry, omission preserves it. Dates are sent as ISO strings. */
    activeUntil?: Date | string | null
    /** Supplied effects are merged; null clears all effects, omission or {} preserves them. */
    effects?: {
        /** Null removes the effect; {} preserves its configuration or enables it with defaults. */
        pauseNotifications?: UserStatusEffectArgs | null
        /** Null removes the effect; {} preserves its configuration or enables it with defaults. */
        pauseActivity?: UserStatusEffectArgs | null
    } | null
}

export type UserUpdateArgs = {
    fullName?: string
    autoReminder?: number
    dateFormat?: DateFormat
    nextWeek?: DayOfWeek
    startDay?: DayOfWeek
    startPage?: string
    themeId?: string
    timeFormat?: TimeFormat
    timezone?: string
    /** `null` clears the status; omitting it leaves the current status unchanged. */
    status?: UserStatusArgs | null
}

export type DeleteCollaboratorArgs = {
    projectId: string
    email: string
}

export type IdMappingArgs = {
    items?: Record<string, string>
    sections?: Record<string, string>
    notes?: Record<string, string>
    reminders?: Record<string, string>
}

export type SuggestionDeleteArgs = {
    type: 'templates'
}

export type UserSettingsUpdateArgs = {
    reminderPush?: boolean
    reminderDesktop?: boolean
    reminderEmail?: boolean
    completedSoundDesktop?: boolean
    completedSoundMobile?: boolean
}

export type UpdateGoalsArgs = {
    dailyGoal?: number
    weeklyGoal?: number
    ignoreDays?: DayOfWeek[]
    vacationMode?: boolean
    karmaDisabled?: boolean
}
