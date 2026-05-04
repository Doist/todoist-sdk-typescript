import {
    ENDPOINT_REST_PROJECTS,
    ENDPOINT_REST_PROJECTS_ARCHIVED,
    ENDPOINT_REST_PROJECTS_ARCHIVED_COUNT,
    ENDPOINT_REST_PROJECTS_MOVE_TO_PERSONAL,
    ENDPOINT_REST_PROJECTS_MOVE_TO_WORKSPACE,
    ENDPOINT_REST_PROJECTS_PERMISSIONS,
    ENDPOINT_REST_PROJECTS_SEARCH,
    ENDPOINT_REST_PROJECT_COLLABORATORS,
    ENDPOINT_REST_PROJECT_FULL,
    ENDPOINT_REST_PROJECT_JOIN,
    PROJECT_ARCHIVE,
    PROJECT_UNARCHIVE,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddProjectArgs,
    GetArchivedProjectsArgs,
    GetArchivedProjectsCountArgs,
    GetArchivedProjectsCountResponse,
    GetArchivedProjectsResponse,
    GetFullProjectArgs,
    GetFullProjectResponse,
    GetProjectCollaboratorsArgs,
    GetProjectCollaboratorsResponse,
    GetProjectPermissionsResponse,
    GetProjectsArgs,
    GetProjectsResponse,
    JoinProjectResponse,
    MoveProjectToPersonalArgs,
    MoveProjectToWorkspaceArgs,
    PersonalProject,
    SearchProjectsArgs,
    UpdateProjectArgs,
    WorkspaceProject,
} from '../types/projects'
import { generatePath } from '../utils/request-helpers'
import {
    IdSchema,
    validateCollaboratorArray,
    validateCollaboratorStateArray,
    validateCommentArray,
    validateFolder,
    validateNoteArray,
    validateProject,
    validateProjectArray,
    validateSectionArray,
    validateTaskArray,
    validateUserArray,
    validateWorkspaceProject,
    validateWorkspaceProjectArray,
} from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all project-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public project method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class ProjectClient extends BaseClient {
    async getProject(id: string): Promise<PersonalProject | WorkspaceProject> {
        IdSchema.parse(id)
        const response = await request<PersonalProject | WorkspaceProject>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateProject(response.data)
    }

    async getProjects(args: GetProjectsArgs = {}): Promise<GetProjectsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetProjectsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateProjectArray(results),
            nextCursor,
        }
    }

    async searchProjects(args: SearchProjectsArgs): Promise<GetProjectsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetProjectsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_SEARCH,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateProjectArray(results),
            nextCursor,
        }
    }

    async getArchivedProjects(
        args: GetArchivedProjectsArgs = {},
    ): Promise<GetArchivedProjectsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetArchivedProjectsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_ARCHIVED,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateProjectArray(results),
            nextCursor,
        }
    }

    async addProject(
        args: AddProjectArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        const response = await request<PersonalProject | WorkspaceProject>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })

        return validateProject(response.data)
    }

    async updateProject(
        id: string,
        args: UpdateProjectArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        IdSchema.parse(id)
        const response = await request<PersonalProject | WorkspaceProject>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })

        return validateProject(response.data)
    }

    async deleteProject(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async archiveProject(
        id: string,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        IdSchema.parse(id)
        const response = await request<PersonalProject | WorkspaceProject>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id, PROJECT_ARCHIVE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateProject(response.data)
    }

    async unarchiveProject(
        id: string,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        IdSchema.parse(id)
        const response = await request<PersonalProject | WorkspaceProject>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id, PROJECT_UNARCHIVE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateProject(response.data)
    }

    async moveProjectToWorkspace(
        args: MoveProjectToWorkspaceArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        const response = await request<{
            project: PersonalProject | WorkspaceProject
        }>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_MOVE_TO_WORKSPACE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateProject(response.data.project)
    }

    async moveProjectToPersonal(
        args: MoveProjectToPersonalArgs,
        requestId?: string,
    ): Promise<PersonalProject | WorkspaceProject> {
        const response = await request<{
            project: PersonalProject | WorkspaceProject
        }>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_MOVE_TO_PERSONAL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateProject(response.data.project)
    }

    async getArchivedProjectsCount(
        args: GetArchivedProjectsCountArgs = {},
    ): Promise<GetArchivedProjectsCountResponse> {
        const { data } = await request<GetArchivedProjectsCountResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_ARCHIVED_COUNT,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return data
    }

    async getProjectPermissions(): Promise<GetProjectPermissionsResponse> {
        const { data } = await request<GetProjectPermissionsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_PERMISSIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return data
    }

    async getFullProject(
        id: string,
        args: GetFullProjectArgs = {},
    ): Promise<GetFullProjectResponse> {
        IdSchema.parse(id)
        const { data } = await request<Record<string, unknown>>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id, ENDPOINT_REST_PROJECT_FULL),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return {
            project: data.project ? validateProject(data.project) : null,
            commentsCount: data.commentsCount as number,
            tasks: validateTaskArray(data.tasks as unknown[]),
            sections: validateSectionArray(data.sections as unknown[]),
            collaborators: validateUserArray(data.collaborators as unknown[]),
            notes: validateCommentArray(data.notes as unknown[]),
        }
    }

    async joinProject(id: string, requestId?: string): Promise<JoinProjectResponse> {
        IdSchema.parse(id)
        const { data } = await request<JoinProjectResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, id, ENDPOINT_REST_PROJECT_JOIN),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return {
            project: validateWorkspaceProject(data.project),
            tasks: validateTaskArray(data.tasks),
            sections: validateSectionArray(data.sections),
            comments: validateNoteArray(data.comments),
            collaborators: validateCollaboratorArray(data.collaborators),
            collaboratorStates: validateCollaboratorStateArray(data.collaboratorStates),
            folder: data.folder ? validateFolder(data.folder) : null,
            subprojects: validateWorkspaceProjectArray(data.subprojects),
        }
    }

    async getProjectCollaborators(
        projectId: string,
        args: GetProjectCollaboratorsArgs = {},
    ): Promise<GetProjectCollaboratorsResponse> {
        IdSchema.parse(projectId)
        const {
            data: { results, nextCursor },
        } = await request<GetProjectCollaboratorsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(
                ENDPOINT_REST_PROJECTS,
                projectId,
                ENDPOINT_REST_PROJECT_COLLABORATORS,
            ),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateUserArray(results),
            nextCursor,
        }
    }
}
