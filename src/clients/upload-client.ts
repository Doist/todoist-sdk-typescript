import { ENDPOINT_REST_UPLOADS } from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type { Attachment, Comment } from '../types/comments'
import type { FileResponse } from '../types/http'
import type { DeleteUploadArgs, UploadFileArgs } from '../types/uploads'
import { headersToRecord } from '../utils/headers'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { validateAttachment } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling upload + attachment endpoints
 * (file upload, upload delete, attachment view).
 *
 * Instantiated by `TodoistApi`; every public upload method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing
 * JSDoc.
 */
export class UploadClient extends BaseClient {
    async uploadFile(args: UploadFileArgs, requestId?: string): Promise<Attachment> {
        const additionalFields: Record<string, string | number | boolean> = {}
        if (args.projectId) {
            additionalFields.project_id = args.projectId
        }

        const data = await uploadMultipartFile<Attachment>({
            baseUrl: this.syncApiBase,
            authToken: this.authToken,
            endpoint: ENDPOINT_REST_UPLOADS,
            file: args.file,
            fileName: args.fileName,
            additionalFields: additionalFields,
            requestId: requestId,
            customFetch: this.customFetch,
        })

        return validateAttachment(data)
    }

    async deleteUpload(args: DeleteUploadArgs, requestId?: string): Promise<boolean> {
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_UPLOADS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async viewAttachment(commentOrUrl: Comment | string): Promise<FileResponse> {
        let fileUrl: string

        if (typeof commentOrUrl === 'string') {
            fileUrl = commentOrUrl
        } else {
            if (!commentOrUrl.fileAttachment?.fileUrl) {
                throw new Error('Comment does not have a file attachment')
            }
            fileUrl = commentOrUrl.fileAttachment.fileUrl
        }

        // Validate the URL belongs to Todoist to prevent leaking the auth token
        const urlHostname = new URL(fileUrl).hostname
        if (!urlHostname.endsWith('.todoist.com')) {
            throw new Error('Attachment URLs must be on a todoist.com domain')
        }

        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: { Authorization: `Bearer ${this.authToken}` },
        }

        if (this.customFetch) {
            const response = await this.customFetch(fileUrl, fetchOptions)

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch attachment: ${response.status} ${response.statusText}`,
                )
            }

            // Convert text to ArrayBuffer for custom fetch implementations that lack arrayBuffer()
            const text = await response.text()
            const buffer = new TextEncoder().encode(text).buffer

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                text: () => Promise.resolve(text),
                json: () => response.json(),
                arrayBuffer: () => Promise.resolve(buffer),
            }
        }

        const response = await fetch(fileUrl, fetchOptions)

        if (!response.ok) {
            throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText}`)
        }

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: headersToRecord(response.headers),
            text: () => response.text(),
            json: () => response.json(),
            arrayBuffer: () => response.arrayBuffer(),
        }
    }
}
