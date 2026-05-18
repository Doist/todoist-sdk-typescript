import { z } from 'zod'

import { GoalSchema } from '../goals/types'
import { LabelSchema } from '../labels/types'
import { ProjectSchema } from '../projects/types'
import { SectionSchema } from '../sections/types'
import { TaskSchema } from '../tasks/types'
import { WorkspaceUserSchema } from '../workspaces/types'
import {
    FilterSchema,
    CollaboratorSchema,
    CollaboratorStateSchema,
    FolderSchema,
    NoteSchema,
    TooltipsSchema,
    WorkspaceFilterSchema,
    WorkspaceGoalSchema,
    CalendarSchema,
    CalendarAccountSchema,
    ReminderSchema,
    LocationReminderSchema,
    CompletedInfoSchema,
    ViewOptionsSchema,
    ProjectViewOptionsDefaultsSchema,
    UserPlanLimitsSchema,
    LiveNotificationSchema,
    SyncWorkspaceSchema,
    SyncUserSchema,
    UserSettingsSchema,
    SuggestionSchema,
} from './resources'

export const SyncErrorSchema = z.object({
    error: z.string(),
    errorCode: z.number(),
    errorExtra: z.record(z.string(), z.unknown()),
    errorTag: z.string(),
    httpCode: z.number(),
})

export type SyncError = z.infer<typeof SyncErrorSchema>

export const SyncResponseSchema = z.looseObject({
    syncToken: z.string().optional(),
    fullSync: z.boolean().optional(),
    syncStatus: z.record(z.string(), z.union([z.literal('ok'), SyncErrorSchema])).optional(),
    tempIdMapping: z.record(z.string(), z.string()).optional(),
    items: z.array(TaskSchema).optional(),
    projects: z.array(ProjectSchema).optional(),
    sections: z.array(SectionSchema).optional(),
    labels: z.array(LabelSchema).optional(),
    notes: z.array(NoteSchema).optional(),
    projectNotes: z.array(NoteSchema).optional(),
    filters: z.array(FilterSchema).optional(),
    reminders: z.array(ReminderSchema).optional(),
    remindersLocation: z.array(LocationReminderSchema).optional(),
    locations: z.array(z.record(z.string(), z.unknown())).optional(),
    user: SyncUserSchema.optional(),
    liveNotifications: z.array(LiveNotificationSchema).optional(),
    collaborators: z.array(CollaboratorSchema).optional(),
    collaboratorStates: z.array(CollaboratorStateSchema).optional(),
    userSettings: UserSettingsSchema.optional(),
    notificationSettings: z.record(z.string(), z.boolean()).optional(),
    userPlanLimits: UserPlanLimitsSchema.optional(),
    completedInfo: z.array(CompletedInfoSchema).optional(),
    stats: z.record(z.string(), z.unknown()).optional(),
    workspaces: z.array(SyncWorkspaceSchema).optional(),
    workspaceUsers: z.array(WorkspaceUserSchema).optional(),
    workspaceFilters: z.array(WorkspaceFilterSchema).optional(),
    viewOptions: z.array(ViewOptionsSchema).optional(),
    projectViewOptionsDefaults: z.array(ProjectViewOptionsDefaultsSchema).optional(),
    roleActions: z.array(z.record(z.string(), z.unknown())).optional(),
    folders: z.array(FolderSchema).optional(),
    goals: z.array(GoalSchema).optional(),
    workspaceGoals: z.array(WorkspaceGoalSchema).optional(),
    dayOrders: z.record(z.string(), z.number()).optional(),
    calendars: z.array(CalendarSchema).optional(),
    calendarAccounts: z.array(CalendarAccountSchema).optional(),
    suggestions: z.array(SuggestionSchema).optional(),
    tooltips: TooltipsSchema.optional(),
})

export type SyncResponse = z.infer<typeof SyncResponseSchema>
