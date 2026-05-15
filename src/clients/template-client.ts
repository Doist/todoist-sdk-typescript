import {
    ENDPOINT_REST_TEMPLATES_CATEGORIES,
    ENDPOINT_REST_TEMPLATES_CREATE_FROM_FILE,
    ENDPOINT_REST_TEMPLATES_FILE,
    ENDPOINT_REST_TEMPLATES_GET,
    ENDPOINT_REST_TEMPLATES_IMPORT_FROM_FILE,
    ENDPOINT_REST_TEMPLATES_IMPORT_FROM_ID,
    ENDPOINT_REST_TEMPLATES_LIST,
    ENDPOINT_REST_TEMPLATES_URL,
} from '../consts/endpoints'
import { request } from '../transport/http-client'
import type {
    CreateProjectFromTemplateArgs,
    CreateProjectFromTemplateResponse,
    ExportTemplateFileArgs,
    ExportTemplateUrlArgs,
    ExportTemplateUrlResponse,
    GetTemplateCategoriesArgs,
    GetTemplateCategoriesResponse,
    GetTemplatesArgs,
    GetTemplatesByIdsArgs,
    GetTemplatesByIdsResponse,
    GetTemplatesResponse,
    ImportTemplateFromIdArgs,
    ImportTemplateIntoProjectArgs,
    ImportTemplateResponse,
    Template,
} from '../types/templates'
import { uploadMultipartFile } from '../utils/multipart-upload'
import {
    validateCommentArray,
    validateProjectArray,
    validateSectionArray,
    validateTaskArray,
    validateTemplate,
    validateTemplateArray,
    validateTemplateCategoryArray,
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
            payload: args,
        })
        return data
    }

    async createProjectFromTemplate(
        args: CreateProjectFromTemplateArgs,
        requestId?: string,
    ): Promise<CreateProjectFromTemplateResponse> {
        const { file, fileName, name, workspaceId } = args
        const additionalFields: Record<string, string> = { name }
        if (workspaceId !== undefined && workspaceId !== null) {
            additionalFields.workspace_id = workspaceId
        }

        const data = await uploadMultipartFile({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_REST_TEMPLATES_CREATE_FROM_FILE,
            file,
            fileName,
            additionalFields,
            customFetch: this.customFetch,
            requestId,
        })
        return this.validateTemplateResponse(
            data as Record<string, unknown>,
        ) as CreateProjectFromTemplateResponse
    }

    async importTemplateIntoProject(
        args: ImportTemplateIntoProjectArgs,
        requestId?: string,
    ): Promise<ImportTemplateResponse> {
        const { file, fileName, projectId } = args
        const data = await uploadMultipartFile({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_REST_TEMPLATES_IMPORT_FROM_FILE,
            file,
            fileName,
            additionalFields: { project_id: projectId },
            customFetch: this.customFetch,
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
        const { data } = await request<Record<string, unknown>>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_IMPORT_FROM_ID,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return this.validateTemplateResponse(data) as ImportTemplateResponse
    }

    async getTemplates(args: GetTemplatesArgs = {}): Promise<GetTemplatesResponse> {
        const { data } = await request<GetTemplatesResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_LIST,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return { ...data, templates: validateTemplateArray(data.templates) }
    }

    async getTemplateCategories(
        args: GetTemplateCategoriesArgs = {},
    ): Promise<GetTemplateCategoriesResponse> {
        const { data } = await request<GetTemplateCategoriesResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_CATEGORIES,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return { categories: validateTemplateCategoryArray(data.categories) }
    }

    async getTemplatesByIds(args: GetTemplatesByIdsArgs): Promise<GetTemplatesByIdsResponse> {
        const { templateIds, locale } = args
        const { data } = await request<GetTemplatesByIdsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_GET,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: { templateIds: templateIds.join(','), ...(locale ? { locale } : {}) },
        })
        const validated: Record<string, Template> = {}
        for (const template of Object.values(data.templates ?? {})) {
            const valid = validateTemplate(template)
            validated[valid.id] = valid
        }
        return { templates: validated }
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
