import { LinkEnvironment } from '@doist/sdk-kmp/common'
import {
    parseTodoistLink,
    todoistFilterUrl,
    todoistLabelUrl,
    todoistProjectCommentsUrl,
    todoistProjectCommentUrl,
    todoistProjectUrl,
    todoistSectionUrl,
    todoistTaskCommentsUrl,
    todoistTaskCommentUrl,
    todoistTaskUrl,
    todoistWorkspaceFilterUrl,
    todoistWorkspaceUrl,
} from '@doist/sdk-kmp/todoist'

import { TODOIST_WEB_URI } from '../consts/endpoints'

/**
 * Formats a Date object to YYYY-MM-DD string format.
 *
 * @internal
 * @param date The Date object to format.
 * @returns The formatted date string in YYYY-MM-DD format.
 */
export function formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Builds a URL, falling back to a bare-id URL when the link builder rejects the
 * given id. These helpers are called while parsing API responses, so generating
 * a URL must never fail the parse.
 *
 * @param build Builds the URL.
 * @param fallbackPath The path to fall back to, relative to the Todoist web app.
 * @returns The built URL, or a bare-id URL if the id was rejected.
 */
function buildUrl(build: () => string, fallbackPath: string): string {
    try {
        return build()
    } catch {
        return `${TODOIST_WEB_URI}/${fallbackPath}`
    }
}

/**
 * Generate the URL for a given task.
 *
 * @param taskId The ID of the task.
 * @param content The content of the task.
 * @returns The URL string for the task view.
 */
export function getTaskUrl(taskId: string, content?: string): string {
    return buildUrl(
        () => todoistTaskUrl(taskId, content ?? '', LinkEnvironment.Production),
        `task/${taskId}`,
    )
}

/**
 * Generate the URL for a given project.
 *
 * @param projectId The ID of the project.
 * @param name The name of the project.
 * @returns The URL string for the project view.
 */
export function getProjectUrl(projectId: string, name?: string): string {
    return buildUrl(
        () => todoistProjectUrl(projectId, name ?? '', LinkEnvironment.Production),
        `project/${projectId}`,
    )
}

/**
 * Generate the URL for a given section.
 *
 * @param sectionId The ID of the section.
 * @param name The name of the section.
 * @returns The URL string for the section view.
 */
export function getSectionUrl(sectionId: string, name?: string): string {
    return buildUrl(
        () => todoistSectionUrl(sectionId, name ?? '', LinkEnvironment.Production),
        `section/${sectionId}`,
    )
}

/**
 * Generate the URL for a given label.
 *
 * @param labelId The ID of the label.
 * @param name The name of the label.
 * @returns The URL string for the label view.
 */
export function getLabelUrl(labelId: string, name?: string): string {
    return buildUrl(
        () => todoistLabelUrl(labelId, name ?? '', LinkEnvironment.Production),
        `label/${labelId}`,
    )
}

/**
 * Generate the URL for a given filter.
 *
 * @param filterId The ID of the filter.
 * @param name The name of the filter.
 * @returns The URL string for the filter view.
 */
export function getFilterUrl(filterId: string, name?: string): string {
    return buildUrl(
        () => todoistFilterUrl(filterId, name ?? '', LinkEnvironment.Production),
        `filter/${filterId}`,
    )
}

/**
 * Generate the URL for a filter belonging to a workspace.
 *
 * @param workspaceId The ID of the workspace the filter belongs to.
 * @param filterId The ID of the filter.
 * @param name The name of the filter.
 * @returns The URL string for the workspace filter view.
 */
export function getWorkspaceFilterUrl(
    workspaceId: string,
    filterId: string,
    name?: string,
): string {
    return buildUrl(
        () =>
            todoistWorkspaceFilterUrl(
                workspaceId,
                filterId,
                name ?? '',
                LinkEnvironment.Production,
            ),
        `${workspaceId}/filter/${filterId}`,
    )
}

/**
 * Generate the URL for a given workspace.
 *
 * @param workspaceId The ID of the workspace.
 * @returns The URL string for the workspace view.
 */
export function getWorkspaceUrl(workspaceId: string): string {
    return buildUrl(() => todoistWorkspaceUrl(workspaceId, LinkEnvironment.Production), workspaceId)
}

/**
 * Generate the URL for the comments on a given task.
 *
 * @param taskId The ID of the task.
 * @param content The content of the task.
 * @returns The URL string for the task's comments.
 */
export function getTaskCommentsUrl(taskId: string, content?: string): string {
    return buildUrl(
        () => todoistTaskCommentsUrl(taskId, content ?? '', LinkEnvironment.Production),
        `task/${taskId}/comments`,
    )
}

/**
 * Generate the URL for the comments on a given project.
 *
 * @param projectId The ID of the project.
 * @param name The name of the project.
 * @returns The URL string for the project's comments.
 */
export function getProjectCommentsUrl(projectId: string, name?: string): string {
    return buildUrl(
        () => todoistProjectCommentsUrl(projectId, name ?? '', LinkEnvironment.Production),
        `project/${projectId}/comments`,
    )
}

/**
 * Generate the URL for a single comment on a given task.
 *
 * @param taskId The ID of the task.
 * @param commentId The ID of the comment.
 * @param content The content of the task.
 * @returns The URL string for the comment.
 */
export function getTaskCommentUrl(taskId: string, commentId: string, content?: string): string {
    return buildUrl(
        () => todoistTaskCommentUrl(taskId, content ?? '', commentId, LinkEnvironment.Production),
        `task/${taskId}#comment-${commentId}`,
    )
}

/**
 * Generate the URL for a single comment on a given project.
 *
 * @param projectId The ID of the project.
 * @param commentId The ID of the comment.
 * @param name The name of the project.
 * @returns The URL string for the comment.
 */
export function getProjectCommentUrl(projectId: string, commentId: string, name?: string): string {
    return buildUrl(
        () =>
            todoistProjectCommentUrl(projectId, name ?? '', commentId, LinkEnvironment.Production),
        `project/${projectId}#comment-${commentId}`,
    )
}

/** The kinds of Todoist entity a URL can point at. */
export const TODOIST_LINK_TYPES = [
    'task',
    'project',
    'filter',
    'label',
    'section',
    'workspace',
] as const

/** The kind of Todoist entity a URL points at. */
export type TodoistLinkType = (typeof TODOIST_LINK_TYPES)[number]

/** The entity a Todoist URL points at. */
export type TodoistUrlInfo = {
    /** The kind of entity the URL points at. */
    type: TodoistLinkType
    /** The ID of the entity. */
    id: string
    /** The ID of the workspace the entity belongs to, when the URL names one. */
    workspaceId: string | null
    /** The ID of the comment the URL points at, when the URL names one. */
    commentId: string | null
}

/**
 * Checks whether a parsed link type is one this SDK knows about.
 *
 * @param value The link type name to check.
 * @returns Whether the value is a known link type.
 */
function isTodoistLinkType(value: string): value is TodoistLinkType {
    return (TODOIST_LINK_TYPES as readonly string[]).includes(value)
}

/**
 * Parse a Todoist URL into the entity it points at.
 *
 * @param url The URL to parse.
 * @returns The entity the URL points at, or `null` if it is not a Todoist URL.
 */
export function parseTodoistUrl(url: string): TodoistUrlInfo | null {
    const link = parseTodoistLink(url)
    if (!link) {
        return null
    }

    const type = link.type.name.toLowerCase()
    if (!isTodoistLinkType(type)) {
        return null
    }

    return {
        type,
        id: link.id,
        workspaceId: link.workspaceId ?? null,
        commentId: link.commentId ?? null,
    }
}
