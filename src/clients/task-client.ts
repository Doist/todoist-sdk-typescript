import { v4 as uuidv4 } from 'uuid'
import {
    ENDPOINT_REST_TASKS,
    ENDPOINT_REST_TASKS_COMPLETED,
    ENDPOINT_REST_TASKS_COMPLETED_BY_COMPLETION_DATE,
    ENDPOINT_REST_TASKS_COMPLETED_BY_DUE_DATE,
    ENDPOINT_REST_TASKS_COMPLETED_SEARCH,
    ENDPOINT_REST_TASKS_FILTER,
    ENDPOINT_REST_TASK_CLOSE,
    ENDPOINT_REST_TASK_MOVE,
    ENDPOINT_REST_TASK_REOPEN,
    ENDPOINT_SYNC_QUICK_ADD,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import { performSyncRequest } from '../transport/sync-request'
import { TodoistRequestError } from '../types'
import type { SyncCommand, SyncRequest } from '../types/sync'
import type {
    AddTaskArgs,
    GetAllCompletedTasksArgs,
    GetAllCompletedTasksResponse,
    GetCompletedTasksByCompletionDateArgs,
    GetCompletedTasksByDueDateArgs,
    GetCompletedTasksResponse,
    GetTasksArgs,
    GetTasksByFilterArgs,
    GetTasksResponse,
    MoveTaskArgs,
    QuickAddTaskArgs,
    SearchCompletedTasksArgs,
    Task,
    UpdateTaskArgs,
} from '../types/tasks'
import { generatePath, spreadIfDefined } from '../utils/request-helpers'
import { processTaskContent } from '../utils/uncompletable-helpers'
import { IdSchema, validateTask, validateTaskArray } from '../utils/validators'
import { BaseClient } from './base-client'

const MAX_COMMAND_COUNT = 100

/**
 * Internal sub-client handling all task-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public task method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class TaskClient extends BaseClient {
    async getTask(id: string): Promise<Task> {
        IdSchema.parse(id)
        const response = await request<Task>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TASKS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateTask(response.data)
    }

    async getTasks(args: GetTasksArgs = {}): Promise<GetTasksResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetTasksResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateTaskArray(results),
            nextCursor,
        }
    }

    async getTasksByFilter(args: GetTasksByFilterArgs): Promise<GetTasksResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetTasksResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS_FILTER,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateTaskArray(results),
            nextCursor,
        }
    }

    async getCompletedTasksByCompletionDate(
        args: GetCompletedTasksByCompletionDateArgs,
    ): Promise<GetCompletedTasksResponse> {
        const {
            data: { items, nextCursor },
        } = await request<GetCompletedTasksResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS_COMPLETED_BY_COMPLETION_DATE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            items: validateTaskArray(items),
            nextCursor,
        }
    }

    async getCompletedTasksByDueDate(
        args: GetCompletedTasksByDueDateArgs,
    ): Promise<GetCompletedTasksResponse> {
        const {
            data: { items, nextCursor },
        } = await request<GetCompletedTasksResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS_COMPLETED_BY_DUE_DATE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            items: validateTaskArray(items),
            nextCursor,
        }
    }

    async searchCompletedTasks(args: SearchCompletedTasksArgs): Promise<GetCompletedTasksResponse> {
        const {
            data: { items, nextCursor },
        } = await request<GetCompletedTasksResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS_COMPLETED_SEARCH,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            items: validateTaskArray(items),
            nextCursor,
        }
    }

    async getAllCompletedTasks(
        args: GetAllCompletedTasksArgs = {},
    ): Promise<GetAllCompletedTasksResponse> {
        const { since, until, ...rest } = args
        const { data } = await request<Record<string, unknown>>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS_COMPLETED,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                ...rest,
                ...(since ? { since: since.toISOString() } : {}),
                ...(until ? { until: until.toISOString() } : {}),
            },
        })
        return {
            projects: data.projects as Record<string, Record<string, unknown>>,
            sections: data.sections as Record<string, Record<string, unknown>>,
            items: validateTaskArray(data.items as unknown[]),
        }
    }

    async addTask(args: AddTaskArgs, requestId?: string): Promise<Task> {
        // Process content based on isUncompletable flag
        const processedArgs = {
            ...args,
            content: processTaskContent(args.content, args.isUncompletable),
        }

        const response = await request<Task>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TASKS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: processedArgs,
            requestId: requestId,
        })

        return validateTask(response.data)
    }

    async quickAddTask(args: QuickAddTaskArgs): Promise<Task> {
        // Process text based on isUncompletable flag
        const processedArgs = {
            ...args,
            text: processTaskContent(args.text, args.isUncompletable),
        }

        const response = await request<Task>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_SYNC_QUICK_ADD,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: processedArgs,
        })

        return validateTask(response.data)
    }

    async updateTask(id: string, args: UpdateTaskArgs, requestId?: string): Promise<Task> {
        IdSchema.parse(id)

        // Translate SDK alias for due-date clearing to Todoist's accepted payload value.
        const normalizedArgs = args.dueString === null ? { ...args, dueString: 'no date' } : args

        // Process content if both content and isUncompletable are provided
        const processedArgs =
            normalizedArgs.content && normalizedArgs.isUncompletable !== undefined
                ? {
                      ...normalizedArgs,
                      content: processTaskContent(
                          normalizedArgs.content,
                          normalizedArgs.isUncompletable,
                      ),
                  }
                : normalizedArgs

        // Remap `order` → `childOrder` so snakeCaseKeys() produces `child_order`
        const { order, ...argsWithoutOrder } = processedArgs
        const remappedArgs =
            order !== undefined ? { ...argsWithoutOrder, childOrder: order } : argsWithoutOrder

        const response = await request<Task>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TASKS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: remappedArgs,
            requestId: requestId,
        })

        return validateTask(response.data)
    }

    async moveTasks(ids: string[], args: MoveTaskArgs, requestId?: string): Promise<Task[]> {
        if (ids.length > MAX_COMMAND_COUNT) {
            throw new TodoistRequestError(`Maximum number of items is ${MAX_COMMAND_COUNT}`, 400)
        }
        const commands: SyncCommand[] = ids.map((id) => ({
            type: 'item_move',
            uuid: uuidv4(),
            args: {
                id,
                ...spreadIfDefined(args.projectId, (v) => ({ projectId: v })),
                ...spreadIfDefined(args.sectionId, (v) => ({ sectionId: v })),
                ...spreadIfDefined(args.parentId, (v) => ({ parentId: v })),
            },
        }))

        const syncRequest: SyncRequest = {
            commands,
            resourceTypes: ['items'],
        }

        const syncResponse = await performSyncRequest(this.syncContext, syncRequest, {
            requestId,
            hasSyncCommands: true,
        })

        if (!syncResponse.items?.length) {
            throw new TodoistRequestError('Tasks not found', 404)
        }

        const syncTasks = syncResponse.items.filter((task) => ids.includes(task.id))
        if (!syncTasks.length) {
            throw new TodoistRequestError('Tasks not found', 404)
        }

        return validateTaskArray(syncTasks)
    }

    async moveTask(id: string, args: MoveTaskArgs, requestId?: string): Promise<Task> {
        IdSchema.parse(id)
        const response = await request<Task>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TASKS, id, ENDPOINT_REST_TASK_MOVE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                ...spreadIfDefined(args.projectId, (v) => ({ project_id: v })),
                ...spreadIfDefined(args.sectionId, (v) => ({ section_id: v })),
                ...spreadIfDefined(args.parentId, (v) => ({ parent_id: v })),
            },
            requestId: requestId,
        })

        return validateTask(response.data)
    }

    async closeTask(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TASKS, id, ENDPOINT_REST_TASK_CLOSE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async reopenTask(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TASKS, id, ENDPOINT_REST_TASK_REOPEN),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async deleteTask(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TASKS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }
}
