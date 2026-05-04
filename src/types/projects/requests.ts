import type { ColorKey } from '../../utils/colors'
import type { Comment } from '../comments/types'
import type { SearchArgs } from '../common'
import type { Section } from '../sections/types'
import type { Collaborator, CollaboratorState } from '../sync/resources/collaborators'
import type { Folder } from '../sync/resources/folders'
import type { Note } from '../sync/resources/notes'
import type { Task } from '../tasks/types'
import type { User } from '../users/types'
import type { CollaboratorRole, WorkspaceRole } from '../workspaces/types'
import type {
    PersonalProject,
    ProjectViewStyle,
    ProjectVisibility,
    WorkspaceProject,
} from './types'

/**
 * Arguments for retrieving projects.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/get_projects_api_v1_projects_get
 */
export type GetProjectsArgs = {
    /** Filter projects to only those in this folder. If provided, workspaceId is ignored. */
    folderId?: string | null
    /** Filter projects to only those in this workspace. Ignored if folderId is also provided. */
    workspaceId?: string | null
    cursor?: string | null
    limit?: number
}

/**
 * Arguments for searching projects.
 */
export type SearchProjectsArgs = SearchArgs

/**
 * Response from retrieving projects.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/get_projects_api_v1_projects_get
 */
export type GetProjectsResponse = {
    results: (PersonalProject | WorkspaceProject)[]
    nextCursor: string | null
}

/**
 * Arguments for retrieving archived projects.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/get_archived_projects_api_v1_projects_archived_get
 */
export type GetArchivedProjectsArgs = {
    cursor?: string | null
    limit?: number
}

/**
 * Response from retrieving archived projects.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/get_archived_projects_api_v1_projects_archived_get
 */
export type GetArchivedProjectsResponse = {
    results: (PersonalProject | WorkspaceProject)[]
    nextCursor: string | null
}

/**
 * Arguments for creating a new project.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/create_project_api_v1_projects_post
 */
export type AddProjectArgs = {
    name: string
    parentId?: string
    color?: ColorKey
    isFavorite?: boolean
    viewStyle?: ProjectViewStyle
    workspaceId?: string
}

/**
 * Arguments for updating a project.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/update_project_api_v1_projects__project_id__post
 */
export type UpdateProjectArgs = {
    name?: string
    color?: ColorKey
    isFavorite?: boolean
    viewStyle?: ProjectViewStyle
    /**
     * Folder to move the project into. Only supported for workspace projects.
     * Pass `null` to clear the value. Omit this field to keep it unchanged.
     */
    folderId?: string | null
}

/**
 * Arguments for retrieving project collaborators.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/get_project_collaborators_api_v1_projects__project_id__collaborators_get
 */
export type GetProjectCollaboratorsArgs = {
    cursor?: string | null
    limit?: number
}

/**
 * Response from retrieving project collaborators.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/get_project_collaborators_api_v1_projects__project_id__collaborators_get
 */
export type GetProjectCollaboratorsResponse = {
    results: User[]
    nextCursor: string | null
}

/**
 * Arguments for moving a project to a workspace.
 */
export type MoveProjectToWorkspaceArgs = {
    /** The ID of the project to move. */
    projectId: string
    /** The target workspace ID. */
    workspaceId: string
    /** Optional target folder ID within the workspace. */
    folderId?: string | null
    /** Optional access settings for the project in the workspace. */
    access?: {
        visibility: ProjectVisibility
    }
}

/**
 * Arguments for moving a project to personal.
 */
export type MoveProjectToPersonalArgs = {
    /** The ID of the project to move. */
    projectId: string
}

/**
 * Arguments for counting archived projects.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/count_projects_archived_api_v1_projects_archived_count_get
 */
export type GetArchivedProjectsCountArgs = {
    workspaceId?: string | null
    joined?: boolean | null
}

/**
 * Response from counting archived projects.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/count_projects_archived_api_v1_projects_archived_count_get
 */
export type GetArchivedProjectsCountResponse = {
    count: number
}

/**
 * An action permitted for a role.
 */
export type ActionView = {
    name: string
}

/**
 * A project collaborator role with its permitted actions.
 */
export type ProjectRoleView = {
    name: CollaboratorRole
    actions: ActionView[]
}

/**
 * A workspace role with its permitted actions.
 */
export type WorkspaceRoleView = {
    name: WorkspaceRole
    actions: ActionView[]
}

/**
 * Response from getting project permissions (role-to-action mappings).
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/permissions_api_v1_projects_permissions_get
 */
export type GetProjectPermissionsResponse = {
    projectCollaboratorActions: ProjectRoleView[]
    workspaceCollaboratorActions: WorkspaceRoleView[]
}

/**
 * Arguments for getting full project data.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/projects_full_data_api_v1_projects__project_id__full_get
 */
export type GetFullProjectArgs = {
    /**
     * Required to access the public project without authentication.
     */
    publicKey?: string | null
}

/**
 * Response from getting full project data.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/projects_full_data_api_v1_projects__project_id__full_get
 */
export type GetFullProjectResponse = {
    project: (PersonalProject | WorkspaceProject) | null
    commentsCount: number
    tasks: Task[]
    sections: Section[]
    collaborators: User[]
    notes: Comment[]
}

/**
 * Response from joining a workspace project.
 *
 * Only used for workspaces — this endpoint is used to join a workspace project
 * by a workspace user.
 *
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/join_project_api_v1_projects__project_id__join_post
 */
export type JoinProjectResponse = {
    project: WorkspaceProject
    tasks: Task[]
    sections: Section[]
    comments: Note[]
    collaborators: Collaborator[]
    collaboratorStates: CollaboratorState[]
    folder: Folder | null
    subprojects: WorkspaceProject[]
}
