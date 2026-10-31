import type { WorkspaceRole } from '../../workspaces/types'
import type { DefaultAccessLevel, WorkspaceProjectSortOrder } from './shared'

export type SyncWorkspaceProperties = {
    organizationSize?: string
    defaultAccessLevel?: DefaultAccessLevel
    teamAcquisitionCohort?: string
    acquisitionSource?: string
    industry?: string
    department?: string
    creatorRole?: string
    desktopWorkspaceModal?: string | null
    hdyhau?: string
    acquisitionLoopLastShow?: string | null
}

export type DefaultCollaborators = {
    predefinedGroupIds?: string[]
    userIds?: string[]
} | null

export type WorkspaceAddArgs = {
    name: string
    description?: string
    isLinkSharingEnabled?: boolean
    isGuestAllowed?: boolean | null
    domainName?: string
    domainDiscovery?: boolean
    restrictEmailDomains?: boolean
    properties?: SyncWorkspaceProperties
    defaultCollaborators?: DefaultCollaborators
}

export type WorkspaceUpdateArgs = {
    id: string
    name?: string
    description?: string
    isCollapsed?: boolean
    isLinkSharingEnabled?: boolean
    isGuestAllowed?: boolean | null
    inviteCode?: string
    domainName?: string
    domainDiscovery?: boolean
    restrictEmailDomains?: boolean
    properties?: SyncWorkspaceProperties
    defaultCollaborators?: DefaultCollaborators
}

export type WorkspaceDeleteArgs = {
    id: string
}

export type WorkspaceUpdateUserArgs = {
    workspaceId: string
    userEmail: string
    role: WorkspaceRole
}

export type WorkspaceDeleteUserArgs = {
    workspaceId: string
    userEmail: string
}

export type WorkspaceLeaveArgs = {
    id: string
}

export type WorkspaceInviteArgs = {
    id: string
    emailList: string[]
    role?: WorkspaceRole
}

/**
 * @deprecated Set `defaultOrderKey` via `project_update` and `folder_update` instead.
 */
export type WorkspaceSetDefaultOrderArgs = {
    projects: Array<{ id: string; defaultOrder: number; folderId?: string | null }>
    folders: Array<{ id: string; defaultOrder: number }>
    workspaceId: string
}

export type WorkspaceUpdateUserProjectSortPreferenceArgs = {
    workspaceId: string
    projectSortPreference: WorkspaceProjectSortOrder
}
