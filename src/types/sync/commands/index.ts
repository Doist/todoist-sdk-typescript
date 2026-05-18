import type {
    CalendarUpdateArgs,
    CalendarAccountUpdateArgs,
    CalendarAccountRestoreTaskCalendarArgs,
} from './calendars'
import type {
    FilterAddArgs,
    FilterUpdateArgs,
    FilterUpdateOrdersArgs,
    FilterDeleteArgs,
} from './filters'
import type { FolderAddArgs, FolderUpdateArgs, FolderDeleteArgs } from './folders'
import type {
    GoalAddArgs,
    GoalUpdateArgs,
    GoalCompleteArgs,
    GoalUncompleteArgs,
    GoalDeleteArgs,
    GoalLinkItemArgs,
    GoalUnlinkItemArgs,
} from './goals'
import type {
    LabelAddArgs,
    LabelRenameArgs,
    LabelUpdateArgs,
    LabelUpdateOrdersArgs,
    LabelDeleteArgs,
    LabelDeleteOccurrencesArgs,
} from './labels'
import type {
    NoteAddArgs,
    NoteUpdateArgs,
    NoteDeleteArgs,
    NoteReactionAddArgs,
    NoteReactionRemoveArgs,
} from './notes'
import type {
    LiveNotificationsMarkUnreadArgs,
    LiveNotificationsMarkReadArgs,
    LiveNotificationsMarkReadAllArgs,
    LiveNotificationsSetLastReadArgs,
} from './notifications'
import type {
    UserUpdateArgs,
    DeleteCollaboratorArgs,
    IdMappingArgs,
    SuggestionDeleteArgs,
    UserSettingsUpdateArgs,
    UpdateGoalsArgs,
} from './others'
import type { ProjectViewOptionsDefaultsSetArgs } from './project-view-options'
import type {
    ProjectAddArgs,
    ProjectUpdateArgs,
    ProjectMoveArgs,
    ProjectReorderArgs,
    ShareProjectArgs,
    ProjectLeaveArgs,
    ProjectArchiveArgs,
    ProjectUnarchiveArgs,
    ProjectDeleteArgs,
    ProjectMoveToWorkspaceArgs,
    ProjectMoveToPersonalArgs,
} from './projects'
import type { ReminderAddArgs, ReminderUpdateArgs, ReminderDeleteArgs } from './reminders'
import type {
    SectionAddArgs,
    SectionUpdateArgs,
    SectionMoveArgs,
    SectionReorderArgs,
    SectionArchiveArgs,
    SectionUnarchiveArgs,
    SectionDeleteArgs,
} from './sections'
import type {
    AcceptInvitationArgs,
    RejectInvitationArgs,
    BizAcceptInvitationArgs,
    BizRejectInvitationArgs,
} from './sharing'
import type {
    TaskAddArgs,
    TaskUpdateArgs,
    TaskCompleteArgs,
    TaskCompleteUndoArgs,
    TaskMoveArgs,
    TaskReorderArgs,
    TaskUncompleteArgs,
    TaskUpdateDateCompleteArgs,
    TaskDeleteArgs,
    TaskUpdateDayOrderArgs,
} from './tasks'
import type { ViewOptionsSetArgs, ViewOptionsDeleteArgs } from './view-options'
import type {
    WorkspaceFilterAddArgs,
    WorkspaceFilterUpdateArgs,
    WorkspaceFilterUpdateOrdersArgs,
    WorkspaceFilterDeleteArgs,
} from './workspace-filters'
import type {
    WorkspaceGoalAddArgs,
    WorkspaceGoalUpdateArgs,
    WorkspaceGoalDeleteArgs,
    WorkspaceGoalProjectAddArgs,
    WorkspaceGoalProjectRemoveArgs,
} from './workspace-goals'
import type {
    WorkspaceAddArgs,
    WorkspaceUpdateArgs,
    WorkspaceDeleteArgs,
    WorkspaceUpdateUserArgs,
    WorkspaceDeleteUserArgs,
    WorkspaceLeaveArgs,
    WorkspaceInviteArgs,
    WorkspaceSetDefaultOrderArgs,
    WorkspaceUpdateUserProjectSortPreferenceArgs,
} from './workspaces'

/**
 * Maps each Sync API command type string to its corresponding argument type.
 *
 * @example
 * ```typescript
 * // TypeScript will enforce the correct args shape:
 * const command: SyncCommand<'item_add'> = {
 *     type: 'item_add',
 *     uuid: '...',
 *     args: { content: 'Buy milk' } // Must satisfy TaskAddArgs
 * }
 * ```
 */
export type SyncCommandsMap = {
    // Tasks
    item_add: TaskAddArgs
    item_update: TaskUpdateArgs
    item_complete: TaskCompleteArgs
    item_complete_undo: TaskCompleteUndoArgs
    item_move: TaskMoveArgs
    item_reorder: TaskReorderArgs
    item_uncomplete: TaskUncompleteArgs
    item_update_date_complete: TaskUpdateDateCompleteArgs
    item_delete: TaskDeleteArgs
    item_update_day_orders: TaskUpdateDayOrderArgs

    // Projects
    project_add: ProjectAddArgs
    project_update: ProjectUpdateArgs
    project_move: ProjectMoveArgs
    project_reorder: ProjectReorderArgs
    share_project: ShareProjectArgs
    project_leave: ProjectLeaveArgs
    project_archive: ProjectArchiveArgs
    project_unarchive: ProjectUnarchiveArgs
    project_delete: ProjectDeleteArgs
    project_move_to_workspace: ProjectMoveToWorkspaceArgs
    project_move_to_personal: ProjectMoveToPersonalArgs

    // Sections
    section_add: SectionAddArgs
    section_update: SectionUpdateArgs
    section_move: SectionMoveArgs
    section_reorder: SectionReorderArgs
    section_archive: SectionArchiveArgs
    section_unarchive: SectionUnarchiveArgs
    section_delete: SectionDeleteArgs

    // Labels
    label_add: LabelAddArgs
    label_rename: LabelRenameArgs
    label_update: LabelUpdateArgs
    label_update_orders: LabelUpdateOrdersArgs
    label_delete: LabelDeleteArgs
    label_delete_occurrences: LabelDeleteOccurrencesArgs

    // Filters
    filter_add: FilterAddArgs
    filter_update: FilterUpdateArgs
    filter_update_orders: FilterUpdateOrdersArgs
    filter_delete: FilterDeleteArgs

    // Notes
    note_add: NoteAddArgs
    note_update: NoteUpdateArgs
    note_delete: NoteDeleteArgs
    note_reaction_add: NoteReactionAddArgs
    note_reaction_remove: NoteReactionRemoveArgs

    // Reminders
    reminder_add: ReminderAddArgs
    reminder_update: ReminderUpdateArgs
    reminder_delete: ReminderDeleteArgs

    // Workspaces
    workspace_add: WorkspaceAddArgs
    workspace_update: WorkspaceUpdateArgs
    workspace_delete: WorkspaceDeleteArgs
    workspace_update_user: WorkspaceUpdateUserArgs
    workspace_delete_user: WorkspaceDeleteUserArgs
    workspace_leave: WorkspaceLeaveArgs
    workspace_invite: WorkspaceInviteArgs
    workspace_set_default_project_ordering: WorkspaceSetDefaultOrderArgs
    workspace_update_user_project_sort_preference: WorkspaceUpdateUserProjectSortPreferenceArgs

    // Folders
    folder_add: FolderAddArgs
    folder_update: FolderUpdateArgs
    folder_delete: FolderDeleteArgs

    // Workspace Filters
    workspace_filter_add: WorkspaceFilterAddArgs
    workspace_filter_update: WorkspaceFilterUpdateArgs
    workspace_filter_update_orders: WorkspaceFilterUpdateOrdersArgs
    workspace_filter_delete: WorkspaceFilterDeleteArgs

    // Workspace Goals
    workspace_goal_add: WorkspaceGoalAddArgs
    workspace_goal_update: WorkspaceGoalUpdateArgs
    workspace_goal_delete: WorkspaceGoalDeleteArgs
    workspace_goal_project_add: WorkspaceGoalProjectAddArgs
    workspace_goal_project_remove: WorkspaceGoalProjectRemoveArgs

    // Goals
    goal_add: GoalAddArgs
    goal_update: GoalUpdateArgs
    goal_complete: GoalCompleteArgs
    goal_uncomplete: GoalUncompleteArgs
    goal_delete: GoalDeleteArgs
    goal_link_item: GoalLinkItemArgs
    goal_unlink_item: GoalUnlinkItemArgs

    // Notifications
    live_notifications_mark_unread: LiveNotificationsMarkUnreadArgs
    live_notifications_mark_read: LiveNotificationsMarkReadArgs
    live_notifications_mark_read_all: LiveNotificationsMarkReadAllArgs
    live_notifications_set_last_read: LiveNotificationsSetLastReadArgs

    // Sharing
    accept_invitation: AcceptInvitationArgs
    reject_invitation: RejectInvitationArgs
    biz_accept_invitation: BizAcceptInvitationArgs
    biz_reject_invitation: BizRejectInvitationArgs

    // View Options
    view_options_set: ViewOptionsSetArgs
    view_options_delete: ViewOptionsDeleteArgs

    // Project View Options Defaults
    project_view_options_defaults_set: ProjectViewOptionsDefaultsSetArgs

    // Calendars
    calendar_update: CalendarUpdateArgs
    calendar_account_update: CalendarAccountUpdateArgs
    calendar_account_restore_task_calendar: CalendarAccountRestoreTaskCalendarArgs

    // Others
    user_update: UserUpdateArgs
    user_settings_update: UserSettingsUpdateArgs
    update_goals: UpdateGoalsArgs
    delete_collaborator: DeleteCollaboratorArgs
    id_mapping: IdMappingArgs
    suggestion_delete: SuggestionDeleteArgs
}

/**
 * All known Sync API command type strings.
 */
export type SyncCommandType = keyof SyncCommandsMap

/**
 * A strongly-typed Sync API command.
 *
 * When `Type` is a known command type (e.g. `'item_add'`), `args` is constrained
 * to the corresponding argument type. For unknown command types, `args` falls back
 * to `Record<string, unknown>`.
 *
 * @example
 * ```typescript
 * // Strongly typed:
 * const cmd: SyncCommand<'item_add'> = {
 *     type: 'item_add',
 *     uuid: 'abc-123',
 *     args: { content: 'Buy milk' },
 * }
 *
 * // Untyped (backwards compatible):
 * const cmd2: SyncCommand = {
 *     type: 'custom_command',
 *     uuid: 'def-456',
 *     args: { foo: 'bar' },
 * }
 * ```
 */
export type SyncCommand<Type extends SyncCommandType | string = string> = {
    type: Type
    uuid: string
    args: Type extends SyncCommandType ? SyncCommandsMap[Type] : Record<string, unknown>
    tempId?: string
}

// Re-export all domain types
export * from './shared'
export * from './tasks'
export * from './projects'
export * from './sections'
export * from './labels'
export * from './filters'
export * from './notes'
export * from './reminders'
export * from './workspaces'
export * from './folders'
export * from './workspace-filters'
export * from './workspace-goals'
export * from './goals'
export * from './notifications'
export * from './sharing'
export * from './view-options'
export * from './project-view-options'
export * from './calendars'
export * from './others'
