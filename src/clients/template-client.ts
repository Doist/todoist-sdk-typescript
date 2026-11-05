import {
    ENDPOINT_REST_PROJECTS,
    ENDPOINT_REST_PROJECTS_IMPORT,
    ENDPOINT_REST_TEMPLATES_FILE,
    ENDPOINT_REST_TEMPLATES_URL,
    PROJECT_IMPORT,
    PROJECT_IMPORT_TEMPLATE,
} from '../consts/endpoints'
import { request } from '../transport/http-client'
import type {
    CreateProjectFromCSVArgs,
    CreateProjectFromCSVResponse,
    ExportTemplateFileArgs,
    ExportTemplateUrlArgs,
    ExportTemplateUrlResponse,
    ImportTemplateFromIdArgs,
    ImportCSVIntoProjectArgs,
    ImportTemplateResponse,
} from '../types/templates'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { generatePath } from '../utils/request-helpers'
import {
    IdSchema,
    validateCommentArray,
    validateProjectArray,
    validateSectionArray,
    validateTaskArray,
} from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all template-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public template method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing
 * JSDoc.
 */
export class TemplateClient extends BaseClient {
    async exportTemplateAsFile(args: ExportTemplateFileArgs): Promise<string> {
        const response = await request<string>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_FILE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: args,
        })
        return response.data
    }

    async exportTemplateAsUrl(args: ExportTemplateUrlArgs): Promise<ExportTemplateUrlResponse> {
        const { data } = await request<ExportTemplateUrlResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_URL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: args,
        })
        return data
    }

    async createProjectFromCSV(
        args: CreateProjectFromCSVArgs,
        requestId?: string,
    ): Promise<CreateProjectFromCSVResponse> {
        const { file, fileName, name, workspaceId } = args
        const additionalFields: Record<string, string> = { name }
        if (workspaceId !== undefined && workspaceId !== null) {
            additionalFields.workspace_id = workspaceId
        }

        const data = await uploadMultipartFile({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_REST_PROJECTS_IMPORT,
            file,
            fileName,
            additionalFields,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            requestId,
        })
        return this.validateTemplateResponse(
            data as Record<string, unknown>,
        ) as CreateProjectFromCSVResponse
    }

    async importCSVIntoProject(
        args: ImportCSVIntoProjectArgs,
        requestId?: string,
    ): Promise<ImportTemplateResponse> {
        const { file, fileName, projectId } = args
        IdSchema.parse(projectId)
        const data = await uploadMultipartFile({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: generatePath(ENDPOINT_REST_PROJECTS, projectId, PROJECT_IMPORT),
            file,
            fileName,
            additionalFields: {},
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            requestId,
        })
        return this.validateTemplateResponse(
            data as Record<string, unknown>,
        ) as ImportTemplateResponse
    }

    async importTemplateFromId(
        args: ImportTemplateFromIdArgs,
        requestId?: string,
    ): Promise<ImportTemplateResponse> {
        const { projectId, ...payload } = args
        IdSchema.parse(projectId)
        const { data } = await request<Record<string, unknown>>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_PROJECTS, projectId, PROJECT_IMPORT_TEMPLATE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload,
            requestId: requestId,
        })
        return this.validateTemplateResponse(data) as ImportTemplateResponse
    }

    private validateTemplateResponse(data: Record<string, unknown>) {
        return {
            ...data,
            projects: validateProjectArray((data.projects as unknown[]) ?? []),
            sections: validateSectionArray((data.sections as unknown[]) ?? []),
            tasks: validateTaskArray((data.tasks as unknown[]) ?? []),
            comments: validateCommentArray((data.comments as unknown[]) ?? []),
        }
    }
}
