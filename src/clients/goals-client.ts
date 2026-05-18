import {
    ENDPOINT_REST_GOALS,
    ENDPOINT_REST_GOALS_SEARCH,
    GOAL_COMPLETE,
    GOAL_TASKS,
    GOAL_UNCOMPLETE,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddGoalArgs,
    GetGoalsArgs,
    GetGoalsResponse,
    Goal,
    SearchGoalsArgs,
    TaskLinkingArgs,
    UpdateGoalArgs,
} from '../types/goals'
import { generatePath } from '../utils/request-helpers'
import { IdSchema, validateGoal, validateGoalArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all goal-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public goal method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class GoalsClient extends BaseClient {
    async getGoals(args?: GetGoalsArgs): Promise<GetGoalsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetGoalsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_GOALS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return {
            results: validateGoalArray(results),
            nextCursor,
        }
    }

    async searchGoals(args: SearchGoalsArgs): Promise<GetGoalsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetGoalsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_GOALS_SEARCH,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return {
            results: validateGoalArray(results),
            nextCursor,
        }
    }

    async getGoal(id: string): Promise<Goal> {
        IdSchema.parse(id)
        const response = await request<Goal>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validateGoal(response.data)
    }

    async addGoal(args: AddGoalArgs, requestId?: string): Promise<Goal> {
        const response = await request<Goal>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_GOALS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateGoal(response.data)
    }

    async updateGoal(id: string, args: UpdateGoalArgs, requestId?: string): Promise<Goal> {
        IdSchema.parse(id)
        const response = await request<Goal>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateGoal(response.data)
    }

    async deleteGoal(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async completeGoal(id: string, requestId?: string): Promise<Goal> {
        IdSchema.parse(id)
        const response = await request<Goal>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, id, GOAL_COMPLETE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateGoal(response.data)
    }

    async uncompleteGoal(id: string, requestId?: string): Promise<Goal> {
        IdSchema.parse(id)
        const response = await request<Goal>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, id, GOAL_UNCOMPLETE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateGoal(response.data)
    }

    async linkTaskToGoal({ goalId, taskId }: TaskLinkingArgs, requestId?: string): Promise<Goal> {
        IdSchema.parse(goalId)
        IdSchema.parse(taskId)
        const response = await request<Goal>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, goalId, GOAL_TASKS),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: { itemId: taskId },
            requestId: requestId,
        })
        return validateGoal(response.data)
    }

    async unlinkTaskFromGoal(
        { goalId, taskId }: TaskLinkingArgs,
        requestId?: string,
    ): Promise<boolean> {
        IdSchema.parse(goalId)
        IdSchema.parse(taskId)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_GOALS, goalId, GOAL_TASKS, taskId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }
}
