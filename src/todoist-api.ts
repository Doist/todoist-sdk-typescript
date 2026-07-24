import { ActivityClient } from './clients/activity-client'
import { AppClient } from './clients/app-client'
import { BackupClient } from './clients/backup-client'
import { BillingClient } from './clients/billing-client'
import { CommentClient } from './clients/comment-client'
import { EmailClient } from './clients/email-client'
import { FolderClient } from './clients/folder-client'
import { IdMappingClient } from './clients/id-mapping-client'
import { InsightsClient } from './clients/insights-client'
import { LabelClient } from './clients/label-client'
import { ProductivityClient } from './clients/productivity-client'
import { ProjectClient } from './clients/project-client'
import { ReminderClient } from './clients/reminder-client'
import { SectionClient } from './clients/section-client'
import { TaskClient } from './clients/task-client'
import { TemplateClient } from './clients/template-client'
import { UiExtensionClient } from './clients/ui-extension-client'
import { UploadClient } from './clients/upload-client'
import { WorkspaceClient } from './clients/workspace-client'
import { ENDPOINT_REST_USER, getSyncBaseUri } from './consts/endpoints'
import { request } from './transport/http-client'
import { performSyncRequest } from './transport/sync-request'
import type { Reminder } from './types'
import { GetActivityLogsArgs, GetActivityLogsResponse } from './types/activity'
import type {
    AddAppArgs,
    App,
    AppByDistributionToken,
    AppDistributionToken,
    AppInstallation,
    AppSecrets,
    AppTestToken,
    AppVerificationToken,
    AppWebhook,
    AppWithUserCount,
    InstallAppArgs,
    RevokeUserAuthorizationArgs,
    UpdateAppArgs,
    UpdateAppInstallationArgs,
    UpdateAppWebhookArgs,
    UploadAppIconArgs,
    UserAuthorization,
} from './types/apps'
import { Backup, GetBackupsArgs, DownloadBackupArgs } from './types/backups'
import type {
    BillingPortalUrlResponse,
    CancelPlanArgs,
    CheckoutSessionResponse,
    GetPricingArgs,
    PricesResponse,
    PricingResponse,
    ProBillingPortalArgs,
    ProPlanDetails,
    StartProTrialArgs,
    StartWorkspaceTrialArgs,
    SubscriptionInfo,
    UpgradeToProArgs,
    UpgradeWorkspaceArgs,
    WorkspaceBillingPortalArgs,
} from './types/billing'
import {
    Attachment,
    Comment,
    AddCommentArgs,
    UpdateCommentArgs,
    GetProjectCommentsArgs,
    GetTaskCommentsArgs,
    GetCommentsResponse,
} from './types/comments'
import { GetOrCreateEmailArgs, GetOrCreateEmailResponse, DisableEmailArgs } from './types/emails'
import {
    GetFoldersArgs,
    GetFoldersResponse,
    AddFolderArgs,
    UpdateFolderArgs,
} from './types/folders'
import { CustomFetch, FileResponse } from './types/http'
import { IdMapping, MovedId, GetIdMappingsArgs, GetMovedIdsArgs } from './types/id-mappings'
import {
    ProjectActivityStats,
    ProjectHealth,
    ProjectHealthContext,
    ProjectProgress,
    WorkspaceInsights,
    GetProjectActivityStatsArgs,
    GetWorkspaceInsightsArgs,
} from './types/insights'
import {
    Label,
    AddLabelArgs,
    UpdateLabelArgs,
    GetLabelsArgs,
    SearchLabelsArgs,
    GetLabelsResponse,
    GetSharedLabelsArgs,
    GetSharedLabelsResponse,
    RenameSharedLabelArgs,
    RemoveSharedLabelArgs,
} from './types/labels'
import { ProductivityStats } from './types/productivity'
import {
    PersonalProject,
    WorkspaceProject,
    AddProjectArgs,
    UpdateProjectArgs,
    GetProjectsArgs,
    SearchProjectsArgs,
    GetProjectCollaboratorsArgs,
    GetProjectsResponse,
    GetProjectCollaboratorsResponse,
    GetArchivedProjectsArgs,
    GetArchivedProjectsResponse,
    MoveProjectToWorkspaceArgs,
    MoveProjectToPersonalArgs,
    GetArchivedProjectsCountArgs,
    GetArchivedProjectsCountResponse,
    GetProjectPermissionsResponse,
    GetFullProjectArgs,
    GetFullProjectResponse,
    JoinProjectResponse,
} from './types/projects'
import {
    AddReminderArgs,
    UpdateReminderArgs,
    AddLocationReminderArgs,
    UpdateLocationReminderArgs,
    GetRemindersArgs,
    GetRemindersResponse,
    GetLocationRemindersArgs,
    GetLocationRemindersResponse,
} from './types/reminders'
import {
    Section,
    AddSectionArgs,
    UpdateSectionArgs,
    GetSectionsArgs,
    SearchSectionsArgs,
    GetSectionsResponse,
} from './types/sections'
import type { Folder } from './types/sync/resources/folders'
import {
    Task,
    AddTaskArgs,
    GetTasksArgs,
    GetTasksByFilterArgs,
    UpdateTaskArgs,
    QuickAddTaskArgs,
    type MoveTaskArgs,
    GetCompletedTasksByCompletionDateArgs,
    GetCompletedTasksByDueDateArgs,
    GetCompletedTasksResponse,
    SearchCompletedTasksArgs,
    GetTasksResponse,
    GetAllCompletedTasksArgs,
    GetAllCompletedTasksResponse,
} from './types/tasks'
import {
    ExportTemplateFileArgs,
    ExportTemplateUrlArgs,
    ExportTemplateUrlResponse,
    CreateProjectFromTemplateArgs,
    CreateProjectFromTemplateResponse,
    GetTemplateCategoriesArgs,
    GetTemplateCategoriesResponse,
    GetTemplatesArgs,
    GetTemplatesByIdsArgs,
    GetTemplatesByIdsResponse,
    GetTemplatesResponse,
    ImportTemplateIntoProjectArgs,
    ImportTemplateFromIdArgs,
    ImportTemplateResponse,
} from './types/templates'
import type {
    AddUiExtensionArgs,
    UiExtension,
    UpdateUiExtensionArgs,
    UploadUiExtensionIconArgs,
} from './types/ui-extensions'
import { UploadFileArgs, DeleteUploadArgs } from './types/uploads'
import { CurrentUser } from './types/users'
import {
    WorkspaceInvitation,
    WorkspacePlanDetails,
    JoinWorkspaceResult,
    Workspace,
    AddWorkspaceArgs,
    UpdateWorkspaceArgs,
    GetWorkspaceMembersActivityArgs,
    GetWorkspaceMembersActivityResponse,
    GetWorkspaceUserTasksArgs,
    GetWorkspaceUserTasksResponse,
    InviteWorkspaceUsersArgs,
    InviteWorkspaceUsersResponse,
    UpdateWorkspaceUserArgs,
    RemoveWorkspaceUserArgs,
    GetWorkspaceInvitationsArgs,
    DeleteWorkspaceInvitationArgs,
    WorkspaceInvitationActionArgs,
    JoinWorkspaceArgs,
    WorkspaceLogoArgs,
    GetWorkspacePlanDetailsArgs,
    GetWorkspaceUsersArgs,
    GetWorkspaceUsersResponse,
    GetWorkspaceProjectsArgs,
    WorkspaceInvitationsResponse,
    AllWorkspaceInvitationsResponse,
    WorkspaceLogoResponse,
} from './types/workspaces'
import { validateCurrentUser } from './utils/validators'

import { type SyncResponse, type SyncRequest } from './types/sync'

/**
 * A client for interacting with the Todoist API v1.
 * This class provides methods to manage tasks, projects, sections, labels, and comments in Todoist.
 *
 * @example
 * ```typescript
 * const api = new TodoistApi('your-api-token');
 *
 * // Get all tasks
 * const tasks = await api.getTasks();
 *
 * // Create a new task
 * const newTask = await api.addTask({
 *   content: 'My new task',
 *   projectId: '12345'
 * });
 * ```
 *
 * For more information about the Todoist API v1, see the [official documentation](https://todoist.com/api/v1).
 * If you're migrating from v9, please refer to the [migration guide](https://todoist.com/api/v1/docs#tag/Migrating-from-v9).
 */

/**
 * Configuration options for the TodoistApi constructor
 */
export type TodoistApiOptions = {
    /**
     * Optional custom API base URL. If not provided, defaults to Todoist's standard API endpoint
     */
    baseUrl?: string
    /**
     * Optional custom fetch function for alternative HTTP clients (e.g., Obsidian's requestUrl, React Native fetch)
     */
    customFetch?: CustomFetch
}

export class TodoistApi {
    private authToken: string
    private syncApiBase: string
    private customFetch?: CustomFetch

    // Internal domain sub-clients. See src/clients/* — each groups a set of
    // related endpoints. The public methods on TodoistApi below delegate
    // through these; sub-clients themselves are not exposed from the package.
    private readonly taskClient: TaskClient
    private readonly projectClient: ProjectClient
    private readonly sectionClient: SectionClient
    private readonly labelClient: LabelClient
    private readonly commentClient: CommentClient
    private readonly reminderClient: ReminderClient
    private readonly insightsClient: InsightsClient
    private readonly folderClient: FolderClient
    private readonly templateClient: TemplateClient
    private readonly uploadClient: UploadClient
    private readonly backupClient: BackupClient
    private readonly emailClient: EmailClient
    private readonly idMappingClient: IdMappingClient
    private readonly activityClient: ActivityClient
    private readonly productivityClient: ProductivityClient
    private readonly workspaceClient: WorkspaceClient
    private readonly billingClient: BillingClient
    private readonly appClient: AppClient
    private readonly uiExtensionClient: UiExtensionClient

    constructor(
        /**
         * Your Todoist API token.
         */
        authToken: string,
        /**
         * Optional configuration options
         */
        options?: TodoistApiOptions,
    ) {
        if (typeof options === 'string') {
            throw new TypeError(
                'Passing baseUrl as a string is no longer supported. Use an options object instead: new TodoistApi(token, { baseUrl })',
            )
        }
        this.authToken = authToken
        const opts = options || {}
        this.syncApiBase = getSyncBaseUri(opts.baseUrl)
        this.customFetch = opts.customFetch

        const clientDeps = {
            authToken: this.authToken,
            syncApiBase: this.syncApiBase,
            customFetch: this.customFetch,
        }
        this.taskClient = new TaskClient(clientDeps)
        this.projectClient = new ProjectClient(clientDeps)
        this.sectionClient = new SectionClient(clientDeps)
        this.labelClient = new LabelClient(clientDeps)
        this.commentClient = new CommentClient(clientDeps)
        this.reminderClient = new ReminderClient(clientDeps)
        this.insightsClient = new InsightsClient(clientDeps)
        this.folderClient = new FolderClient(clientDeps)
        this.templateClient = new TemplateClient(clientDeps)
        this.uploadClient = new UploadClient(clientDeps)
        this.backupClient = new BackupClient(clientDeps)
        this.emailClient = new EmailClient(clientDeps)
        this.idMappingClient = new IdMappingClient(clientDeps)
        this.activityClient = new ActivityClient(clientDeps)
        this.productivityClient = new ProductivityClient(clientDeps)
        this.workspaceClient = new WorkspaceClient(clientDeps)
        this.billingClient = new BillingClient(clientDeps)
        this.appClient = new AppClient(clientDeps)
        this.uiExtensionClient = new UiExtensionClient(clientDeps)
    }

    /**
     * Executes a raw Sync API request.
     *
     * This method provides direct access to the Sync API, allowing you to send
     * strongly-typed commands and request specific resource types.
     *
     * @param request - The sync request payload containing commands and/or resource types.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the sync response.
     * @throws TodoistRequestError if the sync status contains errors.
     *
     * @example
     * ```typescript
     * import { createCommand } from '@doist/todoist-sdk'
     *
     * const response = await api.sync({
     *     commands: [
     *         createCommand('item_add', { content: 'Buy milk' }),
     *     ],
     *     resourceTypes: ['items'],
     *     syncToken: '*',
     * })
     * ```
     */
    async sync(syncRequest: SyncRequest, requestId?: string): Promise<SyncResponse> {
        return performSyncRequest(
            {
                authToken: this.authToken,
                syncApiBase: this.syncApiBase,
                customFetch: this.customFetch,
            },
            syncRequest,
            { requestId, hasSyncCommands: Boolean(syncRequest.commands?.length) },
        )
    }

    /**
     * Retrieves information about the authenticated user.
     *
     * @returns A promise that resolves to the current user's information.
     */
    async getUser(): Promise<CurrentUser> {
        const response = await request<CurrentUser>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_USER,
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateCurrentUser(response.data)
    }

    /**
     * Retrieves a single active (non-completed) task by its ID.
     *
     * @param id - The unique identifier of the task.
     * @returns A promise that resolves to the requested task.
     */
    async getTask(id: string): Promise<Task> {
        return this.taskClient.getTask(id)
    }

    /**
     * Retrieves a list of active tasks filtered by specific parameters.
     *
     * @param args - Filter parameters such as project ID, label ID, or due date.
     * @returns A promise that resolves to an array of tasks.
     */
    async getTasks(args: GetTasksArgs = {}): Promise<GetTasksResponse> {
        return this.taskClient.getTasks(args)
    }

    /**
     * Retrieves tasks filtered by a filter string.
     *
     * @param args - Parameters for filtering tasks, including the query string and optional language.
     * @returns A promise that resolves to a paginated response of tasks.
     */
    async getTasksByFilter(args: GetTasksByFilterArgs): Promise<GetTasksResponse> {
        return this.taskClient.getTasksByFilter(args)
    }

    /**
     * Retrieves completed tasks by completion date.
     *
     * @param args - Parameters for filtering, including required since, until.
     * @returns A promise that resolves to a paginated response of completed tasks.
     */
    async getCompletedTasksByCompletionDate(
        args: GetCompletedTasksByCompletionDateArgs,
    ): Promise<GetCompletedTasksResponse> {
        return this.taskClient.getCompletedTasksByCompletionDate(args)
    }

    /**
     * Retrieves completed tasks by due date.
     *
     * @param args - Parameters for filtering, including required since, until.
     * @returns A promise that resolves to a paginated response of completed tasks.
     */
    async getCompletedTasksByDueDate(
        args: GetCompletedTasksByDueDateArgs,
    ): Promise<GetCompletedTasksResponse> {
        return this.taskClient.getCompletedTasksByDueDate(args)
    }

    /**
     * Searches completed tasks by query string.
     *
     * @param args - Parameters for searching, including the query string.
     * @returns A promise that resolves to a paginated response of completed tasks.
     */
    async searchCompletedTasks(args: SearchCompletedTasksArgs): Promise<GetCompletedTasksResponse> {
        return this.taskClient.searchCompletedTasks(args)
    }

    /**
     * Retrieves all completed tasks with optional filters.
     *
     * Uses offset-based pagination rather than cursor-based.
     *
     * @param args - Optional parameters including project ID, label, date range, and pagination.
     * @returns A promise that resolves to completed tasks with associated project and section data.
     */
    async getAllCompletedTasks(
        args: GetAllCompletedTasksArgs = {},
    ): Promise<GetAllCompletedTasksResponse> {
        return this.taskClient.getAllCompletedTasks(args)
    }

    /**
     * Creates a new task with the provided parameters.
     *
     * @param args - Task creation parameters such as content, due date, or priority.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created task.
     */
    async addTask(args: AddTaskArgs, requestId?: string): Promise<Task> {
        return this.taskClient.addTask(args, requestId)
    }

    /**
     * Quickly adds a task using natural language processing for due dates.
     *
     * @param args - Quick add task parameters, including content and due date.
     * @returns A promise that resolves to the created task.
     */
    async quickAddTask(args: QuickAddTaskArgs): Promise<Task> {
        return this.taskClient.quickAddTask(args)
    }

    /**
     * Updates an existing task by its ID with the provided parameters.
     *
     * @param id - The unique identifier of the task to update.
     * @param args - Update parameters such as content, priority, or due date. Pass
     * `dueString: null` (or `"no date"`) to clear the due date.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated task.
     */
    async updateTask(id: string, args: UpdateTaskArgs, requestId?: string): Promise<Task> {
        return this.taskClient.updateTask(id, args, requestId)
    }

    /**
     * Moves existing tasks by their ID to either a different parent/section/project.
     *
     * @param ids - The unique identifier of the tasks to be moved.
     * @param args - The paramets that should contain only one of projectId, sectionId, or parentId
     * @param requestId - Optional custom identifier for the request.
     * @returns - A promise that resolves to an array of the updated tasks.
     */
    async moveTasks(ids: string[], args: MoveTaskArgs, requestId?: string): Promise<Task[]> {
        return this.taskClient.moveTasks(ids, args, requestId)
    }

    /**
     * Moves a task by its ID to either a different parent/section/project.
     *
     * @param id - The unique identifier of the task to be moved.
     * @param args - The parameters that should contain exactly one of projectId, sectionId, or parentId
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated task.
     */
    async moveTask(id: string, args: MoveTaskArgs, requestId?: string): Promise<Task> {
        return this.taskClient.moveTask(id, args, requestId)
    }

    /**
     * Closes (completes) a task by its ID.
     *
     * @param id - The unique identifier of the task to close.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async closeTask(id: string, requestId?: string): Promise<boolean> {
        return this.taskClient.closeTask(id, requestId)
    }

    /**
     * Reopens a previously closed (completed) task by its ID.
     *
     * @param id - The unique identifier of the task to reopen.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async reopenTask(id: string, requestId?: string): Promise<boolean> {
        return this.taskClient.reopenTask(id, requestId)
    }

    /**
     * Deletes a task by its ID.
     *
     * @param id - The unique identifier of the task to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteTask(id: string, requestId?: string): Promise<boolean> {
        return this.taskClient.deleteTask(id, requestId)
    }

    /**
     * Retrieves a project by its ID.
     *
     * @param id - The unique identifier of the project.
     * @returns A promise that resolves to the requested project.
     */
    async getProject(id: string): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.getProject(id)
    }

    /**
     * Retrieves all projects with optional filters.
     *
     * @param args - Optional filters for retrieving projects.
     * @returns A promise that resolves to an array of projects.
     */
    async getProjects(args: GetProjectsArgs = {}): Promise<GetProjectsResponse> {
        return this.projectClient.getProjects(args)
    }

    /**
     * Searches projects by name.
     *
     * @param args - Search parameters including the query string.
     * @returns A promise that resolves to a paginated response of projects.
     */
    async searchProjects(args: SearchProjectsArgs): Promise<GetProjectsResponse> {
        return this.projectClient.searchProjects(args)
    }

    /**
     * Retrieves all archived projects with optional filters.
     *
     * @param args - Optional filters for retrieving archived projects.
     * @returns A promise that resolves to an array of archived projects.
     */
    async getArchivedProjects(
        args: GetArchivedProjectsArgs = {},
    ): Promise<GetArchivedProjectsResponse> {
        return this.projectClient.getArchivedProjects(args)
    }

    /**
     * Creates a new project with the provided parameters.
     *
     * @param args - Project creation parameters such as name or color.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created project.
     */
    async addProject(
        args: AddProjectArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.addProject(args, requestId)
    }

    /**
     * Updates an existing project by its ID with the provided parameters.
     *
     * @param id - The unique identifier of the project to update.
     * @param args - Update parameters such as name or color.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated project.
     */
    async updateProject(
        id: string,
        args: UpdateProjectArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.updateProject(id, args, requestId)
    }

    /**
     * Deletes a project by its ID.
     *
     * If the project is a workspace project, it must have been
     * archived first before it can be deleted, otherwise calling
     * this function will result in an error. Personal projects can
     * be deleted regardless of their archived status.
     *
     * @param id - The unique identifier of the project to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteProject(id: string, requestId?: string): Promise<boolean> {
        return this.projectClient.deleteProject(id, requestId)
    }

    /**
     * Archives a project by its ID.
     *
     * @param id - The unique identifier of the project to archive.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated project.
     */
    async archiveProject(
        id: string,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.archiveProject(id, requestId)
    }

    /**
     * Unarchives a project by its ID.
     *
     * @param id - The unique identifier of the project to unarchive.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated project.
     */
    async unarchiveProject(
        id: string,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.unarchiveProject(id, requestId)
    }

    /**
     * Moves a project to a workspace.
     *
     * @param args - The arguments for moving the project.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the moved project.
     */
    async moveProjectToWorkspace(
        args: MoveProjectToWorkspaceArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.moveProjectToWorkspace(args, requestId)
    }

    /**
     * Moves a project to personal.
     *
     * @param args - The arguments for moving the project.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the moved project.
     */
    async moveProjectToPersonal(
        args: MoveProjectToPersonalArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        return this.projectClient.moveProjectToPersonal(args, requestId)
    }

    /**
     * Counts the number of archived projects.
     *
     * @param args - Optional parameters to filter the count.
     * @returns A promise that resolves to the count of archived projects.
     */
    async getArchivedProjectsCount(
        args: GetArchivedProjectsCountArgs = {},
    ): Promise<GetArchivedProjectsCountResponse> {
        return this.projectClient.getArchivedProjectsCount(args)
    }

    /**
     * Retrieves the role-to-action permission mappings for projects.
     *
     * @returns A promise that resolves to the permission mappings.
     */
    async getProjectPermissions(): Promise<GetProjectPermissionsResponse> {
        return this.projectClient.getProjectPermissions()
    }

    /**
     * Retrieves full project data including tasks, sections, collaborators, and notes.
     *
     * @param id - The unique identifier of the project.
     * @param args - Optional parameters.
     * @returns A promise that resolves to the full project data.
     */
    async getFullProject(
        id: string,
        args: GetFullProjectArgs = {},
    ): Promise<GetFullProjectResponse> {
        return this.projectClient.getFullProject(id, args)
    }

    /**
     * Joins a workspace project.
     *
     * Only used for workspaces — this endpoint is used to join a workspace project
     * by a workspace user.
     *
     * @param id - The unique identifier of the workspace project to join.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the full project data after joining.
     */
    async joinProject(id: string, requestId?: string): Promise<JoinProjectResponse> {
        return this.projectClient.joinProject(id, requestId)
    }

    /**
     * Retrieves a list of collaborators for a specific project.
     *
     * @param projectId - The unique identifier of the project.
     * @param args - Optional parameters to filter collaborators.
     * @returns A promise that resolves to an array of collaborators for the project.
     */
    async getProjectCollaborators(
        projectId: string,
        args: GetProjectCollaboratorsArgs = {},
    ): Promise<GetProjectCollaboratorsResponse> {
        return this.projectClient.getProjectCollaborators(projectId, args)
    }

    // ── Insights ──

    /**
     * Retrieves activity statistics for a project.
     *
     * @param projectId - The unique identifier of the project.
     * @param args - Optional parameters including weeks and weekly counts flag.
     * @returns A promise that resolves to the project activity stats.
     */
    async getProjectActivityStats(
        projectId: string,
        args: GetProjectActivityStatsArgs = {},
    ): Promise<ProjectActivityStats> {
        return this.insightsClient.getProjectActivityStats(projectId, args)
    }

    /**
     * Retrieves the health status of a project.
     *
     * @param projectId - The unique identifier of the project.
     * @returns A promise that resolves to the project health data.
     */
    async getProjectHealth(projectId: string): Promise<ProjectHealth> {
        return this.insightsClient.getProjectHealth(projectId)
    }

    /**
     * Retrieves the health context for a project, including metrics and task details.
     *
     * @param projectId - The unique identifier of the project.
     * @returns A promise that resolves to the project health context.
     */
    async getProjectHealthContext(projectId: string): Promise<ProjectHealthContext> {
        return this.insightsClient.getProjectHealthContext(projectId)
    }

    /**
     * Retrieves progress information for a project.
     *
     * @param projectId - The unique identifier of the project.
     * @returns A promise that resolves to the project progress data.
     */
    async getProjectProgress(projectId: string): Promise<ProjectProgress> {
        return this.insightsClient.getProjectProgress(projectId)
    }

    /**
     * Retrieves insights for all projects in a workspace.
     *
     * @param workspaceId - The unique identifier of the workspace.
     * @param args - Optional parameters including project IDs filter.
     * @returns A promise that resolves to workspace insights data.
     */
    async getWorkspaceInsights(
        workspaceId: string,
        args: GetWorkspaceInsightsArgs = {},
    ): Promise<WorkspaceInsights> {
        return this.insightsClient.getWorkspaceInsights(workspaceId, args)
    }

    /**
     * Triggers a health analysis for a project.
     *
     * @param projectId - The unique identifier of the project.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated project health data.
     */
    async analyzeProjectHealth(projectId: string, requestId?: string): Promise<ProjectHealth> {
        return this.insightsClient.analyzeProjectHealth(projectId, requestId)
    }

    // ── Sections ──

    /**
     * Retrieves all sections within a specific project or matching criteria.
     *
     * @param args - Filter parameters such as project ID. If no projectId is provided,
     * all sections are returned.
     * @returns A promise that resolves to an array of sections.
     */
    async getSections(args?: GetSectionsArgs): Promise<GetSectionsResponse> {
        return this.sectionClient.getSections(args)
    }

    /**
     * Searches sections by name.
     *
     * @param args - Search parameters including the query string.
     * @returns A promise that resolves to a paginated response of sections.
     */
    async searchSections(args: SearchSectionsArgs): Promise<GetSectionsResponse> {
        return this.sectionClient.searchSections(args)
    }

    /**
     * Retrieves a single section by its ID.
     *
     * @param id - The unique identifier of the section.
     * @returns A promise that resolves to the requested section.
     */
    async getSection(id: string): Promise<Section> {
        return this.sectionClient.getSection(id)
    }

    /**
     * Creates a new section within a project.
     *
     * @param args - Section creation parameters such as name or project ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created section.
     */
    async addSection(args: AddSectionArgs, requestId?: string): Promise<Section> {
        return this.sectionClient.addSection(args, requestId)
    }

    /**
     * Updates a section by its ID with the provided parameters.
     *
     * @param id - The unique identifier of the section to update.
     * @param args - Update parameters such as name or project ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated section.
     */
    async updateSection(id: string, args: UpdateSectionArgs, requestId?: string): Promise<Section> {
        return this.sectionClient.updateSection(id, args, requestId)
    }

    /**
     * Deletes a section by its ID.
     *
     * @param id - The unique identifier of the section to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteSection(id: string, requestId?: string): Promise<boolean> {
        return this.sectionClient.deleteSection(id, requestId)
    }

    /**
     * Archives a section by its ID.
     *
     * @param id - The unique identifier of the section to archive.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated section.
     */
    async archiveSection(id: string, requestId?: string): Promise<Section> {
        return this.sectionClient.archiveSection(id, requestId)
    }

    /**
     * Unarchives a section by its ID.
     *
     * @param id - The unique identifier of the section to unarchive.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated section.
     */
    async unarchiveSection(id: string, requestId?: string): Promise<Section> {
        return this.sectionClient.unarchiveSection(id, requestId)
    }

    /**
     * Retrieves a label by its ID.
     *
     * @param id - The unique identifier of the label.
     * @returns A promise that resolves to the requested label.
     */
    async getLabel(id: string): Promise<Label> {
        return this.labelClient.getLabel(id)
    }

    /**
     * Retrieves all labels.
     *
     * @param args - Optional filter parameters.
     * @returns A promise that resolves to an array of labels.
     */
    async getLabels(args: GetLabelsArgs = {}): Promise<GetLabelsResponse> {
        return this.labelClient.getLabels(args)
    }

    /**
     * Searches labels by name.
     *
     * @param args - Search parameters including the query string.
     * @returns A promise that resolves to a paginated response of labels.
     */
    async searchLabels(args: SearchLabelsArgs): Promise<GetLabelsResponse> {
        return this.labelClient.searchLabels(args)
    }

    /**
     * Adds a new label.
     *
     * @param args - Label creation parameters such as name.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created label.
     */
    async addLabel(args: AddLabelArgs, requestId?: string): Promise<Label> {
        return this.labelClient.addLabel(args, requestId)
    }

    /**
     * Updates an existing label by its ID.
     *
     * @param id - The unique identifier of the label to update.
     * @param args - Update parameters such as name or color.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated label.
     */
    async updateLabel(id: string, args: UpdateLabelArgs, requestId?: string): Promise<Label> {
        return this.labelClient.updateLabel(id, args, requestId)
    }

    /**
     * Deletes a label by its ID.
     *
     * @param id - The unique identifier of the label to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteLabel(id: string, requestId?: string): Promise<boolean> {
        return this.labelClient.deleteLabel(id, requestId)
    }

    /**
     * Retrieves a list of shared labels.
     *
     * @param args - Optional parameters to filter shared labels.
     * @returns A promise that resolves to an array of shared labels.
     */
    async getSharedLabels(args?: GetSharedLabelsArgs): Promise<GetSharedLabelsResponse> {
        return this.labelClient.getSharedLabels(args)
    }

    /**
     * Renames an existing shared label.
     *
     * @param args - Parameters for renaming the shared label, including the current and new name.
     * @returns A promise that resolves to `true` if successful.
     */
    async renameSharedLabel(args: RenameSharedLabelArgs): Promise<boolean> {
        return this.labelClient.renameSharedLabel(args)
    }

    /**
     * Removes a shared label.
     *
     * @param args - Parameters for removing the shared label.
     * @returns A promise that resolves to `true` if successful.
     */
    async removeSharedLabel(args: RemoveSharedLabelArgs): Promise<boolean> {
        return this.labelClient.removeSharedLabel(args)
    }

    /**
     * Retrieves all comments associated with a task or project.
     *
     * @param args - Parameters for retrieving comments, such as task ID or project ID.
     * @returns A promise that resolves to an array of comments.
     */
    async getComments(
        args: GetTaskCommentsArgs | GetProjectCommentsArgs,
    ): Promise<GetCommentsResponse> {
        return this.commentClient.getComments(args)
    }

    /**
     * Retrieves a specific comment by its ID.
     *
     * @param id - The unique identifier of the comment to retrieve.
     * @returns A promise that resolves to the requested comment.
     */
    async getComment(id: string): Promise<Comment> {
        return this.commentClient.getComment(id)
    }

    /**
     * Adds a comment to a task or project.
     *
     * @param args - Parameters for creating the comment, such as content and the target task or project ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created comment.
     */
    async addComment(args: AddCommentArgs, requestId?: string): Promise<Comment> {
        return this.commentClient.addComment(args, requestId)
    }

    /**
     * Updates an existing comment by its ID.
     *
     * @param id - The unique identifier of the comment to update.
     * @param args - Update parameters such as new content.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated comment.
     */
    async updateComment(id: string, args: UpdateCommentArgs, requestId?: string): Promise<Comment> {
        return this.commentClient.updateComment(id, args, requestId)
    }

    /**
     * Deletes a comment by its ID.
     *
     * @param id - The unique identifier of the comment to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteComment(id: string, requestId?: string): Promise<boolean> {
        return this.commentClient.deleteComment(id, requestId)
    }

    /**
     * Retrieves a paginated list of time-based reminders.
     *
     * @param args - Optional parameters including task ID filter and pagination.
     * @returns A promise that resolves to a paginated list of reminders.
     */
    async getReminders(args: GetRemindersArgs = {}): Promise<GetRemindersResponse> {
        return this.reminderClient.getReminders(args)
    }

    /**
     * Retrieves a paginated list of location-based reminders.
     *
     * @param args - Optional parameters including task ID filter and pagination.
     * @returns A promise that resolves to a paginated list of location reminders.
     */
    async getLocationReminders(
        args: GetLocationRemindersArgs = {},
    ): Promise<GetLocationRemindersResponse> {
        return this.reminderClient.getLocationReminders(args)
    }

    /**
     * Retrieves a time-based reminder by its ID.
     *
     * @param id - The unique identifier of the reminder to retrieve.
     * @returns A promise that resolves to the requested reminder.
     */
    async getReminder(id: string): Promise<Reminder> {
        return this.reminderClient.getReminder(id)
    }

    /**
     * Retrieves a location reminder by its ID.
     *
     * @param id - The unique identifier of the location reminder to retrieve.
     * @returns A promise that resolves to the requested reminder.
     */
    async getLocationReminder(id: string): Promise<Reminder> {
        return this.reminderClient.getLocationReminder(id)
    }

    /**
     * Creates a time-based reminder for a task.
     *
     * @param args - Reminder creation parameters for relative or absolute reminders.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created reminder.
     */
    async addReminder(args: AddReminderArgs, requestId?: string): Promise<Reminder> {
        return this.reminderClient.addReminder(args, requestId)
    }

    /**
     * Creates a location reminder for a task.
     *
     * @param args - Location reminder creation parameters.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created reminder.
     */
    async addLocationReminder(
        args: AddLocationReminderArgs,
        requestId?: string,
    ): Promise<Reminder> {
        return this.reminderClient.addLocationReminder(args, requestId)
    }

    /**
     * Updates an existing time-based reminder.
     *
     * @param id - The unique identifier of the reminder to update.
     * @param args - Reminder update parameters.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated reminder.
     */
    async updateReminder(
        id: string,
        args: UpdateReminderArgs,
        requestId?: string,
    ): Promise<Reminder> {
        return this.reminderClient.updateReminder(id, args, requestId)
    }

    /**
     * Updates an existing location reminder.
     *
     * @param id - The unique identifier of the location reminder to update.
     * @param args - Location reminder update parameters.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated reminder.
     */
    async updateLocationReminder(
        id: string,
        args: UpdateLocationReminderArgs,
        requestId?: string,
    ): Promise<Reminder> {
        return this.reminderClient.updateLocationReminder(id, args, requestId)
    }

    /**
     * Deletes a time-based reminder by its ID.
     *
     * @param id - The unique identifier of the reminder to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteReminder(id: string, requestId?: string): Promise<boolean> {
        return this.reminderClient.deleteReminder(id, requestId)
    }

    /**
     * Deletes a location reminder by its ID.
     *
     * @param id - The unique identifier of the location reminder to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteLocationReminder(id: string, requestId?: string): Promise<boolean> {
        return this.reminderClient.deleteLocationReminder(id, requestId)
    }

    /**
     * Retrieves productivity stats for the authenticated user.
     *
     * @returns A promise that resolves to the productivity stats.
     */
    async getProductivityStats(): Promise<ProductivityStats> {
        return this.productivityClient.getProductivityStats()
    }

    /**
     * Retrieves activity logs with optional filters.
     *
     * @param args - Optional filter parameters for activity logs.
     * @returns A promise that resolves to a paginated response of activity events.
     */
    async getActivityLogs(args: GetActivityLogsArgs = {}): Promise<GetActivityLogsResponse> {
        return this.activityClient.getActivityLogs(args)
    }

    /**
     * Uploads a file and returns attachment metadata.
     * This creates an upload record that can be referenced in tasks or comments.
     *
     * @param args - Upload parameters including file content, filename, and optional project ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the uploaded file's attachment metadata.
     *
     * @example
     * ```typescript
     * // Upload from a file path
     * const upload = await api.uploadFile({
     *   file: '/path/to/document.pdf',
     *   projectId: '12345'
     * })
     *
     * // Upload from a Buffer
     * const buffer = fs.readFileSync('/path/to/document.pdf')
     * const upload = await api.uploadFile({
     *   file: buffer,
     *   fileName: 'document.pdf',  // Required for Buffer/Stream
     *   projectId: '12345'
     * })
     *
     * // Use the returned fileUrl in a comment
     * await api.addComment({
     *   content: 'See attached document',
     *   taskId: '67890',
     *   attachment: {
     *     fileUrl: upload.fileUrl,
     *     fileName: upload.fileName,
     *     fileType: upload.fileType,
     *     resourceType: upload.resourceType
     *   }
     * })
     * ```
     */
    async uploadFile(args: UploadFileArgs, requestId?: string): Promise<Attachment> {
        return this.uploadClient.uploadFile(args, requestId)
    }

    /**
     * Deletes an uploaded file by its URL.
     *
     * @param args - The file URL to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if deletion was successful.
     *
     * @example
     * ```typescript
     * await api.deleteUpload({
     *   fileUrl: 'https://files.todoist.com/...'
     * })
     * ```
     */
    async deleteUpload(args: DeleteUploadArgs, requestId?: string): Promise<boolean> {
        return this.uploadClient.deleteUpload(args, requestId)
    }

    /**
     * Fetches the content of a file attachment from a Todoist comment.
     *
     * Accepts either a Comment object (extracts the file URL from its attachment)
     * or a direct file URL string. Returns the raw Response object so the caller
     * can read the body in the appropriate format (.arrayBuffer(), .text(), etc.).
     *
     * Only known Todoist attachment hosts are allowed: the authenticated
     * `files.todoist.com` origin (which receives the Bearer token) and the
     * attachment CDN origins (fetched without the token). Other URLs are rejected.
     *
     * @param commentOrUrl - A Comment object with a file attachment, or a file URL string.
     * @returns The raw fetch Response for the file content.
     * @throws Error if a Comment is provided without a file attachment or file URL,
     *   or if the URL is not on a known Todoist attachment host.
     *
     * @example
     * ```typescript
     * // From a comment object
     * const comments = await api.getComments({ taskId: '12345' })
     * const comment = comments.results[0]
     * const response = await api.viewAttachment(comment)
     * const imageData = await response.arrayBuffer()
     *
     * // From a URL string
     * const response = await api.viewAttachment('https://files.todoist.com/...')
     * const text = await response.text()
     * ```
     */
    async viewAttachment(commentOrUrl: Comment | string): Promise<FileResponse> {
        return this.uploadClient.viewAttachment(commentOrUrl)
    }

    // ── Folders ──

    /**
     * Retrieves a paginated list of folders.
     *
     * @param args - Filter parameters such as workspace ID.
     * @returns A promise that resolves to a paginated response of folders.
     */
    async getFolders(args: GetFoldersArgs): Promise<GetFoldersResponse> {
        return this.folderClient.getFolders(args)
    }

    /**
     * Retrieves a single folder by its ID.
     *
     * @param id - The unique identifier of the folder.
     * @returns A promise that resolves to the requested folder.
     */
    async getFolder(id: string): Promise<Folder> {
        return this.folderClient.getFolder(id)
    }

    /**
     * Creates a new folder.
     *
     * @param args - Folder creation parameters including name and workspace ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created folder.
     */
    async addFolder(args: AddFolderArgs, requestId?: string): Promise<Folder> {
        return this.folderClient.addFolder(args, requestId)
    }

    /**
     * Updates an existing folder by its ID.
     *
     * @param id - The unique identifier of the folder to update.
     * @param args - Update parameters such as name or default order.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated folder.
     */
    async updateFolder(id: string, args: UpdateFolderArgs, requestId?: string): Promise<Folder> {
        return this.folderClient.updateFolder(id, args, requestId)
    }

    /**
     * Deletes a folder by its ID.
     *
     * @param id - The unique identifier of the folder to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteFolder(id: string, requestId?: string): Promise<boolean> {
        return this.folderClient.deleteFolder(id, requestId)
    }

    // ── Billing ──

    /**
     * Retrieves the current user's subscription state.
     *
     * Requires the `billing:read` scope.
     *
     * @returns A promise that resolves to the user's subscription info.
     */
    async getSubscriptionInfo(): Promise<SubscriptionInfo> {
        return this.billingClient.getSubscriptionInfo()
    }

    /**
     * Starts a hosted cancellation flow for the current user's plan.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Optional cancellation reason details and return URL.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the billing portal redirect URL.
     */
    async cancelPlan(args?: CancelPlanArgs, requestId?: string): Promise<BillingPortalUrlResponse> {
        return this.billingClient.cancelPlan(args, requestId)
    }

    /**
     * Reactivates a previously canceled subscription.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the fresh subscription info after reactivation.
     */
    async reactivatePlan(requestId?: string): Promise<SubscriptionInfo> {
        return this.billingClient.reactivatePlan(requestId)
    }

    /**
     * Creates a Stripe checkout session to upgrade the current user to Pro.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Currency, billing cycle, redirect URLs, and optional promotion/trial details.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the checkout session URL.
     */
    async upgradeToPro(
        args: UpgradeToProArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        return this.billingClient.upgradeToPro(args, requestId)
    }

    /**
     * Creates a Stripe checkout session to start a Pro trial.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Currency, billing cycle, and redirect URLs.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the checkout session URL.
     */
    async startProTrial(
        args: StartProTrialArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        return this.billingClient.startProTrial(args, requestId)
    }

    /**
     * Creates a one-time Stripe billing portal session for the current user's Pro plan.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Return URL and optional flow type / promotion code.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the billing portal URL.
     */
    async createProBillingPortalSession(
        args: ProBillingPortalArgs,
        requestId?: string,
    ): Promise<BillingPortalUrlResponse> {
        return this.billingClient.createProBillingPortalSession(args, requestId)
    }

    /**
     * Retrieves the current user's Pro plan and billing details.
     *
     * Requires the `billing:read` scope.
     *
     * @returns A promise that resolves to the Pro plan details.
     */
    async getProPlanDetails(): Promise<ProPlanDetails> {
        return this.billingClient.getProPlanDetails()
    }

    /**
     * Creates a Stripe checkout session to upgrade a workspace.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Workspace ID, currency, billing cycle, redirect URLs, and optional promotion details.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the checkout session URL.
     */
    async upgradeWorkspace(
        args: UpgradeWorkspaceArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        return this.billingClient.upgradeWorkspace(args, requestId)
    }

    /**
     * Creates a Stripe checkout session to start a workspace trial.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Workspace ID, currency, billing cycle, and redirect URLs.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the checkout session URL.
     */
    async startWorkspaceTrial(
        args: StartWorkspaceTrialArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        return this.billingClient.startWorkspaceTrial(args, requestId)
    }

    /**
     * Creates a one-time Stripe billing portal session for a workspace.
     *
     * Requires the `billing:read_write` scope.
     *
     * @param args - Workspace ID, return URL, and optional flow type.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the billing portal URL.
     */
    async createWorkspaceBillingPortalSession(
        args: WorkspaceBillingPortalArgs,
        requestId?: string,
    ): Promise<BillingPortalUrlResponse> {
        return this.billingClient.createWorkspaceBillingPortalSession(args, requestId)
    }

    /**
     * Retrieves available Pro and Teams prices.
     *
     * Requires the `billing:read` scope.
     *
     * @returns A promise that resolves to the available prices.
     */
    async getPrices(): Promise<PricesResponse> {
        return this.billingClient.getPrices()
    }

    /**
     * Retrieves pricing information.
     *
     * Requires the `billing:read` scope.
     *
     * @param args - Optional flag to request formatted pricing.
     * @returns A promise that resolves to current and legacy pricing keyed by version.
     */
    async getPricing(args?: GetPricingArgs): Promise<PricingResponse> {
        return this.billingClient.getPricing(args)
    }

    // ── Backups ──

    /**
     * Retrieves a list of available backups.
     *
     * @param args - Optional parameters including MFA token.
     * @returns A promise that resolves to an array of backups.
     */
    async getBackups(args: GetBackupsArgs = {}): Promise<Backup[]> {
        return this.backupClient.getBackups(args)
    }

    /**
     * Downloads a backup file as binary data.
     *
     * @param args - Arguments including the backup file URL (from getBackups).
     * @returns A promise that resolves to a response with binary data accessible via arrayBuffer().
     */
    async downloadBackup(args: DownloadBackupArgs): Promise<FileResponse> {
        return this.backupClient.downloadBackup(args)
    }

    // ── Emails ──

    /**
     * Gets or creates an email forwarding address for an object.
     *
     * @param args - Arguments including object type and ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the email address.
     */
    async getOrCreateEmailForwarding(
        args: GetOrCreateEmailArgs,
        requestId?: string,
    ): Promise<GetOrCreateEmailResponse> {
        return this.emailClient.getOrCreateEmailForwarding(args, requestId)
    }

    /**
     * Disables email forwarding for an object.
     *
     * @param args - Arguments including object type and ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async disableEmailForwarding(args: DisableEmailArgs, requestId?: string): Promise<boolean> {
        return this.emailClient.disableEmailForwarding(args, requestId)
    }

    // ── ID Mappings ──

    /**
     * Retrieves ID mappings between old and new IDs.
     *
     * @param args - Arguments including object type and IDs to look up.
     * @returns A promise that resolves to an array of ID mappings.
     */
    async getIdMappings(args: GetIdMappingsArgs): Promise<IdMapping[]> {
        return this.idMappingClient.getIdMappings(args)
    }

    /**
     * Retrieves moved IDs for objects that have been migrated.
     *
     * @param args - Arguments including object type and optional old IDs to look up.
     * @returns A promise that resolves to an array of moved ID pairs.
     */
    async getMovedIds(args: GetMovedIdsArgs): Promise<MovedId[]> {
        return this.idMappingClient.getMovedIds(args)
    }

    // ── Templates ──

    /**
     * Exports a project as a template file (CSV format).
     *
     * @param args - Arguments including project ID and optional date format preference.
     * @returns A promise that resolves to the template file content as a string.
     */
    async exportTemplateAsFile(args: ExportTemplateFileArgs): Promise<string> {
        return this.templateClient.exportTemplateAsFile(args)
    }

    /**
     * Exports a project as a template URL.
     *
     * @param args - Arguments including project ID and optional date format preference.
     * @returns A promise that resolves to the file name and URL.
     */
    async exportTemplateAsUrl(args: ExportTemplateUrlArgs): Promise<ExportTemplateUrlResponse> {
        return this.templateClient.exportTemplateAsUrl(args)
    }

    /**
     * Creates a new project from a template file.
     *
     * @param args - Arguments including project name, template file, and optional workspace ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created project data.
     */
    async createProjectFromTemplate(
        args: CreateProjectFromTemplateArgs,
        requestId?: string,
    ): Promise<CreateProjectFromTemplateResponse> {
        return this.templateClient.createProjectFromTemplate(args, requestId)
    }

    /**
     * Imports a template file into an existing project.
     *
     * @param args - Arguments including project ID and template file.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the import result.
     */
    async importTemplateIntoProject(
        args: ImportTemplateIntoProjectArgs,
        requestId?: string,
    ): Promise<ImportTemplateResponse> {
        return this.templateClient.importTemplateIntoProject(args, requestId)
    }

    /**
     * Imports a template by ID into an existing project.
     *
     * @param args - Arguments including project ID, template ID, and optional locale.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the import result.
     */
    async importTemplateFromId(
        args: ImportTemplateFromIdArgs,
        requestId?: string,
    ): Promise<ImportTemplateResponse> {
        return this.templateClient.importTemplateFromId(args, requestId)
    }

    /**
     * Lists templates from the Todoist gallery.
     *
     * The default source (`doist`) and `/categories` / `/get` for Contentful IDs require no
     * authentication. Filtering by `user`, `workspace`, or `all` requires a token with the
     * `data:read_write` scope.
     *
     * @param args - Optional filters (type, source, locale, pagination, search, category).
     * @returns Paginated list of templates with `nextCursor` when `hasMore` is true.
     */
    async getTemplates(args: GetTemplatesArgs = {}): Promise<GetTemplatesResponse> {
        return this.templateClient.getTemplates(args)
    }

    /**
     * Lists the Contentful categories used to group gallery templates.
     *
     * @param args - Optional template type filter and locale.
     * @returns The list of template categories.
     */
    async getTemplateCategories(
        args: GetTemplateCategoriesArgs = {},
    ): Promise<GetTemplateCategoriesResponse> {
        return this.templateClient.getTemplateCategories(args)
    }

    /**
     * Fetches one or more templates by ID. Unknown IDs are silently omitted.
     *
     * Authentication is required if any ID belongs to a user template.
     *
     * @param args - Template IDs (1..100) and optional locale.
     * @returns A map of template ID to Template.
     */
    async getTemplatesByIds(args: GetTemplatesByIdsArgs): Promise<GetTemplatesByIdsResponse> {
        return this.templateClient.getTemplatesByIds(args)
    }

    /* Workspace methods */

    /**
     * Gets pending invitations for a workspace.
     *
     * @param args - Arguments including workspace ID.
     * @param requestId - Optional request ID for idempotency.
     * @returns Array of email addresses with pending invitations.
     */
    async getWorkspaceInvitations(
        args: GetWorkspaceInvitationsArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitationsResponse> {
        return this.workspaceClient.getWorkspaceInvitations(args, requestId)
    }

    /**
     * Gets all workspace invitations (admin only).
     *
     * @param requestId - Optional request ID for idempotency.
     * @returns Array of email addresses with pending invitations.
     */
    async getAllWorkspaceInvitations(
        args: { workspaceId?: string } = {},
        requestId?: string,
    ): Promise<AllWorkspaceInvitationsResponse> {
        return this.workspaceClient.getAllWorkspaceInvitations(args, requestId)
    }

    /**
     * Deletes a workspace invitation (admin only).
     *
     * @param args - Arguments including workspace ID and user email.
     * @param requestId - Optional request ID for idempotency.
     * @returns The deleted invitation.
     */
    async deleteWorkspaceInvitation(
        args: DeleteWorkspaceInvitationArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitation> {
        return this.workspaceClient.deleteWorkspaceInvitation(args, requestId)
    }

    /**
     * Accepts a workspace invitation.
     *
     * @param args - Arguments including invite code.
     * @param requestId - Optional request ID for idempotency.
     * @returns The accepted invitation.
     */
    async acceptWorkspaceInvitation(
        args: WorkspaceInvitationActionArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitation> {
        return this.workspaceClient.acceptWorkspaceInvitation(args, requestId)
    }

    /**
     * Rejects a workspace invitation.
     *
     * @param args - Arguments including invite code.
     * @param requestId - Optional request ID for idempotency.
     * @returns The rejected invitation.
     */
    async rejectWorkspaceInvitation(
        args: WorkspaceInvitationActionArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitation> {
        return this.workspaceClient.rejectWorkspaceInvitation(args, requestId)
    }

    /**
     * Joins a workspace via invitation link or domain auto-join.
     *
     * @param args - Arguments including invite code or workspace ID.
     * @param requestId - Optional request ID for idempotency.
     * @returns Workspace user information.
     */
    async joinWorkspace(args: JoinWorkspaceArgs, requestId?: string): Promise<JoinWorkspaceResult> {
        return this.workspaceClient.joinWorkspace(args, requestId)
    }

    /**
     * Uploads or updates a workspace logo.
     *
     * @param args - Arguments including workspace ID, file, and options.
     * @param requestId - Optional request ID for idempotency.
     * @returns Logo information or null if deleted.
     */
    async uploadWorkspaceLogo(
        args: WorkspaceLogoArgs,
        requestId?: string,
    ): Promise<WorkspaceLogoResponse> {
        return this.workspaceClient.uploadWorkspaceLogo(args, requestId)
    }

    /**
     * Gets workspace plan and billing details.
     *
     * @param args - Arguments including workspace ID.
     * @param requestId - Optional request ID for idempotency.
     * @returns Workspace plan details.
     */
    async getWorkspacePlanDetails(
        args: GetWorkspacePlanDetailsArgs,
        requestId?: string,
    ): Promise<WorkspacePlanDetails> {
        return this.workspaceClient.getWorkspacePlanDetails(args, requestId)
    }

    /**
     * Gets workspace users with pagination.
     *
     * @param args - Arguments including optional workspace ID, cursor, and limit.
     * @param requestId - Optional request ID for idempotency.
     * @returns Paginated list of workspace users.
     */
    async getWorkspaceUsers(
        args: GetWorkspaceUsersArgs = {},
        requestId?: string,
    ): Promise<GetWorkspaceUsersResponse> {
        return this.workspaceClient.getWorkspaceUsers(args, requestId)
    }

    /**
     * Retrieves all workspaces for the authenticated user.
     *
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to an array of workspaces.
     *
     * @example
     * ```typescript
     * const workspaces = await api.getWorkspaces()
     * workspaces.forEach(workspace => {
     *   console.log(`${workspace.name} (${workspace.plan}) - Role: ${workspace.role}`)
     * })
     * ```
     */
    async getWorkspaces(requestId?: string): Promise<Workspace[]> {
        return this.workspaceClient.getWorkspaces(requestId)
    }

    /**
     * Retrieves a workspace by its ID.
     *
     * @param id - The unique identifier of the workspace.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the requested workspace.
     */
    async getWorkspace(id: string, requestId?: string): Promise<Workspace> {
        return this.workspaceClient.getWorkspace(id, requestId)
    }

    /**
     * Creates a new workspace.
     *
     * @param args - The arguments for creating the workspace.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the created workspace.
     */
    async addWorkspace(args: AddWorkspaceArgs, requestId?: string): Promise<Workspace> {
        return this.workspaceClient.addWorkspace(args, requestId)
    }

    /**
     * Updates an existing workspace.
     *
     * @param id - The unique identifier of the workspace to update.
     * @param args - The arguments for updating the workspace.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated workspace.
     */
    async updateWorkspace(
        id: string,
        args: UpdateWorkspaceArgs,
        requestId?: string,
    ): Promise<Workspace> {
        return this.workspaceClient.updateWorkspace(id, args, requestId)
    }

    /**
     * Deletes a workspace by its ID.
     *
     * @param id - The unique identifier of the workspace to delete.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async deleteWorkspace(id: string, requestId?: string): Promise<boolean> {
        return this.workspaceClient.deleteWorkspace(id, requestId)
    }

    /**
     * Retrieves activity information for workspace members.
     *
     * @param args - Arguments including workspace ID and optional user/project filters.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to workspace members activity data.
     */
    async getWorkspaceMembersActivity(
        args: GetWorkspaceMembersActivityArgs,
        requestId?: string,
    ): Promise<GetWorkspaceMembersActivityResponse> {
        return this.workspaceClient.getWorkspaceMembersActivity(args, requestId)
    }

    /**
     * Retrieves tasks assigned to a specific user in a workspace.
     *
     * @param args - Arguments including workspace ID, user ID, and optional project filter.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to workspace user tasks.
     */
    async getWorkspaceUserTasks(
        args: GetWorkspaceUserTasksArgs,
        requestId?: string,
    ): Promise<GetWorkspaceUserTasksResponse> {
        return this.workspaceClient.getWorkspaceUserTasks(args, requestId)
    }

    /**
     * Invites users to a workspace by email.
     *
     * @param args - Arguments including workspace ID, email list, and optional role.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the list of invited emails.
     */
    async inviteWorkspaceUsers(
        args: InviteWorkspaceUsersArgs,
        requestId?: string,
    ): Promise<InviteWorkspaceUsersResponse> {
        return this.workspaceClient.inviteWorkspaceUsers(args, requestId)
    }

    /**
     * Updates a workspace user's role.
     *
     * @param args - Arguments including workspace ID, user ID, and new role.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to the updated workspace user view.
     */
    async updateWorkspaceUser(
        args: UpdateWorkspaceUserArgs,
        requestId?: string,
    ): Promise<JoinWorkspaceResult> {
        return this.workspaceClient.updateWorkspaceUser(args, requestId)
    }

    /**
     * Removes a user from a workspace.
     *
     * @param args - Arguments including workspace ID and user ID.
     * @param requestId - Optional custom identifier for the request.
     * @returns A promise that resolves to `true` if successful.
     */
    async removeWorkspaceUser(args: RemoveWorkspaceUserArgs, requestId?: string): Promise<boolean> {
        return this.workspaceClient.removeWorkspaceUser(args, requestId)
    }

    /**
     * Gets active projects in a workspace with pagination.
     *
     * @param args - Arguments including workspace ID, cursor, and limit.
     * @param requestId - Optional request ID for idempotency.
     * @returns Paginated list of active workspace projects.
     */
    async getWorkspaceActiveProjects(
        args: GetWorkspaceProjectsArgs,
        requestId?: string,
    ): Promise<GetProjectsResponse> {
        return this.workspaceClient.getWorkspaceActiveProjects(args, requestId)
    }

    /**
     * Gets archived projects in a workspace with pagination.
     *
     * @param args - Arguments including workspace ID, cursor, and limit.
     * @param requestId - Optional request ID for idempotency.
     * @returns Paginated list of archived workspace projects.
     */
    async getWorkspaceArchivedProjects(
        args: GetWorkspaceProjectsArgs,
        requestId?: string,
    ): Promise<GetProjectsResponse> {
        return this.workspaceClient.getWorkspaceArchivedProjects(args, requestId)
    }

    // ---------------------------------------------------------------------------
    // App management (dev:app_console scope)
    // ---------------------------------------------------------------------------

    /**
     * Lists all developer applications owned by the authenticated user.
     *
     * Requires the `dev:app_console` scope.
     *
     * @param requestId - Optional request ID for idempotency.
     * @returns A promise that resolves to the list of apps.
     */
    async getApps(requestId?: string): Promise<App[]> {
        return this.appClient.getApps(requestId)
    }

    /**
     * Retrieves a single developer application by ID.
     *
     * Requires the `dev:app_console` scope.
     */
    async getApp(appId: string, requestId?: string): Promise<AppWithUserCount> {
        return this.appClient.getApp(appId, requestId)
    }

    /**
     * Creates a new developer application.
     *
     * Requires the `dev:app_console` scope.
     */
    async addApp(args: AddAppArgs, requestId?: string): Promise<App> {
        return this.appClient.addApp(args, requestId)
    }

    /**
     * Updates a developer application.
     *
     * Requires the `dev:app_console` scope.
     */
    async updateApp(
        appId: string,
        args: UpdateAppArgs,
        requestId?: string,
    ): Promise<AppWithUserCount> {
        return this.appClient.updateApp(appId, args, requestId)
    }

    /**
     * Deletes a developer application.
     *
     * Requires the `dev:app_console` scope.
     */
    async deleteApp(appId: string, requestId?: string): Promise<boolean> {
        return this.appClient.deleteApp(appId, requestId)
    }

    /**
     * Retrieves the OAuth client credentials (client ID and secret) for an app.
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppSecrets(appId: string, requestId?: string): Promise<AppSecrets> {
        return this.appClient.getAppSecrets(appId, requestId)
    }

    /**
     * Rotates the app's OAuth client secret, returning the updated app record.
     *
     * Requires the `dev:app_console` scope.
     */
    async resetAppClientSecret(appId: string, requestId?: string): Promise<AppWithUserCount> {
        return this.appClient.resetAppClientSecret(appId, requestId)
    }

    /**
     * Revokes every access token issued for the given app.
     *
     * Requires the `dev:app_console` scope.
     */
    async revokeAppTokens(appId: string, requestId?: string): Promise<AppWithUserCount> {
        return this.appClient.revokeAppTokens(appId, requestId)
    }

    /**
     * Uploads an icon for a developer application. The `size` argument
     * selects which icon slot to update (defaults to `'medium'`).
     *
     * Requires the `dev:app_console` scope.
     */
    async uploadAppIcon(args: UploadAppIconArgs, requestId?: string): Promise<AppWithUserCount> {
        return this.appClient.uploadAppIcon(args, requestId)
    }

    /**
     * Gets the currently issued developer test token for an app (null if none exists).
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppTestToken(appId: string, requestId?: string): Promise<AppTestToken> {
        return this.appClient.getAppTestToken(appId, requestId)
    }

    /**
     * Creates (or rotates) a developer test token for an app.
     *
     * Requires the `dev:app_console` scope.
     */
    async createAppTestToken(appId: string, requestId?: string): Promise<AppTestToken> {
        return this.appClient.createAppTestToken(appId, requestId)
    }

    /**
     * Gets the distribution token for an app, which third parties use to install it.
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppDistributionToken(
        appId: string,
        requestId?: string,
    ): Promise<AppDistributionToken> {
        return this.appClient.getAppDistributionToken(appId, requestId)
    }

    /**
     * Gets the current webhook verification token for an app.
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppVerificationToken(
        appId: string,
        requestId?: string,
    ): Promise<AppVerificationToken> {
        return this.appClient.getAppVerificationToken(appId, requestId)
    }

    /**
     * Resets the webhook verification token for an app, returning the new value.
     *
     * Requires the `dev:app_console` scope.
     */
    async resetAppVerificationToken(
        appId: string,
        requestId?: string,
    ): Promise<AppVerificationToken> {
        return this.appClient.resetAppVerificationToken(appId, requestId)
    }

    /**
     * Resolves a public-facing app view from a distribution token. Used during
     * the installation flow to show prospective installers what the app does
     * and which scopes it requests.
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppByDistributionToken(
        distributionToken: string,
        requestId?: string,
    ): Promise<AppByDistributionToken> {
        return this.appClient.getAppByDistributionToken(distributionToken, requestId)
    }

    /**
     * Gets the webhook configuration for an app (null if no webhook is configured).
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppWebhook(appId: string, requestId?: string): Promise<AppWebhook | null> {
        return this.appClient.getAppWebhook(appId, requestId)
    }

    /**
     * Creates or updates an app webhook configuration (upsert).
     *
     * Requires the `dev:app_console` scope.
     */
    async updateAppWebhook(args: UpdateAppWebhookArgs, requestId?: string): Promise<AppWebhook> {
        return this.appClient.updateAppWebhook(args, requestId)
    }

    /**
     * Deletes an app webhook configuration.
     *
     * Requires the `dev:app_console` scope.
     */
    async deleteAppWebhook(appId: string, requestId?: string): Promise<boolean> {
        return this.appClient.deleteAppWebhook(appId, requestId)
    }

    /**
     * Lists all apps installed on the authenticated user's account.
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppInstallations(requestId?: string): Promise<AppInstallation[]> {
        return this.appClient.getAppInstallations(requestId)
    }

    /**
     * Installs an application via its distribution token.
     *
     * Requires the `dev:app_console` scope.
     */
    async installApp(args: InstallAppArgs, requestId?: string): Promise<AppInstallation> {
        return this.appClient.installApp(args, requestId)
    }

    /**
     * Retrieves a single app installation by ID.
     *
     * Requires the `dev:app_console` scope.
     */
    async getAppInstallation(installationId: string, requestId?: string): Promise<AppInstallation> {
        return this.appClient.getAppInstallation(installationId, requestId)
    }

    /**
     * Updates an app installation.
     *
     * Requires the `dev:app_console` scope.
     */
    async updateAppInstallation(
        installationId: string,
        args: UpdateAppInstallationArgs,
        requestId?: string,
    ): Promise<AppInstallation> {
        return this.appClient.updateAppInstallation(installationId, args, requestId)
    }

    /**
     * Uninstalls (removes) an app installation.
     *
     * Requires the `dev:app_console` scope.
     */
    async uninstallApp(installationId: string, requestId?: string): Promise<boolean> {
        return this.appClient.uninstallApp(installationId, requestId)
    }

    /**
     * Retrieves a single UI extension by ID.
     *
     * Requires the `dev:app_console` scope.
     */
    async getUiExtension(uiExtensionId: string, requestId?: string): Promise<UiExtension> {
        return this.uiExtensionClient.getUiExtension(uiExtensionId, requestId)
    }

    /**
     * Lists UI extensions available (installed) in the web client for the current user.
     *
     * Requires the `dev:app_console` scope.
     */
    async getInstalledUiExtensions(requestId?: string): Promise<UiExtension[]> {
        return this.uiExtensionClient.getInstalledUiExtensions(requestId)
    }

    /**
     * Lists all UI extensions belonging to a given app (integration).
     *
     * Requires the `dev:app_console` scope.
     */
    async getUiExtensionsForApp(appId: string, requestId?: string): Promise<UiExtension[]> {
        return this.uiExtensionClient.getUiExtensionsForApp(appId, requestId)
    }

    /**
     * Adds a new UI extension to an app.
     *
     * Requires the `dev:app_console` scope.
     */
    async addUiExtension(args: AddUiExtensionArgs, requestId?: string): Promise<UiExtension> {
        return this.uiExtensionClient.addUiExtension(args, requestId)
    }

    /**
     * Updates an existing UI extension.
     *
     * Requires the `dev:app_console` scope.
     */
    async updateUiExtension(
        uiExtensionId: string,
        args: UpdateUiExtensionArgs,
        requestId?: string,
    ): Promise<UiExtension> {
        return this.uiExtensionClient.updateUiExtension(uiExtensionId, args, requestId)
    }

    /**
     * Deletes a UI extension.
     *
     * Requires the `dev:app_console` scope.
     */
    async deleteUiExtension(uiExtensionId: string, requestId?: string): Promise<boolean> {
        return this.uiExtensionClient.deleteUiExtension(uiExtensionId, requestId)
    }

    /**
     * Uploads an icon for a UI extension.
     *
     * Requires the `dev:app_console` scope.
     */
    async uploadUiExtensionIcon(
        args: UploadUiExtensionIconArgs,
        requestId?: string,
    ): Promise<UiExtension> {
        return this.uiExtensionClient.uploadUiExtensionIcon(args, requestId)
    }

    /**
     * Lists all apps the user has authorized (granted a token to).
     *
     * Requires the `dev:app_console` scope.
     */
    async getUserAuthorizations(requestId?: string): Promise<UserAuthorization[]> {
        return this.appClient.getUserAuthorizations(requestId)
    }

    /**
     * Revokes a specific user authorization (access token granted to a third-party app).
     *
     * Requires the `dev:app_console` scope.
     */
    async revokeUserAuthorization(
        args: RevokeUserAuthorizationArgs,
        requestId?: string,
    ): Promise<boolean> {
        return this.appClient.revokeUserAuthorization(args, requestId)
    }
}
