import {
    ENDPOINT_REST_TEMPLATES_CATEGORIES,
    ENDPOINT_REST_TEMPLATES_CREATE_FROM_FILE,
    ENDPOINT_REST_TEMPLATES_FILE,
    ENDPOINT_REST_TEMPLATES_GET,
    ENDPOINT_REST_TEMPLATES_IMPORT_FROM_FILE,
    ENDPOINT_REST_TEMPLATES_IMPORT_FROM_ID,
    ENDPOINT_REST_TEMPLATES_LIST,
    ENDPOINT_REST_TEMPLATES_URL,
    ENDPOINT_REST_TEMPLATES_USER,
    ENDPOINT_REST_TEMPLATES_USER_IMPORT,
    ENDPOINT_REST_TEMPLATES_USER_PREVIEW,
    getUserTemplateEndpoint,
} from '../consts/endpoints'
import { request } from '../transport/http-client'
import { TodoistArgumentError } from '../types/errors'
import type {
    CreateProjectFromTemplateArgs,
    CreateProjectFromTemplateResponse,
    CreateUserTemplateArgs,
    CreateUserTemplateFromFileArgs,
    DeleteUserTemplateResponse,
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
    PreviewUserTemplateFromFileArgs,
    PreviewUserTemplateFromFileResponse,
    Template,
    UpdateUserTemplateArgs,
    UpdateUserTemplateResponse,
} from '../types/templates'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { spreadIfDefined } from '../utils/request-helpers'
import {
    validateCommentArray,
    validateDeleteUserTemplateResponse,
    validateGetTemplateCategoriesResponse,
    validateGetTemplatesByIdsResponse,
    validateGetTemplatesResponse,
    validatePreviewUserTemplateFromFileResponse,
    validateProjectArray,
    validateSectionArray,
    validateTaskArray,
    validateTemplate,
    validateUpdateUserTemplateResponse,
} from '../utils/validators'
import { BaseClient } from './base-client'

const TEMPLATES_BY_IDS_MAX = 100

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
        return validateGetTemplatesResponse(data)
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
        return validateGetTemplateCategoriesResponse(data)
    }

    async getTemplatesByIds(args: GetTemplatesByIdsArgs): Promise<GetTemplatesByIdsResponse> {
        const { templateIds, locale } = args
        if (!Array.isArray(templateIds) || templateIds.length === 0) {
            throw new TodoistArgumentError('templateIds must be a non-empty array.')
        }
        if (templateIds.length > TEMPLATES_BY_IDS_MAX) {
            throw new TodoistArgumentError(
                `templateIds may contain at most ${TEMPLATES_BY_IDS_MAX} IDs (received ${templateIds.length}).`,
            )
        }
        if (templateIds.some((id) => typeof id !== 'string' || id.length === 0)) {
            throw new TodoistArgumentError('templateIds must contain only non-empty strings.')
        }

        const { data } = await request<GetTemplatesByIdsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_GET,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                templateIds: templateIds.join(','),
                ...spreadIfDefined(locale, (v) => ({ locale: v })),
            },
        })
        return validateGetTemplatesByIdsResponse(data)
    }

    async createUserTemplate(args: CreateUserTemplateArgs, requestId?: string): Promise<Template> {
        const { data } = await request<Template>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_TEMPLATES_USER,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId,
        })
        return validateTemplate(data)
    }

    async updateUserTemplate(
        templateId: string,
        args: UpdateUserTemplateArgs = {},
        requestId?: string,
    ): Promise<UpdateUserTemplateResponse> {
        if (!templateId) {
            throw new TodoistArgumentError('templateId is required.')
        }
        const { data } = await request<UpdateUserTemplateResponse>({
            httpMethod: 'PUT',
            baseUri: this.syncApiBase,
            relativePath: getUserTemplateEndpoint(encodeURIComponent(templateId)),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId,
        })
        return validateUpdateUserTemplateResponse(data)
    }

    async deleteUserTemplate(
        templateId: string,
        requestId?: string,
    ): Promise<DeleteUserTemplateResponse> {
        if (!templateId) {
            throw new TodoistArgumentError('templateId is required.')
        }
        const { data } = await request<DeleteUserTemplateResponse>({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: getUserTemplateEndpoint(encodeURIComponent(templateId)),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId,
        })
        return validateDeleteUserTemplateResponse(data)
    }

    async previewUserTemplateFromFile(
        args: PreviewUserTemplateFromFileArgs,
        requestId?: string,
    ): Promise<PreviewUserTemplateFromFileResponse> {
        const data = await uploadMultipartFile({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_REST_TEMPLATES_USER_PREVIEW,
            file: args.file,
            fileName: args.fileName,
            additionalFields: {},
            customFetch: this.customFetch,
            requestId,
        })
        return validatePreviewUserTemplateFromFileResponse(data)
    }

    async createUserTemplateFromFile(
        args: CreateUserTemplateFromFileArgs,
        requestId?: string,
    ): Promise<Template> {
        const { templateType, name, description, color, file, fileName, uploadedFileName } = args
        const additionalFields: Record<string, string> = {
            template_type: templateType,
            name,
            description,
            color: String(color),
        }
        if (uploadedFileName !== undefined) {
            additionalFields.uploaded_file_name = uploadedFileName
        }
        const data = await uploadMultipartFile({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_REST_TEMPLATES_USER_IMPORT,
            file,
            fileName,
            additionalFields,
            customFetch: this.customFetch,
            requestId,
        })
        return validateTemplate(data)
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
