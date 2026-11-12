import type { WorkspaceProjectSummary } from '../projects/types'
import type {
    MemberActivityInfo,
    WorkspaceInvitation,
    WorkspaceRole,
    WorkspaceUser,
    WorkspaceUserTask,
} from './types'

/**
 * Arguments for creating a new workspace.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/create_workspace_api_v1_workspaces_post
 */
export type AddWorkspaceArgs = {
    /** Name of the workspace. */
    name: string
    /** Description of the workspace. */
    description?: string | null
    /** Whether link sharing is enabled for the workspace. */
    isLinkSharingEnabled?: boolean
    /** Whether guests are allowed in the workspace. */
    isGuestAllowed?: boolean
    /** Workspace email domain. */
    domainName?: string | null
    /** Whether users with matching email domains can discover this workspace. */
    domainDiscovery?: boolean
    /** Whether workspace invites are restricted to workspace domain. */
    restrictEmailDomains?: boolean
    /** Workspace properties. */
    properties?: Record<string, unknown> | null
}

/**
 * Arguments for updating an existing workspace.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/update_workspace_api_v1_workspaces__workspace_id__post
 */
export type UpdateWorkspaceArgs = {
    /** Updated workspace name. */
    name?: string
    /** Updated workspace description. */
    description?: string | null
    /** Updated link sharing status. */
    isLinkSharingEnabled?: boolean
    /** Updated guest access status. */
    isGuestAllowed?: boolean | null
    /** Updated workspace email domain. */
    domainName?: string | null
    /** Updated domain discovery setting. */
    domainDiscovery?: boolean
    /** Updated email domain restriction setting. */
    restrictEmailDomains?: boolean
    /** Updated workspace properties. */
    properties?: Record<string, unknown> | null
    /** Updated collapse state for current user. */
    isCollapsed?: boolean
}

/**
 * Arguments for getting workspace members activity.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/get_workspace_members_activity_api_v1_workspaces_members_get
 */
export type GetWorkspaceMembersActivityArgs = {
    /** The workspace ID. */
    workspaceId: string
    /** Comma-separated list of user IDs to filter by. */
    userIds?: string | null
    /** Comma-separated list of project IDs to filter by. */
    projectIds?: string | null
}

/**
 * Response from getting workspace members activity.
 */
export type GetWorkspaceMembersActivityResponse = {
    members: MemberActivityInfo[]
}

/**
 * Arguments for getting tasks assigned to a workspace user.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/get_workspace_user_tasks_api_v1_workspaces__workspace_id__users__user_id__tasks_get
 */
export type GetWorkspaceUserTasksArgs = {
    /** The workspace ID. */
    workspaceId: string
    /** The user ID. */
    userId: string
    /** Comma-separated list of project IDs to filter by. */
    projectIds?: string | null
}

/**
 * Response from getting workspace user tasks.
 */
export type GetWorkspaceUserTasksResponse = {
    tasks: WorkspaceUserTask[]
}

/**
 * Arguments for inviting users to a workspace.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/invite_workspace_users_api_v1_workspaces__workspace_id__users_invite_post
 */
export type InviteWorkspaceUsersArgs = {
    /** The workspace ID. */
    workspaceId: string
    /** List of user emails to invite. */
    emailList: string[]
    /** Role assigned to invited users. */
    role?: WorkspaceRole
}

/**
 * Response from inviting workspace users.
 */
export type InviteWorkspaceUsersResponse = {
    invitedEmails: string[]
}

/**
 * Arguments for updating a workspace user's role.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/update_workspace_user_api_v1_workspaces__workspace_id__users__user_id__post
 */
export type UpdateWorkspaceUserArgs = {
    /** The workspace ID. */
    workspaceId: string
    /** The user ID. */
    userId: string
    /** Updated role for the user. */
    role: WorkspaceRole
}

/**
 * Arguments for removing a user from a workspace.
 * @see https://developer.todoist.com/api/v1/#tag/Workspace/operation/remove_workspace_user_api_v1_workspaces__workspace_id__users__user_id__delete
 */
export type RemoveWorkspaceUserArgs = {
    /** The workspace ID. */
    workspaceId: string
    /** The user ID. */
    userId: string
}

/**
 * Arguments for getting workspace invitations.
 */
export type GetWorkspaceInvitationsArgs = {
    /**
     * The workspace ID to get invitations for.
     */
    workspaceId: string
}

/**
 * Arguments for deleting a workspace invitation.
 */
export type DeleteWorkspaceInvitationArgs = {
    /**
     * The workspace ID.
     */
    workspaceId: string
    /**
     * The email address of the invitation to delete.
     */
    userEmail: string
}

/**
 * Arguments for accepting/rejecting a workspace invitation.
 */
export type WorkspaceInvitationActionArgs = {
    /**
     * The invitation code from the email.
     */
    inviteCode: string
}

/**
 * Arguments for joining a workspace.
 */
export type JoinWorkspaceArgs = {
    /**
     * Optional invitation code/link to join via.
     */
    inviteCode?: string | null
    /**
     * Optional workspace ID to join via domain auto-join.
     */
    workspaceId?: string | null
}

/**
 * Arguments for uploading/updating workspace logo.
 */
export type WorkspaceLogoArgs = {
    /**
     * The workspace ID.
     */
    workspaceId: string
    /**
     * The image file to upload (Buffer, Stream, or file path).
     */
    file?: Buffer | NodeJS.ReadableStream | string | Blob
    /**
     * The file name (required for Buffer/Stream uploads).
     */
    fileName?: string
    /**
     * Whether to delete the logo instead of updating it.
     */
    delete?: boolean
}

/**
 * Arguments for getting workspace plan details.
 */
export type GetWorkspacePlanDetailsArgs = {
    /**
     * The workspace ID.
     */
    workspaceId: string
}

/**
 * Arguments for getting workspace users (paginated).
 */
export type GetWorkspaceUsersArgs = {
    /**
     * Optional workspace ID. If not provided, returns users for all workspaces.
     */
    workspaceId?: string | null
    /**
     * Cursor for pagination.
     */
    cursor?: string | null
    /**
     * Maximum number of users to return (default: 100).
     */
    limit?: number
}

/**
 * Arguments for getting workspace projects (paginated).
 */
export type GetWorkspaceProjectsArgs = {
    /**
     * The workspace ID.
     */
    workspaceId: string
    /**
     * Cursor for pagination.
     */
    cursor?: string | null
    /**
     * Maximum number of projects to return (default: 100).
     */
    limit?: number
}

/**
 * Paginated response for a workspace's active or archived projects.
 */
export type GetWorkspaceProjectsResponse = {
    /**
     * The workspace projects in this page, including ones the user hasn't joined.
     */
    results: WorkspaceProjectSummary[]
    /**
     * Cursor for the next page of results, or `null` on the last page.
     */
    nextCursor: string | null
    /**
     * Whether there are more projects available.
     */
    hasMore: boolean
}

/**
 * Paginated response for workspace users.
 */
export type GetWorkspaceUsersResponse = {
    /**
     * Whether there are more users available.
     */
    hasMore: boolean
    /**
     * Cursor for the next page of results.
     */
    nextCursor?: string
    /**
     * Array of workspace users.
     */
    workspaceUsers: WorkspaceUser[]
}

/**
 * Response type for workspace invitations endpoint (simple email list).
 */
export type WorkspaceInvitationsResponse = string[]

/**
 * Response type for all workspace invitations endpoint (detailed objects).
 */
export type AllWorkspaceInvitationsResponse = WorkspaceInvitation[]

/**
 * Response type for workspace logo upload.
 */
export type WorkspaceLogoResponse = Record<string, unknown> | null
