import {
    ENDPOINT_REST_WORKSPACES,
    ENDPOINT_WORKSPACE_INVITATIONS,
    ENDPOINT_WORKSPACE_INVITATIONS_ALL,
    ENDPOINT_WORKSPACE_INVITATIONS_DELETE,
    ENDPOINT_WORKSPACE_JOIN,
    ENDPOINT_WORKSPACE_LOGO,
    ENDPOINT_WORKSPACE_MEMBERS,
    ENDPOINT_WORKSPACE_PLAN_DETAILS,
    ENDPOINT_WORKSPACE_USERS,
    getWorkspaceActiveProjectsEndpoint,
    getWorkspaceArchivedProjectsEndpoint,
    getWorkspaceInvitationAcceptEndpoint,
    getWorkspaceInvitationRejectEndpoint,
    getWorkspaceInviteUsersEndpoint,
    getWorkspaceUserEndpoint,
    getWorkspaceUserTasksEndpoint,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type { GetProjectsResponse } from '../types/projects'
import type {
    AddWorkspaceArgs,
    AllWorkspaceInvitationsResponse,
    DeleteWorkspaceInvitationArgs,
    GetWorkspaceMembersActivityArgs,
    GetWorkspaceMembersActivityResponse,
    GetWorkspaceProjectsArgs,
    GetWorkspaceUserTasksArgs,
    GetWorkspaceUserTasksResponse,
    GetWorkspaceUsersArgs,
    GetWorkspaceUsersResponse,
    InviteWorkspaceUsersArgs,
    InviteWorkspaceUsersResponse,
    JoinWorkspaceArgs,
    JoinWorkspaceResult,
    RemoveWorkspaceUserArgs,
    UpdateWorkspaceArgs,
    UpdateWorkspaceUserArgs,
    Workspace,
    WorkspaceInvitation,
    WorkspaceInvitationActionArgs,
    WorkspaceInvitationsResponse,
    WorkspaceLogoArgs,
    WorkspaceLogoResponse,
    WorkspacePlanDetails,
    WorkspaceUser,
} from '../types/workspaces'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { generatePath } from '../utils/request-helpers'
import {
    IdSchema,
    validateJoinWorkspaceResult,
    validateMemberActivityInfoArray,
    validateProject,
    validateWorkspace,
    validateWorkspaceArray,
    validateWorkspaceInvitation,
    validateWorkspaceInvitationArray,
    validateWorkspacePlanDetails,
    validateWorkspaceUserArray,
    validateWorkspaceUserTaskArray,
} from '../utils/validators'
import { BaseClient } from './base-client'

type GetAllWorkspaceInvitationsArgs = { workspaceId?: string }

/**
 * Internal sub-client handling all workspace-domain endpoints —
 * workspaces, invitations, users, plans, logos, and workspace project
 * pagination.
 *
 * Instantiated by `TodoistApi`; every public workspace method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing
 * JSDoc.
 */
export class WorkspaceClient extends BaseClient {
    async getWorkspaceInvitations(
        args: { workspaceId: string },
        requestId?: string,
    ): Promise<WorkspaceInvitationsResponse> {
        const response = await request<WorkspaceInvitationsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_INVITATIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: { workspace_id: args.workspaceId },
            requestId: requestId,
        })

        return response.data
    }

    async getAllWorkspaceInvitations(
        args: GetAllWorkspaceInvitationsArgs = {},
        requestId?: string,
    ): Promise<AllWorkspaceInvitationsResponse> {
        const queryParams: Record<string, string> = {}
        if (args.workspaceId) {
            queryParams.workspace_id = args.workspaceId
        }

        const response = await request<AllWorkspaceInvitationsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_INVITATIONS_ALL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: queryParams,
            requestId: requestId,
        })

        return validateWorkspaceInvitationArray(response.data)
    }

    async deleteWorkspaceInvitation(
        args: DeleteWorkspaceInvitationArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitation> {
        const response = await request<WorkspaceInvitation>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_INVITATIONS_DELETE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                workspace_id: args.workspaceId,
                user_email: args.userEmail,
            },
            requestId: requestId,
        })

        return validateWorkspaceInvitation(response.data)
    }

    async acceptWorkspaceInvitation(
        args: WorkspaceInvitationActionArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitation> {
        const response = await request<WorkspaceInvitation>({
            httpMethod: 'PUT',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceInvitationAcceptEndpoint(args.inviteCode),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })

        return validateWorkspaceInvitation(response.data)
    }

    async rejectWorkspaceInvitation(
        args: WorkspaceInvitationActionArgs,
        requestId?: string,
    ): Promise<WorkspaceInvitation> {
        const response = await request<WorkspaceInvitation>({
            httpMethod: 'PUT',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceInvitationRejectEndpoint(args.inviteCode),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })

        return validateWorkspaceInvitation(response.data)
    }

    async joinWorkspace(args: JoinWorkspaceArgs, requestId?: string): Promise<JoinWorkspaceResult> {
        const response = await request<JoinWorkspaceResult>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_JOIN,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                invite_code: args.inviteCode,
                workspace_id: args.workspaceId,
            },
            requestId: requestId,
        })

        return validateJoinWorkspaceResult(response.data)
    }

    async uploadWorkspaceLogo(
        args: WorkspaceLogoArgs,
        requestId?: string,
    ): Promise<WorkspaceLogoResponse> {
        if (args.delete) {
            // Delete logo
            const data = await uploadMultipartFile<WorkspaceLogoResponse>({
                baseUrl: this.syncApiBase,
                authToken: this.authToken,
                endpoint: ENDPOINT_WORKSPACE_LOGO,
                file: Buffer.alloc(0), // Empty buffer for delete
                fileName: 'delete',
                additionalFields: {
                    workspace_id: args.workspaceId,
                    delete: true,
                },
                requestId: requestId,
                customFetch: this.customFetch,
            })
            return data
        }

        if (!args.file) {
            throw new Error('file is required when not deleting logo')
        }

        // Validate buffer is not empty if it's a Buffer
        if (Buffer.isBuffer(args.file) && args.file.length === 0) {
            throw new Error('Cannot upload empty image file')
        }

        const additionalFields: Record<string, string | number | boolean> = {
            workspace_id: args.workspaceId,
        }

        const data = await uploadMultipartFile<WorkspaceLogoResponse>({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_WORKSPACE_LOGO,
            file: args.file,
            fileName: args.fileName,
            additionalFields: additionalFields,
            requestId: requestId,
            customFetch: this.customFetch,
        })

        return data
    }

    async getWorkspacePlanDetails(
        args: { workspaceId: string },
        requestId?: string,
    ): Promise<WorkspacePlanDetails> {
        const response = await request<WorkspacePlanDetails>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_PLAN_DETAILS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: { workspace_id: args.workspaceId },
            requestId: requestId,
        })

        return validateWorkspacePlanDetails(response.data)
    }

    async getWorkspaceUsers(
        args: GetWorkspaceUsersArgs = {},
        requestId?: string,
    ): Promise<GetWorkspaceUsersResponse> {
        const queryParams: Record<string, string | number> = {}
        if (args.workspaceId !== undefined && args.workspaceId !== null) {
            queryParams.workspace_id = args.workspaceId
        }
        if (args.cursor) {
            queryParams.cursor = args.cursor
        }
        if (args.limit) {
            queryParams.limit = args.limit
        }

        const response = await request<{
            hasMore: boolean
            nextCursor?: string
            workspaceUsers: WorkspaceUser[]
        }>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_USERS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: queryParams,
            requestId: requestId,
        })

        return {
            hasMore: response.data.hasMore || false,
            nextCursor: response.data.nextCursor,
            workspaceUsers: validateWorkspaceUserArray(response.data.workspaceUsers || []),
        }
    }

    async getWorkspaces(requestId?: string): Promise<Workspace[]> {
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_WORKSPACES,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateWorkspaceArray(response.data)
    }

    async getWorkspace(id: string, requestId?: string): Promise<Workspace> {
        IdSchema.parse(id)
        const response = await request<Workspace>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_WORKSPACES, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateWorkspace(response.data)
    }

    async addWorkspace(args: AddWorkspaceArgs, requestId?: string): Promise<Workspace> {
        const response = await request<Workspace>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_WORKSPACES,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateWorkspace(response.data)
    }

    async updateWorkspace(
        id: string,
        args: UpdateWorkspaceArgs,
        requestId?: string,
    ): Promise<Workspace> {
        IdSchema.parse(id)
        const response = await request<Workspace>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_WORKSPACES, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateWorkspace(response.data)
    }

    async deleteWorkspace(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_WORKSPACES, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async getWorkspaceMembersActivity(
        args: GetWorkspaceMembersActivityArgs,
        requestId?: string,
    ): Promise<GetWorkspaceMembersActivityResponse> {
        const { workspaceId, ...queryParams } = args
        const { data } = await request<{ members: unknown[] }>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_MEMBERS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: { workspaceId, ...queryParams },
            requestId: requestId,
        })
        return {
            members: validateMemberActivityInfoArray(data.members),
        }
    }

    async getWorkspaceUserTasks(
        args: GetWorkspaceUserTasksArgs,
        requestId?: string,
    ): Promise<GetWorkspaceUserTasksResponse> {
        const { workspaceId, userId, ...queryParams } = args
        const { data } = await request<{ tasks: unknown[] }>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceUserTasksEndpoint(workspaceId, userId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: queryParams,
            requestId: requestId,
        })
        return {
            tasks: validateWorkspaceUserTaskArray(data.tasks),
        }
    }

    async inviteWorkspaceUsers(
        args: InviteWorkspaceUsersArgs,
        requestId?: string,
    ): Promise<InviteWorkspaceUsersResponse> {
        const { workspaceId, ...payload } = args
        const { data } = await request<InviteWorkspaceUsersResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceInviteUsersEndpoint(workspaceId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: payload,
            requestId: requestId,
        })
        return data
    }

    async updateWorkspaceUser(
        args: UpdateWorkspaceUserArgs,
        requestId?: string,
    ): Promise<JoinWorkspaceResult> {
        const { workspaceId, userId, ...payload } = args
        const response = await request<JoinWorkspaceResult>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceUserEndpoint(workspaceId, userId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: payload,
            requestId: requestId,
        })
        return validateJoinWorkspaceResult(response.data)
    }

    async removeWorkspaceUser(args: RemoveWorkspaceUserArgs, requestId?: string): Promise<boolean> {
        const { workspaceId, userId } = args
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceUserEndpoint(workspaceId, userId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async getWorkspaceActiveProjects(
        args: GetWorkspaceProjectsArgs,
        requestId?: string,
    ): Promise<GetProjectsResponse> {
        const queryParams: Record<string, string | number> = {}
        if (args.cursor) {
            queryParams.cursor = args.cursor
        }
        if (args.limit) {
            queryParams.limit = args.limit
        }

        const response = await request<GetProjectsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceActiveProjectsEndpoint(args.workspaceId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: queryParams,
            requestId: requestId,
        })

        // oxlint-disable-next-line no-unsafe-assignment, no-unsafe-call, no-unsafe-member-access
        const validatedProjects = response.data.results?.map((project: unknown) =>
            validateProject(project),
        )

        return {
            // oxlint-disable-next-line no-unsafe-assignment
            ...response.data,
            // oxlint-disable-next-line no-unsafe-assignment
            results: validatedProjects || [],
        } as GetProjectsResponse
    }

    async getWorkspaceArchivedProjects(
        args: GetWorkspaceProjectsArgs,
        requestId?: string,
    ): Promise<GetProjectsResponse> {
        const queryParams: Record<string, string | number> = {}
        if (args.cursor) {
            queryParams.cursor = args.cursor
        }
        if (args.limit) {
            queryParams.limit = args.limit
        }

        const response = await request<GetProjectsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: getWorkspaceArchivedProjectsEndpoint(args.workspaceId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: queryParams,
            requestId: requestId,
        })

        // oxlint-disable-next-line no-unsafe-assignment, no-unsafe-call, no-unsafe-member-access
        const validatedProjects = response.data.results?.map((project: unknown) =>
            validateProject(project),
        )

        return {
            // oxlint-disable-next-line no-unsafe-assignment
            ...response.data,
            // oxlint-disable-next-line no-unsafe-assignment
            results: validatedProjects || [],
        } as GetProjectsResponse
    }
}
