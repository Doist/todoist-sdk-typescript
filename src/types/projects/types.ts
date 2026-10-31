import { z } from 'zod'
import { getProjectUrl } from '../../utils/url-helpers'

/**
 * Base schema for all project types in Todoist.
 * Contains common fields shared between personal and workspace projects.
 */
export const BaseProjectSchema = z.object({
    id: z.string(),
    canAssignTasks: z.boolean(),
    childOrder: z.number().int(),
    color: z.string(),
    createdAt: z.coerce.date().nullable(),
    isArchived: z.boolean(),
    isDeleted: z.boolean(),
    isFavorite: z.boolean(),
    isFrozen: z.boolean(),
    name: z.string(),
    updatedAt: z.coerce.date().nullable(),
    viewStyle: z.string(),
    defaultOrder: z.number().int(),
    description: z.string(),
    isCollapsed: z.boolean(),
    isShared: z.boolean(),
})

/**
 * Schema for personal projects in Todoist.
 */
export const PersonalProjectSchema = BaseProjectSchema.extend({
    parentId: z.string().nullable(),
    inboxProject: z.boolean().optional().default(false),
}).transform((data) => {
    return {
        ...data,
        url: getProjectUrl(data.id, data.name),
    }
})

/** Available project visibility levels. */
export const PROJECT_VISIBILITIES = ['restricted', 'team', 'public'] as const
/** Visibility level of a workspace project. */
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number]

export const ProjectVisibilitySchema = z.enum(PROJECT_VISIBILITIES)

/**
 * Schema for workspace projects in Todoist.
 */
export const WorkspaceProjectSchema = BaseProjectSchema.extend({
    access: z.object({ visibility: ProjectVisibilitySchema }).optional(),
    collaboratorRoleDefault: z.string(),
    folderId: z.string().nullable(),
    isInviteOnly: z.boolean().nullable(),
    isLinkSharingEnabled: z.boolean(),
    role: z.string().nullable(),
    status: z.string(),
    workspaceId: z.string(),
}).transform((data) => {
    return {
        ...data,
        url: getProjectUrl(data.id, data.name),
    }
})

/**
 * How many active personal projects the user's plan allows, and how many they have.
 * Returned by `TodoistApi.getPersonalProjectCapacity`.
 */
export type PersonalProjectCapacity = {
    /** The current plan's limit on active personal projects. */
    maxProjects: number
    /** Active personal projects that count towards the limit. */
    activeCount: number
    /** How many more active personal projects the user can add; never negative. */
    remaining: number
}

/**
 * Represents a personal project in Todoist.
 * @see https://developer.todoist.com/api/v1/#tag/Projects
 */
export type PersonalProject = z.infer<typeof PersonalProjectSchema>

/**
 * Represents a workspace project in Todoist.
 * @see https://developer.todoist.com/api/v1/#tag/Projects
 */
export type WorkspaceProject = z.infer<typeof WorkspaceProjectSchema>

/**
 * Schema for any project type in Todoist (personal or workspace).
 * Dispatches to WorkspaceProjectSchema when workspaceId is present, PersonalProjectSchema otherwise.
 */
export const ProjectSchema = z.unknown().transform((val) => {
    if (typeof val === 'object' && val !== null && 'workspaceId' in val) {
        return WorkspaceProjectSchema.parse(val)
    }
    return PersonalProjectSchema.parse(val)
})

/** A project in Todoist — either a {@link PersonalProject} or a {@link WorkspaceProject}. */
export type Project = z.infer<typeof ProjectSchema>

/** Available project view styles. */
export const PROJECT_VIEW_STYLES = ['list', 'board', 'calendar'] as const
/**
 * View style for a project.
 * @see https://developer.todoist.com/api/v1/#tag/Projects
 */
export type ProjectViewStyle = (typeof PROJECT_VIEW_STYLES)[number]
