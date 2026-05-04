import { z } from 'zod'
import {
    ENDPOINT_REST_APPS,
    ENDPOINT_REST_APPS_INSTALLATIONS,
    ENDPOINT_REST_USER_AUTHORIZATIONS,
    ENDPOINT_REST_USER_AUTHORIZATIONS_DELETE,
    getAppByDistributionTokenEndpoint,
    getAppClientSecretEndpoint,
    getAppDistributionTokenEndpoint,
    getAppEndpoint,
    getAppIconEndpoint,
    getAppInstallationEndpoint,
    getAppSecretsEndpoint,
    getAppTestTokenEndpoint,
    getAppTokensEndpoint,
    getAppVerificationTokenEndpoint,
    getAppWebhookEndpoint,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddAppArgs,
    App,
    AppByDistributionToken,
    AppDistributionToken,
    AppInstallation,
    AppSecrets,
    AppTestToken,
    AppVerificationToken,
    AppWebhook,
    AppWithUserCount,
    InstallAppArgs,
    RevokeUserAuthorizationArgs,
    UpdateAppArgs,
    UpdateAppInstallationArgs,
    UpdateAppWebhookArgs,
    UploadAppIconArgs,
    UserAuthorization,
} from '../types/apps'
import { webhookEventToWireName } from '../types/apps'
import { camelCaseKeys } from '../utils/case-conversion'
import { uploadMultipartFile } from '../utils/multipart-upload'
import {
    IdSchema,
    validateApp,
    validateAppArray,
    validateAppByDistributionToken,
    validateAppDistributionToken,
    validateAppInstallation,
    validateAppInstallationArray,
    validateAppSecrets,
    validateAppTestToken,
    validateAppVerificationToken,
    validateAppWebhook,
    validateAppWithUserCount,
    validateUserAuthorizationArray,
} from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all developer-app management endpoints
 * (apps, secrets, tokens, webhooks, installations, user authorizations).
 * All endpoints require the `dev:app_console` OAuth scope.
 *
 * Instantiated by `TodoistApi`; every public app-management method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing JSDoc.
 */
export class AppClient extends BaseClient {
    async getApps(requestId?: string): Promise<App[]> {
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_APPS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppArray(response.data)
    }

    async getApp(appId: string, requestId?: string): Promise<AppWithUserCount> {
        IdSchema.parse(appId)
        const response = await request<AppWithUserCount>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppWithUserCount(response.data)
    }

    async addApp(args: AddAppArgs, requestId?: string): Promise<App> {
        const response = await request<App>({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_APPS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateApp(response.data)
    }

    async updateApp(
        appId: string,
        args: UpdateAppArgs,
        requestId?: string,
    ): Promise<AppWithUserCount> {
        IdSchema.parse(appId)
        const { appTokenScopes, ...rest } = args
        const payload: Record<string, unknown> = { ...rest }
        if (appTokenScopes !== undefined) {
            payload.appTokenScopes = appTokenScopes === null ? null : appTokenScopes.join(',')
        }
        const response = await request<AppWithUserCount>({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: getAppEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: payload,
            requestId: requestId,
        })
        return validateAppWithUserCount(response.data)
    }

    async deleteApp(appId: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(appId)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getAppEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async getAppSecrets(appId: string, requestId?: string): Promise<AppSecrets> {
        IdSchema.parse(appId)
        const response = await request<AppSecrets>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppSecretsEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppSecrets(response.data)
    }

    async resetAppClientSecret(appId: string, requestId?: string): Promise<AppWithUserCount> {
        IdSchema.parse(appId)
        const response = await request<AppWithUserCount>({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getAppClientSecretEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppWithUserCount(response.data)
    }

    async revokeAppTokens(appId: string, requestId?: string): Promise<AppWithUserCount> {
        IdSchema.parse(appId)
        const response = await request<AppWithUserCount>({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getAppTokensEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppWithUserCount(response.data)
    }

    async uploadAppIcon(
        { appId, file, fileName = '', size = 'medium' }: UploadAppIconArgs,
        requestId?: string,
    ): Promise<AppWithUserCount> {
        IdSchema.parse(appId)
        if (Buffer.isBuffer(file) && file.length === 0) {
            throw new Error('Cannot upload empty image file')
        }

        const data = await uploadMultipartFile<unknown>({
            baseUrl: this.apiRootBase,
            authToken: this.authToken,
            endpoint: getAppIconEndpoint(appId, size),
            file,
            fileName,
            additionalFields: { file_name: fileName },
            requestId: requestId,
            customFetch: this.customFetch,
        })
        return validateAppWithUserCount(camelCaseKeys(data))
    }

    async getAppTestToken(appId: string, requestId?: string): Promise<AppTestToken> {
        IdSchema.parse(appId)
        const response = await request<AppTestToken>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppTestTokenEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppTestToken(response.data)
    }

    async createAppTestToken(appId: string, requestId?: string): Promise<AppTestToken> {
        IdSchema.parse(appId)
        const response = await request<AppTestToken>({
            httpMethod: 'PUT',
            baseUri: this.apiRootBase,
            relativePath: getAppTestTokenEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppTestToken(response.data)
    }

    async getAppDistributionToken(
        appId: string,
        requestId?: string,
    ): Promise<AppDistributionToken> {
        IdSchema.parse(appId)
        const response = await request<AppDistributionToken>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppDistributionTokenEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppDistributionToken(response.data)
    }

    async getAppVerificationToken(
        appId: string,
        requestId?: string,
    ): Promise<AppVerificationToken> {
        IdSchema.parse(appId)
        const response = await request<AppVerificationToken>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppVerificationTokenEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppVerificationToken(response.data)
    }

    async resetAppVerificationToken(
        appId: string,
        requestId?: string,
    ): Promise<AppVerificationToken> {
        IdSchema.parse(appId)
        const response = await request<AppVerificationToken>({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getAppVerificationTokenEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppVerificationToken(response.data)
    }

    async getAppByDistributionToken(
        distributionToken: string,
        requestId?: string,
    ): Promise<AppByDistributionToken> {
        z.string().min(1).parse(distributionToken)
        const response = await request<AppByDistributionToken>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppByDistributionTokenEndpoint(distributionToken),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppByDistributionToken(response.data)
    }

    // --- App webhooks ---

    async getAppWebhook(appId: string, requestId?: string): Promise<AppWebhook | null> {
        IdSchema.parse(appId)
        const response = await request<AppWebhook | null>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppWebhookEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return response.data ? validateAppWebhook(response.data) : null
    }

    async updateAppWebhook(args: UpdateAppWebhookArgs, requestId?: string): Promise<AppWebhook> {
        const { appId, events, ...rest } = args
        const response = await request<AppWebhook>({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: getAppWebhookEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                ...rest,
                events: events.map(webhookEventToWireName),
            },
            requestId: requestId,
        })
        return validateAppWebhook(response.data)
    }

    async deleteAppWebhook(appId: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(appId)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getAppWebhookEndpoint(appId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    // --- App installations ---

    async getAppInstallations(requestId?: string): Promise<AppInstallation[]> {
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_APPS_INSTALLATIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppInstallationArray(response.data)
    }

    async installApp(args: InstallAppArgs, requestId?: string): Promise<AppInstallation> {
        const response = await request<AppInstallation>({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_APPS_INSTALLATIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateAppInstallation(response.data)
    }

    async getAppInstallation(installationId: string, requestId?: string): Promise<AppInstallation> {
        IdSchema.parse(installationId)
        const response = await request<AppInstallation>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: getAppInstallationEndpoint(installationId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateAppInstallation(response.data)
    }

    async updateAppInstallation(
        installationId: string,
        args: UpdateAppInstallationArgs,
        requestId?: string,
    ): Promise<AppInstallation> {
        IdSchema.parse(installationId)
        const response = await request<AppInstallation>({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: getAppInstallationEndpoint(installationId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateAppInstallation(response.data)
    }

    async uninstallApp(installationId: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(installationId)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.apiRootBase,
            relativePath: getAppInstallationEndpoint(installationId),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    // --- User authorizations ---

    async getUserAuthorizations(requestId?: string): Promise<UserAuthorization[]> {
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_USER_AUTHORIZATIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateUserAuthorizationArray(response.data)
    }

    async revokeUserAuthorization(
        args: RevokeUserAuthorizationArgs,
        requestId?: string,
    ): Promise<boolean> {
        const response = await request({
            httpMethod: 'POST',
            baseUri: this.apiRootBase,
            relativePath: ENDPOINT_REST_USER_AUTHORIZATIONS_DELETE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return isSuccess(response)
    }
}
