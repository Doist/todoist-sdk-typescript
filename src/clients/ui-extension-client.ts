import {
    ENDPOINT_REST_APPS_UI_EXTENSIONS,
    ENDPOINT_REST_APPS_UI_EXTENSIONS_INSTALLED,
    getUiExtensionEndpoint,
    getUiExtensionIconEndpoint,
    getUiExtensionsByIntegrationEndpoint,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddUiExtensionArgs,
    UiExtension,
    UpdateUiExtensionArgs,
    UploadUiExtensionIconArgs,
} from '../types/ui-extensions'
import { camelCaseKeys } from '../utils/case-conversion'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { IdSchema, validateUiExtension, validateUiExtensionArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all UI-extension endpoints for developer
 * applications. All endpoints require the `dev:app_console` OAuth scope.
 *
 * Instantiated by `TodoistApi`; every public UI-extension method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing JSDoc.
 */
export class UiExtensionClient extends BaseClient {
    async getUiExtension(uiExtensionId: string, requestId?: string): Promise<UiExtension> {
        IdSchema.parse(uiExtensionId)
        const response = await request<UiExtension>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getUiExtensionEndpoint(uiExtensionId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateUiExtension(response.data)
    }

    async getInstalledUiExtensions(requestId?: string): Promise<UiExtension[]> {
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_APPS_UI_EXTENSIONS_INSTALLED,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateUiExtensionArray(response.data)
    }

    async getUiExtensionsForApp(appId: string, requestId?: string): Promise<UiExtension[]> {
        IdSchema.parse(appId)
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getUiExtensionsByIntegrationEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateUiExtensionArray(response.data)
    }

    async addUiExtension(args: AddUiExtensionArgs, requestId?: string): Promise<UiExtension> {
        const response = await request<UiExtension>({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_APPS_UI_EXTENSIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateUiExtension(response.data)
    }

    async updateUiExtension(
        uiExtensionId: string,
        args: UpdateUiExtensionArgs,
        requestId?: string,
    ): Promise<UiExtension> {
        IdSchema.parse(uiExtensionId)
        const response = await request<UiExtension>({
            httpMethod: 'PATCH',
            baseUri: this.apiRootBase,
            relativePath: getUiExtensionEndpoint(uiExtensionId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateUiExtension(response.data)
    }

    async deleteUiExtension(uiExtensionId: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(uiExtensionId)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getUiExtensionEndpoint(uiExtensionId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async uploadUiExtensionIcon(
        args: UploadUiExtensionIconArgs,
        requestId?: string,
    ): Promise<UiExtension> {
        if (Buffer.isBuffer(args.file) && args.file.length === 0) {
            throw new Error('Cannot upload empty image file')
        }

        const data = await uploadMultipartFile<unknown>({
            baseUrl: this.apiRootBase,
            authToken: this.authToken,
            endpoint: getUiExtensionIconEndpoint(args.uiExtensionId),
            file: args.file,
            fileName: args.fileName,
            additionalFields: { file_name: args.fileName ?? '' },
            requestId: requestId,
            customFetch: this.customFetch,
        })
        return validateUiExtension(camelCaseKeys(data))
    }
}
