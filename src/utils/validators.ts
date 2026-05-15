import { z, type ZodType } from 'zod'

import { ActivityEventSchema } from '../types/activity/types'
import {
    AppSchema,
    AppWithUserCountSchema,
    AppSecretsSchema,
    AppVerificationTokenSchema,
    AppTestTokenSchema,
    AppDistributionTokenSchema,
    AppByDistributionTokenSchema,
    AppWebhookSchema,
    AppInstallationSchema,
    UserAuthorizationSchema,
} from '../types/apps/types'
import { BackupSchema } from '../types/backups/types'
import { AttachmentSchema, CommentSchema } from '../types/comments/types'
import { IdMappingSchema, MovedIdSchema } from '../types/id-mappings/types'
import {
    ProjectActivityStatsSchema,
    ProjectHealthSchema,
    ProjectHealthContextSchema,
    ProjectProgressSchema,
    WorkspaceInsightsSchema,
} from '../types/insights/types'
import { LabelSchema } from '../types/labels/types'
import { ProductivityStatsSchema } from '../types/productivity/types'
import { WorkspaceProjectSchema, ProjectSchema } from '../types/projects/types'
import { SectionSchema } from '../types/sections/types'
import { type SyncResponse, SyncResponseSchema } from '../types/sync/response'
import { TaskSchema } from '../types/tasks/types'
import {
    GetTemplateCategoriesResponseSchema,
    GetTemplatesByIdsResponseSchema,
    GetTemplatesResponseSchema,
    TemplateCategorySchema,
    TemplateSchema,
} from '../types/templates/types'
import { UiExtensionSchema } from '../types/ui-extensions/types'
import { UserSchema, CurrentUserSchema } from '../types/users/types'
import {
    WorkspaceUserSchema,
    WorkspaceInvitationSchema,
    WorkspacePlanDetailsSchema,
    JoinWorkspaceResultSchema,
    WorkspaceSchema,
    MemberActivityInfoSchema,
    WorkspaceUserTaskSchema,
} from '../types/workspaces/types'

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
} from '../types/sync/resources'

function createValidator<T>(schema: ZodType<T>) {
    return {
        validate: (input: unknown): T => schema.parse(input),
        validateArray: (input: unknown): T[] => z.array(schema).parse(input),
    }
}

const TMP_ID_MESSAGE =
    'This looks like a client-side placeholder — wait for sync to complete before calling the API.'

export const IdSchema = z
    .string()
    .min(1)
    .refine((id) => !id.startsWith('tmp-'), { message: TMP_ID_MESSAGE })

// Entity validators

export const { validate: validateTask, validateArray: validateTaskArray } =
    createValidator(TaskSchema)

/**
 * Validates and parses a project input.
 * @param input The input to validate
 * @returns A validated project (either PersonalProject or WorkspaceProject)
 */
export const { validate: validateProject, validateArray: validateProjectArray } =
    createValidator(ProjectSchema)

export const { validate: validateWorkspaceProject, validateArray: validateWorkspaceProjectArray } =
    createValidator(WorkspaceProjectSchema)

export const { validate: validateSection, validateArray: validateSectionArray } =
    createValidator(SectionSchema)

export const { validate: validateLabel, validateArray: validateLabelArray } =
    createValidator(LabelSchema)

export const { validate: validateComment, validateArray: validateCommentArray } =
    createValidator(CommentSchema)

export const { validate: validateUser, validateArray: validateUserArray } =
    createValidator(UserSchema)

export const { validate: validateProductivityStats } = createValidator(ProductivityStatsSchema)

export const { validate: validateCurrentUser } = createValidator(CurrentUserSchema)

export const { validate: validateActivityEvent, validateArray: validateActivityEventArray } =
    createValidator(ActivityEventSchema)

export const { validate: validateAttachment } = createValidator(AttachmentSchema)

export const { validate: validateWorkspaceUser, validateArray: validateWorkspaceUserArray } =
    createValidator(WorkspaceUserSchema)

export const {
    validate: validateWorkspaceInvitation,
    validateArray: validateWorkspaceInvitationArray,
} = createValidator(WorkspaceInvitationSchema)

export const { validate: validateWorkspacePlanDetails } = createValidator(
    WorkspacePlanDetailsSchema,
)

export const { validate: validateJoinWorkspaceResult } = createValidator(JoinWorkspaceResultSchema)

export const { validate: validateWorkspace, validateArray: validateWorkspaceArray } =
    createValidator(WorkspaceSchema)

export const {
    validate: validateMemberActivityInfo,
    validateArray: validateMemberActivityInfoArray,
} = createValidator(MemberActivityInfoSchema)

export const {
    validate: validateWorkspaceUserTask,
    validateArray: validateWorkspaceUserTaskArray,
} = createValidator(WorkspaceUserTaskSchema)

export const { validate: validateProjectActivityStats } = createValidator(
    ProjectActivityStatsSchema,
)
export const { validate: validateProjectHealth } = createValidator(ProjectHealthSchema)
export const { validate: validateProjectHealthContext } = createValidator(
    ProjectHealthContextSchema,
)
export const { validate: validateProjectProgress } = createValidator(ProjectProgressSchema)
export const { validate: validateWorkspaceInsights } = createValidator(WorkspaceInsightsSchema)

export const { validate: validateBackup, validateArray: validateBackupArray } =
    createValidator(BackupSchema)

export const { validate: validateIdMapping, validateArray: validateIdMappingArray } =
    createValidator(IdMappingSchema)

export const { validate: validateMovedId, validateArray: validateMovedIdArray } =
    createValidator(MovedIdSchema)

// Sync resource validators

export const { validate: validateFilter, validateArray: validateFilterArray } =
    createValidator(FilterSchema)

export const { validate: validateCollaborator, validateArray: validateCollaboratorArray } =
    createValidator(CollaboratorSchema)

export const {
    validate: validateCollaboratorState,
    validateArray: validateCollaboratorStateArray,
} = createValidator(CollaboratorStateSchema)

export const { validate: validateFolder, validateArray: validateFolderArray } =
    createValidator(FolderSchema)

export const { validate: validateNote, validateArray: validateNoteArray } =
    createValidator(NoteSchema)

export const { validate: validateTooltips } = createValidator(TooltipsSchema)

export const { validate: validateWorkspaceFilter, validateArray: validateWorkspaceFilterArray } =
    createValidator(WorkspaceFilterSchema)

export const { validate: validateWorkspaceGoal, validateArray: validateWorkspaceGoalArray } =
    createValidator(WorkspaceGoalSchema)

export const { validate: validateCalendar, validateArray: validateCalendarArray } =
    createValidator(CalendarSchema)

export const { validate: validateCalendarAccount, validateArray: validateCalendarAccountArray } =
    createValidator(CalendarAccountSchema)

export const { validate: validateReminder, validateArray: validateReminderArray } =
    createValidator(ReminderSchema)

export const { validate: validateLocationReminder, validateArray: validateLocationReminderArray } =
    createValidator(LocationReminderSchema)

export const { validate: validateCompletedInfo, validateArray: validateCompletedInfoArray } =
    createValidator(CompletedInfoSchema)

export const { validate: validateViewOptions, validateArray: validateViewOptionsArray } =
    createValidator(ViewOptionsSchema)

export const {
    validate: validateProjectViewOptionsDefaults,
    validateArray: validateProjectViewOptionsDefaultsArray,
} = createValidator(ProjectViewOptionsDefaultsSchema)

export const { validate: validateUserPlanLimits } = createValidator(UserPlanLimitsSchema)

export const { validate: validateLiveNotification, validateArray: validateLiveNotificationArray } =
    createValidator(LiveNotificationSchema)

export const { validate: validateSyncWorkspace, validateArray: validateSyncWorkspaceArray } =
    createValidator(SyncWorkspaceSchema)

export const { validate: validateSyncUser } = createValidator(SyncUserSchema)

export const { validate: validateUserSettings } = createValidator(UserSettingsSchema)

export const { validate: validateSuggestion, validateArray: validateSuggestionArray } =
    createValidator(SuggestionSchema)

export function parseSyncResponse(raw: Record<string, unknown>): SyncResponse {
    return SyncResponseSchema.parse(raw)
}

// App management validators

export const { validate: validateApp, validateArray: validateAppArray } = createValidator(AppSchema)

export const { validate: validateAppWithUserCount } = createValidator(AppWithUserCountSchema)

export const { validate: validateAppSecrets } = createValidator(AppSecretsSchema)

export const { validate: validateAppVerificationToken } = createValidator(
    AppVerificationTokenSchema,
)

export const { validate: validateAppTestToken } = createValidator(AppTestTokenSchema)

export const { validate: validateAppDistributionToken } = createValidator(
    AppDistributionTokenSchema,
)

export const { validate: validateAppByDistributionToken } = createValidator(
    AppByDistributionTokenSchema,
)

export const { validate: validateAppWebhook } = createValidator(AppWebhookSchema)

export const { validate: validateAppInstallation, validateArray: validateAppInstallationArray } =
    createValidator(AppInstallationSchema)

export const {
    validate: validateUserAuthorization,
    validateArray: validateUserAuthorizationArray,
} = createValidator(UserAuthorizationSchema)

export const { validate: validateUiExtension, validateArray: validateUiExtensionArray } =
    createValidator(UiExtensionSchema)

export const { validate: validateTemplate, validateArray: validateTemplateArray } =
    createValidator(TemplateSchema)

export const { validate: validateTemplateCategory, validateArray: validateTemplateCategoryArray } =
    createValidator(TemplateCategorySchema)

export const { validate: validateGetTemplatesResponse } = createValidator(
    GetTemplatesResponseSchema,
)

export const { validate: validateGetTemplateCategoriesResponse } = createValidator(
    GetTemplateCategoriesResponseSchema,
)

export const { validate: validateGetTemplatesByIdsResponse } = createValidator(
    GetTemplatesByIdsResponseSchema,
)
