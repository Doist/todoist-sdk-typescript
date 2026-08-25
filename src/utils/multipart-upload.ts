import { v4 as uuidv4 } from 'uuid'
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
 * Escapes a value for use inside a `Content-Disposition` parameter, which is
 * quoted and therefore cannot carry a raw quote or line break.
 */
function escapeDispositionValue(value: string): string {
    return value.replace(/"/g, '%22').replace(/\r?\n/g, ' ')
}

/**
 * Builds a `multipart/form-data` body as a `Blob`, together with the
 * `Content-Type` that describes it.
 *
 * A `FormData` body is only encoded by the `fetch` that owns that `FormData`
 * class. undici brands its own, so a global `FormData` passed to undici's
 * `fetch` — or an undici one passed to the runtime's global `fetch` — is
 * stringified to the literal `"[object FormData]"` and the upload silently
 * sends no file. `Blob` carries no such brand, so encoding the body ourselves
 * works whichever `fetch` ends up dispatching the request, including a
 * caller-supplied `customFetch`.
 *
 * File-backed Blobs (for example from `fs.openAsBlob`) stay lazy when composed
 * into another Blob, so the file is not read into memory here.
 */
function buildBlobMultipartBody(args: {
    file: Blob
    fileName: string
    additionalFields: Record<string, string | number | boolean>
}): { body: Blob; contentType: string } {
    const { file, fileName, additionalFields } = args
    const boundary = `----todoist-sdk-${uuidv4()}`
    const parts: BlobPart[] = []

    const fileContentType = file.type || getContentTypeFromFileName(fileName)
    parts.push(
        `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${escapeDispositionValue(fileName)}"\r\n` +
            `Content-Type: ${fileContentType}\r\n\r\n`,
        file,
        '\r\n',
    )

    for (const [key, value] of Object.entries(additionalFields)) {
        if (value !== undefined && value !== null) {
            parts.push(
                `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="${escapeDispositionValue(key)}"\r\n\r\n` +
                    `${value.toString()}\r\n`,
            )
        }
    }

    parts.push(`--${boundary}--\r\n`)

    return { body: new Blob(parts), contentType: `multipart/form-data; boundary=${boundary}` }
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
        const resolvedFileName =
            fileName || (file instanceof File ? file.name : undefined) || 'upload'
        const multipart = buildBlobMultipartBody({
            file,
            fileName: resolvedFileName,
            additionalFields,
        })

        // The boundary is ours, so the Content-Type has to be set explicitly —
        // `fetch` only fills it in for a `FormData` body.
        headers['Content-Type'] = multipart.contentType
        body = multipart.body
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
