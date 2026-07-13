import type { RequireAllOrNone, RequireOneOrNone, RequireExactlyOne } from 'type-fest'
import type { Duration, Task } from './types'

/**
 * Arguments for creating a new task.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/create_task_api_v1_tasks_post
 */
export type AddTaskArgs = {
    content: string
    description?: string
    projectId?: string
    sectionId?: string
    parentId?: string
    order?: number
    labels?: string[]
    priority?: number
    assigneeId?: string
    dueString?: string
    dueLang?: string
    deadlineLang?: string
    deadlineDate?: string
    isUncompletable?: boolean
} & RequireOneOrNone<{
    dueDate?: string
    dueDatetime?: string
}> &
    RequireAllOrNone<{
        duration?: Duration['amount']
        durationUnit?: Duration['unit']
    }>

/**
 * Arguments for retrieving tasks.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_tasks_api_v1_tasks_get
 */
export type GetTasksArgs = {
    projectId?: string
    sectionId?: string
    parentId?: string
    label?: string
    ids?: string[]
    cursor?: string | null
    limit?: number
}

/**
 * Arguments for retrieving tasks by filter.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_tasks_by_filter_api_v1_tasks_filter_get
 */
export type GetTasksByFilterArgs = {
    query: string
    lang?: string
    cursor?: string | null
    limit?: number
}

/**
 * Arguments for retrieving completed tasks by completion date.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/tasks_completed_by_completion_date_api_v1_tasks_completed_by_completion_date_get
 */
export type GetCompletedTasksByCompletionDateArgs = {
    since: string
    until: string
    workspaceId?: string | null
    projectId?: string | null
    sectionId?: string | null
    parentId?: string | null
    filterQuery?: string | null
    filterLang?: string | null
    cursor?: string | null
    limit?: number
    publicKey?: string | null
}

/**
 * Arguments for retrieving completed tasks by due date.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/tasks_completed_by_due_date_api_v1_tasks_completed_by_due_date_get
 */
export type GetCompletedTasksByDueDateArgs = {
    since: string
    until: string
    workspaceId?: string | null
    projectId?: string | null
    sectionId?: string | null
    parentId?: string | null
    filterQuery?: string | null
    filterLang?: string | null
    cursor?: string | null
    limit?: number
}

/**
 * Arguments for searching completed tasks.
 */
export type SearchCompletedTasksArgs = {
    query: string
    cursor?: string | null
    limit?: number
}

/**
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_tasks_api_v1_tasks_get
 */
export type GetTasksResponse = {
    results: Task[]
    nextCursor: string | null
}

/**
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/tasks_completed_by_due_date_api_v1_tasks_completed_by_due_date_get
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/tasks_completed_by_completion_date_api_v1_tasks_completed_by_completion_date_get
 */
export type GetCompletedTasksResponse = {
    items: Task[]
    nextCursor: string | null
}

/**
 * Arguments for updating a task.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/update_task_api_v1_tasks__task_id__post
 */
export type UpdateTaskArgs = {
    content?: string
    description?: string
    labels?: string[]
    priority?: number
    /**
     * Sort order of the task within its parent/project.
     * Internally mapped to `child_order` in the API payload.
     */
    order?: number
    /**
     * Natural language due date.
     * Use `"no date"` to clear a due date, or `null` as an SDK alias for the same behavior.
     */
    dueString?: (string & {}) | 'no date' | null
    dueLang?: string | null
    assigneeId?: string | null
    /**
     * Deadline date in `YYYY-MM-DD` format.
     * Use `null` to clear a task deadline.
     */
    deadlineDate?: string | null
    deadlineLang?: string | null
    isUncompletable?: boolean
} & RequireOneOrNone<{
    dueDate?: string
    dueDatetime?: string
}> &
    RequireAllOrNone<{
        duration?: Duration['amount']
        durationUnit?: Duration['unit']
    }>

/**
 * Arguments for quick adding a task.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/quick_add_api_v1_tasks_quick_post
 */
export type QuickAddTaskArgs = {
    text: string
    note?: string
    reminder?: string
    autoReminder?: boolean
    meta?: boolean
    isUncompletable?: boolean
}

/**
 * Response from quick adding a task.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/quick_add_api_v1_tasks_quick_post
 */

/**
 * Arguments for moving a task.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/move_task_api_v1_tasks__task_id__move_post
 */
export type MoveTaskArgs = RequireExactlyOne<{
    projectId?: string
    sectionId?: string
    parentId?: string
}>

/**
 * Arguments for getting all completed tasks.
 * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_all_completed_items_api_v1_tasks_completed_get
 */
export type GetAllCompletedTasksArgs = {
    /** Filter by project ID. */
    projectId?: string | null
    /** Filter by label name. */
    label?: string | null
    /** Number of results to return (max 200, default 30). */
    limit?: number
    /** Number of results to skip (default 0). */
    offset?: number
    /** Return items completed after this date. */
    since?: Date | null
    /** Return items completed before this date. */
    until?: Date | null
    /** Include comment data in the response. */
    annotateNotes?: boolean
    /** Include task data in the response. */
    annotateItems?: boolean
}

/**
 * Response from getting all completed tasks.
 */
export type GetAllCompletedTasksResponse = {
    projects: Record<string, Record<string, unknown>>
    sections: Record<string, Record<string, unknown>>
    items: Task[]
}
