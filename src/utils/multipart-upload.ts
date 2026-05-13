import { fetchWithRetry } from '../transport/fetch-with-retry'
import type { HttpResponse, CustomFetch } from '../types/http'
import { camelCaseKeys } from './case-conversion'

type UploadMultipartFileArgs = {
    baseUrl: string
    authToken: string
    endpoint: string
    file: Buffer | NodeJS.ReadableStream | string | Blob
    fileName?: string
    additionalFields: Record<string, string | number | boolean>
    requestId?: string
    customFetch?: CustomFetch
}

/**
 * Helper function to determine content-type from filename extension.
 * @param fileName - The filename to analyze
 * @returns The appropriate MIME type
 */
function getContentTypeFromFileName(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop()
    switch (extension) {
        case 'png':
            return 'image/png'
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg'
        case 'gif':
            return 'image/gif'
        case 'webp':
            return 'image/webp'
        case 'svg':
            return 'image/svg+xml'
        default:
            return 'application/octet-stream'
    }
}

/**
 * Uploads a file using multipart/form-data.
 *
 * This is a shared utility for uploading files to Todoist endpoints that require
 * multipart/form-data content type (e.g., file uploads, workspace logo uploads).
 *
 * Supports both browser (Blob/File) and Node.js (Buffer/ReadableStream/path) environments.
 *
 * @param baseUrl - The base API URL (e.g., https://api.todoist.com/api/v1/)
 * @param authToken - The authentication token
 * @param endpoint - The relative endpoint path (e.g., 'uploads', 'workspaces/logo')
 * @param file - The file content (Blob/File for browser, or Buffer/ReadableStream/path for Node)
 * @param fileName - Optional file name (required for Buffer/Stream, optional for paths and File objects)
 * @param additionalFields - Additional form fields to include (e.g., project_id, workspace_id)
 * @param requestId - Optional request ID for idempotency
 * @returns The response data from the server
 *
 * @example
 * ```typescript
 * // Upload from a file path
 * const result = await uploadMultipartFile(
 *   'https://api.todoist.com/api/v1/',
 *   'my-token',
 *   'uploads',
 *   '/path/to/file.pdf',
 *   undefined,
 *   { project_id: '12345' }
 * )
 *
 * // Upload from a Buffer
 * const buffer = Buffer.from('file content')
 * const result = await uploadMultipartFile(
 *   'https://api.todoist.com/api/v1/',
 *   'my-token',
 *   'uploads',
 *   buffer,
 *   'document.pdf',
 *   { project_id: '12345' }
 * )
 * ```
 */
export async function uploadMultipartFile(args: UploadMultipartFileArgs): Promise<unknown> {
    const {
        baseUrl,
        authToken,
        endpoint,
        file,
        fileName,
        additionalFields,
        requestId,
        customFetch,
    } = args

    // Build the full URL
    const url = `${baseUrl}${endpoint}`

    let body: BodyInit
    const headers: Record<string, string> = {
        Authorization: `Bearer ${authToken}`,
    }

    if (requestId) {
        headers['X-Request-Id'] = requestId
    }

    if (file instanceof Blob) {
        // Browser path: use native FormData
        const form = new globalThis.FormData()
        const resolvedFileName =
            fileName || (file instanceof File ? file.name : undefined) || 'upload'
        form.append('file', file, resolvedFileName)

        for (const [key, value] of Object.entries(additionalFields)) {
            if (value !== undefined && value !== null) {
                form.append(key, value.toString())
            }
        }

        // Don't set Content-Type — let fetch set it with the correct multipart boundary
        body = form
    } else {
        // Node path: dynamically import Node-only modules
        const [FormDataModule, fsModule, pathModule] = await Promise.all([
            import('form-data'),
            import('fs'),
            import('path'),
        ])
        const FormData = FormDataModule.default

        const form = new FormData()

        if (typeof file === 'string') {
            // File path - create read stream
            const resolvedFileName = fileName || pathModule.basename(file)
            form.append('file', fsModule.createReadStream(file), resolvedFileName)
        } else if (Buffer.isBuffer(file)) {
            // Buffer - require fileName
            if (!fileName) {
                throw new Error('fileName is required when uploading from a Buffer')
            }
            const contentType = getContentTypeFromFileName(fileName)
            form.append('file', file, {
                filename: fileName,
                contentType: contentType,
            })
        } else {
            // Stream - require fileName
            if (!fileName) {
                throw new Error('fileName is required when uploading from a stream')
            }
            form.append('file', file, fileName)
        }

        for (const [key, value] of Object.entries(additionalFields)) {
            if (value !== undefined && value !== null) {
                form.append(key, value.toString())
            }
        }

        Object.assign(headers, form.getHeaders())
        body = form as unknown as BodyInit
    }

    // Make the request using fetch
    const response: HttpResponse<unknown> = await fetchWithRetry({
        url,
        options: {
            method: 'POST',
            body,
            headers,
            timeout: 30000, // 30 second timeout for file uploads
        },
        customFetch,
    })

    return camelCaseKeys(response.data)
}
