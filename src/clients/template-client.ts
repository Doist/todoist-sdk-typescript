import {
    ENDPOINT_REST_TEMPLATES_CREATE_FROM_FILE,
    ENDPOINT_REST_TEMPLATES_FILE,
    ENDPOINT_REST_TEMPLATES_IMPORT_FROM_FILE,
    ENDPOINT_REST_TEMPLATES_IMPORT_FROM_ID,
    ENDPOINT_REST_TEMPLATES_URL,
    ENDPOINT_REST_TEMPLATES,
    ENDPOINT_REST_TEMPLATES_CATEGORIES,
    ENDPOINT_REST_TEMPLATES_USER,
    TEMPLATES_API_VERSION,
    ENDPOINT_REST_PROJECTS_FROM_TEMPLATE,
} from '../consts/endpoints'
import { request } from '../transport/http-client'
import type {
    CreateProjectFromTemplateArgs,
    CreateProjectFromTemplateIdArgs,
    CreateProjectFromTemplateIdResponse,
    CreateProjectFromTemplateResponse,
    SaveProjectAsTemplateArgs,
    GetTemplateArgs,
    GetTemplateCategoriesArgs,
    GetTemplatesArgs,
    GetTemplatesByIdsArgs,
    GetTemplatesResponse,
    ExportTemplateFileArgs,
    ExportTemplateUrlArgs,
    ExportTemplateUrlResponse,
    ImportTemplateFromIdArgs,
    ImportTemplateIntoProjectArgs,
    ImportTemplateResponse,
    Template,
    TemplateCategory,
} from '../types/templates'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { generatePath } from '../utils/request-helpers'
import {
    validateCommentArray,
    validateProjectArray,
    validateSectionArray,
    validateTaskArray,
    IdSchema,
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
    /** Base URI for saved-template routes, on `TEMPLATES_API_VERSION`. */
    private get templatesApiBase(): string {
        return new URL(`/api/${TEMPLATES_API_VERSION}/`, this.syncApiBase).toString()
    }

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
            customHeaders: this.customHeaders,
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
        const { data } = await request<Record<string, unknown>>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_IMPORT_FROM_ID,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: args,
            requestId: requestId,
        })
        return this.validateTemplateResponse(data) as ImportTemplateResponse
    }

    async getTemplates(args: GetTemplatesArgs = {}): Promise<GetTemplatesResponse> {
        return this.requestTemplatePage(args)
    }

    async getTemplatesByIds(args: GetTemplatesByIdsArgs): Promise<GetTemplatesResponse> {
        const { ids, ...rest } = args
        return this.requestTemplatePage({ ...rest, ids: ids.join(',') })
    }

    async getTemplate(id: string, args: GetTemplateArgs = {}): Promise<Template> {
        IdSchema.parse(id)
        const { data } = await request<unknown>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_TEMPLATES, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: args,
        })
        return validateTemplate(data)
    }

    async getTemplateCategories(args: GetTemplateCategoriesArgs = {}): Promise<TemplateCategory[]> {
        const { data } = await request<{ categories: unknown }>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_CATEGORIES,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: args,
        })
        return validateTemplateCategoryArray(data.categories)
    }

    async saveProjectAsTemplate(
        args: SaveProjectAsTemplateArgs,
        requestId?: string,
    ): Promise<Template> {
        const { templateType = 'project', ...rest } = args
        const { data } = await request<unknown>({
            httpMethod: 'POST',
            baseUri: this.templatesApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_USER,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: { ...rest, templateType },
            requestId: requestId,
        })
        return validateTemplate(data)
    }

    async createProjectFromTemplateId(
        args: CreateProjectFromTemplateIdArgs,
        requestId?: string,
    ): Promise<CreateProjectFromTemplateIdResponse> {
        const { data } = await request<CreateProjectFromTemplateIdResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_PROJECTS_FROM_TEMPLATE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload: args,
            requestId: requestId,
        })
        return data
    }

    private async requestTemplatePage(
        payload: Record<string, unknown>,
    ): Promise<GetTemplatesResponse> {
        const {
            data: { results, nextCursor },
        } = await request<{ results: unknown; nextCursor: string | null }>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            customHeaders: this.customHeaders,
            payload,
        })
        return { results: validateTemplateArray(results), nextCursor }
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
