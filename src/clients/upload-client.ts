import { ENDPOINT_REST_UPLOADS } from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type { Attachment, Comment } from '../types/comments'
import type { CustomFetch, CustomFetchResponse, FileResponse } from '../types/http'
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

const MAX_ATTACHMENT_REDIRECTS = 5

/**
 * Builds the request headers for an attachment fetch, attaching the Bearer
 * token only when the URL is on the first-party authenticated host.
 */
function buildAttachmentAuthHeaders(url: string, authToken: string): Record<string, string> {
    return new URL(url).hostname === AUTHENTICATED_ATTACHMENT_HOST
        ? { Authorization: `Bearer ${authToken}` }
        : {}
}

/**
 * Fetches an attachment through a caller-supplied `customFetch` while
 * guaranteeing the auth token is never sent across origins.
 *
 * A `customFetch` is an arbitrary implementation that may not honour the Fetch
 * standard's rule of stripping `Authorization` on cross-origin redirects (older
 * `node-fetch`, for example, does not). Because `files.todoist.com` redirects
 * downloads to the CDN, a naive implementation could forward the token there.
 * We therefore drive redirects with `redirect: 'manual'` and follow them
 * ourselves, dropping the auth header whenever the origin changes.
 *
 * Implementations that hide the redirect behind an opaque response (status `0`,
 * e.g. undici and browsers) can't be followed manually; for those we re-issue
 * with normal redirect following and rely on the Fetch standard's cross-origin
 * auth stripping, which those runtimes implement.
 */
async function customFetchFollowingRedirects(
    customFetch: CustomFetch,
    startUrl: string,
    authToken: string,
): Promise<CustomFetchResponse> {
    let currentUrl = startUrl
    let headers = buildAttachmentAuthHeaders(currentUrl, authToken)

    for (let redirects = 0; redirects < MAX_ATTACHMENT_REDIRECTS; redirects++) {
        const response = await customFetch(currentUrl, {
            method: 'GET',
            headers,
            redirect: 'manual',
        })

        const location = response.headers['location']
        const isReadableRedirect =
            response.status >= 300 && response.status < 400 && Boolean(location)

        if (!isReadableRedirect) {
            // Opaque redirect (the impl hid the Location, e.g. undici): re-issue
            // with normal following and trust the runtime to strip auth cross-origin.
            if (response.status === 0) {
                return customFetch(currentUrl, { method: 'GET', headers })
            }
            return response
        }

        const nextUrl = new URL(location as string, currentUrl)
        if (nextUrl.origin !== new URL(currentUrl).origin) {
            headers = {}
        }
        currentUrl = nextUrl.toString()
    }

    throw new Error('Too many redirects while fetching attachment')
}

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

        if (this.customFetch) {
            // customFetch may not strip auth on cross-origin redirects, so we
            // follow the files.todoist.com -> CDN hop ourselves to avoid leaking
            // the token. See customFetchFollowingRedirects for details.
            const response = await customFetchFollowingRedirects(
                this.customFetch,
                fileUrl,
                this.authToken,
            )

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch attachment: ${response.status} ${response.statusText}`,
                )
            }

            return wrapAsFileResponse(response, 'viewAttachment')
        }

        // Built-in fetch (undici) strips Authorization on cross-origin redirects
        // per the Fetch standard, so the files.todoist.com -> CDN hop is safe here.
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: isAuthenticatedHost ? { Authorization: `Bearer ${this.authToken}` } : {},
        }
        const response = await fetch(fileUrl, fetchOptions)

        if (!response.ok) {
            throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText}`)
        }

        return wrapAsFileResponse(response, 'viewAttachment')
    }
}
