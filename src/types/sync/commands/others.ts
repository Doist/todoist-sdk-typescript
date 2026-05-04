import type { DateFormat, DayOfWeek, TimeFormat } from '../user-preferences'

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
