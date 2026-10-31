import type { PersonalProject, WorkspaceProject } from '../types/projects/types'

/**
 * Type guard to check if a project is a workspace project.
 * @param project The project to check
 * @returns True if the project is a workspace project
 */
export function isWorkspaceProject(
    project: PersonalProject | WorkspaceProject,
): project is WorkspaceProject {
    return 'workspaceId' in project
}

/**
 * Type guard to check if a project is a personal project.
 * @param project The project to check
 * @returns True if the project is a personal project
 */
export function isPersonalProject(
    project: PersonalProject | WorkspaceProject,
): project is PersonalProject {
    return !isWorkspaceProject(project)
}

/**
 * Whether a project counts towards the plan's limit on active personal projects:
 * an active personal project other than the Inbox. Shared projects and sub-projects
 * count; workspace projects do not.
 * @param project The project to check
 * @returns True if the project counts towards the limit
 */
export function countsTowardsPersonalProjectLimit(
    project: PersonalProject | WorkspaceProject,
): boolean {
    return (
        isPersonalProject(project) &&
        !project.inboxProject &&
        !project.isArchived &&
        !project.isDeleted
    )
}
