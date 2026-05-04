import {
    ENDPOINT_REST_LABELS,
    ENDPOINT_REST_LABELS_SEARCH,
    ENDPOINT_REST_LABELS_SHARED,
    ENDPOINT_REST_LABELS_SHARED_REMOVE,
    ENDPOINT_REST_LABELS_SHARED_RENAME,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddLabelArgs,
    GetLabelsArgs,
    GetLabelsResponse,
    GetSharedLabelsArgs,
    GetSharedLabelsResponse,
    Label,
    RemoveSharedLabelArgs,
    RenameSharedLabelArgs,
    SearchLabelsArgs,
    UpdateLabelArgs,
} from '../types/labels'
import { generatePath } from '../utils/request-helpers'
import { IdSchema, validateLabel, validateLabelArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all label-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public label method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class LabelClient extends BaseClient {
    async getLabel(id: string): Promise<Label> {
        IdSchema.parse(id)
        const response = await request<Label>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_LABELS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateLabel(response.data)
    }

    async getLabels(args: GetLabelsArgs = {}): Promise<GetLabelsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetLabelsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_LABELS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateLabelArray(results),
            nextCursor,
        }
    }

    async searchLabels(args: SearchLabelsArgs): Promise<GetLabelsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetLabelsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_LABELS_SEARCH,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateLabelArray(results),
            nextCursor,
        }
    }

    async addLabel(args: AddLabelArgs, requestId?: string): Promise<Label> {
        const response = await request<Label>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_LABELS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })

        return validateLabel(response.data)
    }

    async updateLabel(id: string, args: UpdateLabelArgs, requestId?: string): Promise<Label> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_LABELS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateLabel(response.data)
    }

    async deleteLabel(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_LABELS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async getSharedLabels(args?: GetSharedLabelsArgs): Promise<GetSharedLabelsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetSharedLabelsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_LABELS_SHARED,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return { results, nextCursor }
    }

    async renameSharedLabel(args: RenameSharedLabelArgs): Promise<boolean> {
        const response = await request<void>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_LABELS_SHARED_RENAME,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return isSuccess(response)
    }

    async removeSharedLabel(args: RemoveSharedLabelArgs): Promise<boolean> {
        const response = await request<void>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_LABELS_SHARED_REMOVE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return isSuccess(response)
    }
}
