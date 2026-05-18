const BASE_URI = 'https://api.todoist.com'
const TODOIST_URI = 'https://todoist.com'
export const TODOIST_WEB_URI = 'https://app.todoist.com/app'

// The API version is not configurable, to ensure
// compatibility between the API and the client.
export const API_VERSION = 'v1'

export const API_BASE_URI = `/api/${API_VERSION}/`
const API_AUTHORIZATION_BASE_URI = '/oauth/'

export function getSyncBaseUri(domainBase: string = BASE_URI): string {
    return new URL(API_BASE_URI, domainBase).toString()
}

export function getApiRootBaseUri(domainBase: string = BASE_URI): string {
    return new URL('/', domainBase).toString()
}

export function getAuthBaseUri(domainBase: string = TODOIST_URI): string {
    return new URL(API_AUTHORIZATION_BASE_URI, domainBase).toString()
}

export const ENDPOINT_REST_TASKS = 'tasks'
export const ENDPOINT_REST_TASKS_FILTER = ENDPOINT_REST_TASKS + '/filter'
export const ENDPOINT_REST_TASKS_COMPLETED_BY_COMPLETION_DATE =
    ENDPOINT_REST_TASKS + '/completed/by_completion_date'
export const ENDPOINT_REST_TASKS_COMPLETED_BY_DUE_DATE =
    ENDPOINT_REST_TASKS + '/completed/by_due_date'
export const ENDPOINT_REST_TASKS_COMPLETED_SEARCH = 'completed/search'
export const ENDPOINT_REST_SECTIONS = 'sections'
export const ENDPOINT_REST_SECTIONS_SEARCH = ENDPOINT_REST_SECTIONS + '/search'
export const ENDPOINT_REST_LABELS = 'labels'
export const ENDPOINT_REST_LABELS_SEARCH = ENDPOINT_REST_LABELS + '/search'
export const ENDPOINT_REST_LABELS_SHARED = ENDPOINT_REST_LABELS + '/shared'
export const ENDPOINT_REST_LABELS_SHARED_RENAME = ENDPOINT_REST_LABELS_SHARED + '/rename'
export const ENDPOINT_REST_LABELS_SHARED_REMOVE = ENDPOINT_REST_LABELS_SHARED + '/remove'
export const ENDPOINT_REST_COMMENTS = 'comments'
export const ENDPOINT_REST_REMINDERS = 'reminders'
export const ENDPOINT_REST_LOCATION_REMINDERS = 'location_reminders'
export const ENDPOINT_REST_TASK_CLOSE = 'close'
export const ENDPOINT_REST_TASK_REOPEN = 'reopen'
export const ENDPOINT_REST_TASK_MOVE = 'move'
export const ENDPOINT_REST_PROJECTS = 'projects'
export const ENDPOINT_REST_PROJECTS_SEARCH = ENDPOINT_REST_PROJECTS + '/search'
export const ENDPOINT_REST_PROJECTS_ARCHIVED = ENDPOINT_REST_PROJECTS + '/archived'
export const ENDPOINT_REST_PROJECT_COLLABORATORS = 'collaborators'
export const ENDPOINT_REST_USER = 'user'
export const ENDPOINT_REST_PRODUCTIVITY = ENDPOINT_REST_TASKS + '/completed/stats'
export const ENDPOINT_REST_ACTIVITIES = 'activities'
export const ENDPOINT_REST_UPLOADS = 'uploads'
export const PROJECT_ARCHIVE = 'archive'
export const PROJECT_UNARCHIVE = 'unarchive'
export const ENDPOINT_REST_PROJECTS_ARCHIVED_COUNT = ENDPOINT_REST_PROJECTS + '/archived/count'
export const ENDPOINT_REST_PROJECTS_PERMISSIONS = ENDPOINT_REST_PROJECTS + '/permissions'
export const ENDPOINT_REST_PROJECT_FULL = 'full'
export const ENDPOINT_REST_PROJECT_JOIN = 'join'
export const SECTION_ARCHIVE = 'archive'
export const SECTION_UNARCHIVE = 'unarchive'
export const ENDPOINT_REST_PROJECTS_MOVE_TO_WORKSPACE =
    ENDPOINT_REST_PROJECTS + '/move_to_workspace'
export const ENDPOINT_REST_PROJECTS_MOVE_TO_PERSONAL = ENDPOINT_REST_PROJECTS + '/move_to_personal'

export const ENDPOINT_REST_TASKS_COMPLETED = ENDPOINT_REST_TASKS + '/completed'
export const ENDPOINT_REST_TEMPLATES_FILE = 'templates/file'
export const ENDPOINT_REST_TEMPLATES_URL = 'templates/url'
export const ENDPOINT_REST_TEMPLATES_CREATE_FROM_FILE = 'templates/create_project_from_file'
export const ENDPOINT_REST_TEMPLATES_IMPORT_FROM_FILE = 'templates/import_into_project_from_file'
export const ENDPOINT_REST_TEMPLATES_IMPORT_FROM_ID =
    'templates/import_into_project_from_template_id'

export const ENDPOINT_REST_ACCESS_TOKENS_MIGRATE = 'access_tokens/migrate_personal_token'
export const ENDPOINT_REST_BACKUPS = 'backups'
export const ENDPOINT_REST_BACKUPS_DOWNLOAD = 'backups/download'
export const ENDPOINT_REST_EMAILS = 'emails'
export const ENDPOINT_REST_ID_MAPPINGS = 'id_mappings'
export const ENDPOINT_REST_MOVED_IDS = 'moved_ids'

export const ENDPOINT_SYNC_QUICK_ADD = ENDPOINT_REST_TASKS + '/quick'

export const ENDPOINT_SYNC = 'sync'

export const ENDPOINT_AUTHORIZATION = 'authorize'
export const ENDPOINT_GET_TOKEN = 'access_token'
export const ENDPOINT_REVOKE = 'revoke'
export const ENDPOINT_REGISTER = 'register'

export const ENDPOINT_REST_FOLDERS = 'folders'

export const ENDPOINT_REST_GOALS = 'goals'
export const ENDPOINT_REST_GOALS_SEARCH = ENDPOINT_REST_GOALS + '/search'
export const GOAL_COMPLETE = 'complete'
export const GOAL_UNCOMPLETE = 'uncomplete'
export const GOAL_TASKS = 'items'

// Workspace endpoints
export const ENDPOINT_REST_WORKSPACES = 'workspaces'
export const ENDPOINT_WORKSPACE_INVITATIONS = 'workspaces/invitations'
export const ENDPOINT_WORKSPACE_INVITATIONS_ALL = 'workspaces/invitations/all'
export const ENDPOINT_WORKSPACE_INVITATIONS_DELETE = 'workspaces/invitations/delete'
export const ENDPOINT_WORKSPACE_JOIN = 'workspaces/join'
export const ENDPOINT_WORKSPACE_LOGO = 'workspaces/logo'
export const ENDPOINT_WORKSPACE_PLAN_DETAILS = 'workspaces/plan_details'
export const ENDPOINT_WORKSPACE_USERS = 'workspaces/users'

// Workspace invitation actions (require invite_code parameter)
export function getWorkspaceInvitationAcceptEndpoint(inviteCode: string): string {
    return `workspaces/invitations/${inviteCode}/accept`
}

export function getWorkspaceInvitationRejectEndpoint(inviteCode: string): string {
    return `workspaces/invitations/${inviteCode}/reject`
}

// Insights endpoints
export function getProjectInsightsActivityStatsEndpoint(projectId: string): string {
    return `projects/${projectId}/insights/activity_stats`
}

export function getProjectInsightsHealthEndpoint(projectId: string): string {
    return `projects/${projectId}/insights/health`
}

export function getProjectInsightsHealthContextEndpoint(projectId: string): string {
    return `projects/${projectId}/insights/health/context`
}

export function getProjectInsightsProgressEndpoint(projectId: string): string {
    return `projects/${projectId}/insights/progress`
}

export function getProjectInsightsHealthAnalyzeEndpoint(projectId: string): string {
    return `projects/${projectId}/insights/health/analyze`
}

export function getWorkspaceInsightsEndpoint(workspaceId: string): string {
    return `workspaces/${workspaceId}/insights`
}

// Workspace members
export const ENDPOINT_WORKSPACE_MEMBERS = 'workspaces/members'

// Workspace user management (require workspace_id and/or user_id parameters)
export function getWorkspaceUserTasksEndpoint(workspaceId: string, userId: string): string {
    return `workspaces/${workspaceId}/users/${userId}/tasks`
}

export function getWorkspaceInviteUsersEndpoint(workspaceId: string): string {
    return `workspaces/${workspaceId}/users/invite`
}

export function getWorkspaceUserEndpoint(workspaceId: string, userId: string): string {
    return `workspaces/${workspaceId}/users/${userId}`
}

// Workspace projects (require workspace_id parameter)
export function getWorkspaceActiveProjectsEndpoint(workspaceId: string): string {
    return `workspaces/${workspaceId}/projects/active`
}

export function getWorkspaceArchivedProjectsEndpoint(workspaceId: string): string {
    return `workspaces/${workspaceId}/projects/archived`
}

// App management endpoints (dev:app_console scope)
export const ENDPOINT_REST_APPS = 'apps'
export const ENDPOINT_REST_APPS_INSTALLATIONS = 'apps/installations'
export const ENDPOINT_REST_APPS_UI_EXTENSIONS = 'apps/ui_extensions'
export const ENDPOINT_REST_APPS_UI_EXTENSIONS_INSTALLED = 'apps/ui_extensions/installed'
export const ENDPOINT_REST_USER_AUTHORIZATIONS = 'user/authorizations'
export const ENDPOINT_REST_USER_AUTHORIZATIONS_DELETE = 'user/authorizations/delete'

/** Available app icon sizes (small 60x60, medium 300x300, large 600x600). */
export const APP_ICON_SIZES = ['small', 'medium', 'large'] as const
/** Size of an app icon. */
export type AppIconSize = (typeof APP_ICON_SIZES)[number]

export function getAppEndpoint(appId: string): string {
    return `apps/${appId}`
}

export function getAppSecretsEndpoint(appId: string): string {
    return `apps/${appId}/secrets`
}

export function getAppClientSecretEndpoint(appId: string): string {
    return `apps/${appId}/client_secret`
}

export function getAppTokensEndpoint(appId: string): string {
    return `apps/${appId}/tokens`
}

export function getAppTestTokenEndpoint(appId: string): string {
    return `apps/${appId}/test_token`
}

export function getAppDistributionTokenEndpoint(appId: string): string {
    return `apps/${appId}/distribution_token`
}

export function getAppVerificationTokenEndpoint(appId: string): string {
    return `apps/${appId}/verification_token`
}

export function getAppWebhookEndpoint(appId: string): string {
    return `apps/${appId}/webhook`
}

export function getAppIconEndpoint(appId: string, size: AppIconSize): string {
    return size === 'medium' ? `apps/${appId}/icon` : `apps/${appId}/icon/${size}`
}

export function getAppInstallationEndpoint(installationId: string): string {
    return `apps/installations/${installationId}`
}

export function getAppByDistributionTokenEndpoint(distributionToken: string): string {
    return `apps/by_distribution_token/${distributionToken}`
}

export function getUiExtensionEndpoint(uiExtensionId: string): string {
    return `apps/ui_extensions/${uiExtensionId}`
}

export function getUiExtensionIconEndpoint(uiExtensionId: string): string {
    return `apps/ui_extensions/${uiExtensionId}/icon`
}

export function getUiExtensionsByIntegrationEndpoint(integrationId: string): string {
    return `apps/ui_extensions/integration/${integrationId}`
}
