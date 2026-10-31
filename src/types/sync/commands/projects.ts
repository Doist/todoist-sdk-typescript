import type { ColorKey } from '../../../utils/colors'
import type { ProjectViewStyle, ProjectVisibility } from '../../projects/types'
import type { WorkspaceRole, CollaboratorRole } from '../../workspaces/types'
import type { ProjectStatus } from './shared'

export type ProjectAccessConfig = {
    visibility: ProjectVisibility
    configuration?: {
        hideCollaboratorDetails?: boolean
        disableDuplication?: boolean
    } | null
}

export type ProjectAddArgs = {
    name: string
    parentId?: string | null
    workspaceId?: string
    folderId?: string | null
    childOrder?: number
    orderKey?: string
    defaultOrder?: number
    color?: ColorKey
    description?: string
    isFavorite?: boolean
    isInviteOnly?: boolean
    isLinkSharingEnabled?: boolean
    viewStyle?: ProjectViewStyle
    status?: ProjectStatus
    collaboratorRoleDefault?: CollaboratorRole
    access?: ProjectAccessConfig
}

export type ProjectUpdateArgs = {
    id: string
    folderId?: string | null
    orderKey?: string
    defaultOrderKey?: string
    name?: string
    color?: ColorKey
    description?: string
    isFavorite?: boolean
    isCollapsed?: boolean
    isInviteOnly?: boolean
    isLinkSharingEnabled?: boolean
    isProjectInsightsEnabled?: boolean
    viewStyle?: ProjectViewStyle
    status?: ProjectStatus
    collaboratorRoleDefault?: CollaboratorRole
    access?: ProjectAccessConfig
}

export type ProjectMoveArgs = {
    id: string
    parentId?: string | null
}

/**
 * @deprecated Set `orderKey` via `project_update` instead.
 */
export type ProjectReorderArgs = {
    projects: Array<{ id: string; childOrder: number }>
}

export type ShareProjectArgs =
    | {
          projectId: string
          email: string
          message?: string
          workspaceRole?: WorkspaceRole
      }
    | {
          projectId: string
          groupId: string
          message?: string
          workspaceRole?: WorkspaceRole
      }

export type ProjectLeaveArgs = {
    projectId: string
}

export type ProjectArchiveArgs = {
    id: string
}

export type ProjectUnarchiveArgs = {
    id: string
}

export type ProjectDeleteArgs = {
    id: string
}

export type ProjectMoveToWorkspaceArgs = {
    projectId: string
    workspaceId: string
    isInviteOnly?: boolean
    publicAccess?: boolean
    access?: ProjectAccessConfig
    folderId?: string | null
    useLro?: boolean
}

export type ProjectMoveToPersonalArgs = {
    projectId: string
    useLro?: boolean
}
