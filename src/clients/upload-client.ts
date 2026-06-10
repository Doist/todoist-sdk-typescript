import { ENDPOINT_REST_UPLOADS } from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type { Attachment, Comment } from '../types/comments'
import type { FileResponse } from '../types/http'
import type { DeleteUploadArgs, UploadFileArgs } from '../types/uploads'
import { wrapAsFileResponse } from '../utils/file-response'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { validateAttachment } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * First-party origin that serves attachment downloads behind Bearer auth.
 * It redirects to the CDN; on the cross-origin hop the runtime drops the
 * Authorization header, so the token never reaches the CDN.
 */
const AUTHENTICATED_ATTACHMENT_HOST = 'files.todoist.com'

/**
 * CDN origins that serve attachments via pre-signed URLs. These are
 * third-party infrastructure and must never receive the auth token.
 */
const CDN_ATTACHMENT_HOSTS = new Set(['todoist.b-cdn.net', 'd1ysz50cxb9zwl.cloudfront.net'])

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

        const data = await uploadMultipartFile({
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

        // Only allow known attachment origins, and only attach the auth token to the
        // first-party authenticated host. This prevents the token leaking to other
        // todoist.com hosts (e.g. api.todoist.com) or to third-party CDN infrastructure.
        const urlHostname = new URL(fileUrl).hostname
        const isAuthenticatedHost = urlHostname === AUTHENTICATED_ATTACHMENT_HOST
        if (!isAuthenticatedHost && !CDN_ATTACHMENT_HOSTS.has(urlHostname)) {
            throw new Error('Attachment URLs must be on a known Todoist attachment host')
        }

        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: isAuthenticatedHost ? { Authorization: `Bearer ${this.authToken}` } : {},
        }

        if (this.customFetch) {
            const response = await this.customFetch(fileUrl, fetchOptions)

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch attachment: ${response.status} ${response.statusText}`,
                )
            }

            return wrapAsFileResponse(response, 'viewAttachment')
        }

        const response = await fetch(fileUrl, fetchOptions)

        if (!response.ok) {
            throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText}`)
        }

        return wrapAsFileResponse(response, 'viewAttachment')
    }
}
