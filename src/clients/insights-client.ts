import {
    getProjectInsightsActivityStatsEndpoint,
    getProjectInsightsHealthAnalyzeEndpoint,
    getProjectInsightsHealthContextEndpoint,
    getProjectInsightsHealthEndpoint,
    getProjectInsightsProgressEndpoint,
    getWorkspaceInsightsEndpoint,
} from '../consts/endpoints'
import { request } from '../transport/http-client'
import type {
    GetProjectActivityStatsArgs,
    GetWorkspaceInsightsArgs,
    ProjectActivityStats,
    ProjectHealth,
    ProjectHealthContext,
    ProjectProgress,
    WorkspaceInsights,
} from '../types/insights'
import {
    IdSchema,
    validateProjectActivityStats,
    validateProjectHealth,
    validateProjectHealthContext,
    validateProjectProgress,
    validateWorkspaceInsights,
} from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all insights-domain endpoints
 * (project activity stats, health, progress, workspace insights).
 *
 * Instantiated by `TodoistApi`; every public insights method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing
 * JSDoc.
 */
export class InsightsClient extends BaseClient {
    async getProjectActivityStats(
        projectId: string,
        args: GetProjectActivityStatsArgs = {},
    ): Promise<ProjectActivityStats> {
        IdSchema.parse(projectId)
        const response = await request<ProjectActivityStats>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getProjectInsightsActivityStatsEndpoint(projectId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: { objectType: 'ITEM', eventType: 'COMPLETED', ...args },
        })
        return validateProjectActivityStats(response.data)
    }

    async getProjectHealth(projectId: string): Promise<ProjectHealth> {
        IdSchema.parse(projectId)
        const response = await request<ProjectHealth>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getProjectInsightsHealthEndpoint(projectId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validateProjectHealth(response.data)
    }

    async getProjectHealthContext(projectId: string): Promise<ProjectHealthContext> {
        IdSchema.parse(projectId)
        const response = await request<ProjectHealthContext>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getProjectInsightsHealthContextEndpoint(projectId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validateProjectHealthContext(response.data)
    }

    async getProjectProgress(projectId: string): Promise<ProjectProgress> {
        IdSchema.parse(projectId)
        const response = await request<ProjectProgress>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getProjectInsightsProgressEndpoint(projectId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validateProjectProgress(response.data)
    }

    async getWorkspaceInsights(
        workspaceId: string,
        args: GetWorkspaceInsightsArgs = {},
    ): Promise<WorkspaceInsights> {
        IdSchema.parse(workspaceId)
        const response = await request<WorkspaceInsights>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceInsightsEndpoint(workspaceId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                ...args,
                ...(args.projectIds ? { projectIds: args.projectIds.join(',') } : {}),
            },
        })
        return validateWorkspaceInsights(response.data)
    }

    async analyzeProjectHealth(projectId: string, requestId?: string): Promise<ProjectHealth> {
        IdSchema.parse(projectId)
        const response = await request<ProjectHealth>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: getProjectInsightsHealthAnalyzeEndpoint(projectId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateProjectHealth(response.data)
    }
}
