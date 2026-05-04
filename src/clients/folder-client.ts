import { ENDPOINT_REST_FOLDERS } from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddFolderArgs,
    GetFoldersArgs,
    GetFoldersResponse,
    UpdateFolderArgs,
} from '../types/folders'
import type { Folder } from '../types/sync/resources/folders'
import { generatePath } from '../utils/request-helpers'
import { IdSchema, validateFolder, validateFolderArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all folder-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public folder method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class FolderClient extends BaseClient {
    async getFolders(args: GetFoldersArgs): Promise<GetFoldersResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetFoldersResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_FOLDERS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateFolderArray(results),
            nextCursor,
        }
    }

    async getFolder(id: string): Promise<Folder> {
        IdSchema.parse(id)
        const response = await request<Folder>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_FOLDERS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateFolder(response.data)
    }

    async addFolder(args: AddFolderArgs, requestId?: string): Promise<Folder> {
        const response = await request<Folder>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_FOLDERS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })

        return validateFolder(response.data)
    }

    async updateFolder(id: string, args: UpdateFolderArgs, requestId?: string): Promise<Folder> {
        IdSchema.parse(id)
        const response = await request<Folder>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_FOLDERS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })

        return validateFolder(response.data)
    }

    async deleteFolder(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_FOLDERS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }
}
