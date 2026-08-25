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
 * Escapes a value for use inside a quoted `Content-Disposition` parameter,
 * where a raw quote would end the value early and a raw CR or LF would end the
 * header. Note that a lone CR needs escaping too, not just CRLF pairs.
 *
 * This is the same escaping the platform's own `FormData` encoder applies, so
 * servers see exactly what they would from any browser or from undici.
 */
function escapeDispositionValue(value: string): string {
    return value.replace(/"/g, '%22').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

type MultipartParts = {
    boundary: string
    /** Everything before the file content. */
    head: string
    /** Everything after the file content, including the additional fields. */
    tail: string
}

/**
 * Lays out a `multipart/form-data` payload around a single file part, as the
 * text that goes before and after the file content. Keeping the file content
 * out of it lets the same layout serve both a `Blob` body and a streamed one.
 */
function layOutMultipart(args: {
    fileName: string
    fileContentType: string
    additionalFields: Record<string, string | number | boolean>
}): MultipartParts {
    const { fileName, fileContentType, additionalFields } = args
    const boundary = `----todoist-sdk-${uuidv4()}`

    const head =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${escapeDispositionValue(fileName)}"\r\n` +
        `Content-Type: ${fileContentType}\r\n\r\n`

    let tail = '\r\n'
    for (const [key, value] of Object.entries(additionalFields)) {
        if (value !== undefined && value !== null) {
            tail +=
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${escapeDispositionValue(key)}"\r\n\r\n` +
                `${value.toString()}\r\n`
        }
    }
    tail += `--${boundary}--\r\n`

    return { boundary, head, tail }
}

/**
 * Wraps a Node readable stream as a `multipart/form-data` request body.
 *
 * The result is a web `ReadableStream`, which both the runtime's `fetch` and
 * undici's own accept — unlike a Node stream or a `FormData`, either of which
 * only works with one particular client. The file is never buffered, so the
 * request is sent with `Transfer-Encoding: chunked`.
 */
function streamMultipartBody(
    file: NodeJS.ReadableStream,
    parts: MultipartParts,
): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()

    async function* chunks(): AsyncGenerator<Uint8Array> {
        yield encoder.encode(parts.head)
        for await (const chunk of file) {
            yield typeof chunk === 'string' ? encoder.encode(chunk) : new Uint8Array(chunk)
        }
        yield encoder.encode(parts.tail)
    }

    const iterator = chunks()

    // Driven by hand rather than with `ReadableStream.from`, which is absent
    // from this project's DOM lib types and is still missing in some browsers,
    // or `Readable.toWeb`, which would drag a Node-only import into a module
    // that browsers also load.
    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            const { value, done } = await iterator.next()
            if (done) {
                controller.close()
                return
            }
            controller.enqueue(value)
        },
        async cancel(reason) {
            await iterator.return?.(reason)
        },
    })
}

/**
 * Builds the request body for a multipart upload.
 *
 * Deliberately avoids `FormData`. A `FormData` body is only encoded by the
 * `fetch` that owns that `FormData` class — undici brands its own — so a body
 * built from the global `FormData` and sent through undici's `fetch`, or the
 * reverse, is stringified to the literal `"[object FormData]"` and the upload
 * silently carries no file. The `form-data` package fares worse: neither
 * `fetch` accepts it as a body at all. `Blob` and `ReadableStream` carry no
 * such brand and work with whichever `fetch` dispatches the request,
 * including a caller-supplied `customFetch`.
 */
function buildMultipartBody(args: {
    file: Blob | NodeJS.ReadableStream
    fileName: string
    fileContentType: string
    additionalFields: Record<string, string | number | boolean>
}): { body: BodyInit; contentType: string; isStreamed: boolean } {
    const { file, fileName, fileContentType, additionalFields } = args
    const parts = layOutMultipart({ fileName, fileContentType, additionalFields })
    const contentType = `multipart/form-data; boundary=${parts.boundary}`

    if (file instanceof Blob) {
        // A Blob keeps its length, so the request gets a Content-Length and
        // stays replayable if it has to be retried. File-backed Blobs (from
        // `fs.openAsBlob`) stay lazy here, so nothing is read into memory.
        return { body: new Blob([parts.head, file, parts.tail]), contentType, isStreamed: false }
    }

    return { body: streamMultipartBody(file, parts), contentType, isStreamed: true }
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

    // Resolve the file to something every `fetch` accepts as a body part: a
    // Blob where the size is known up front, or a Node stream that gets piped
    // through untouched.
    let filePart: Blob | NodeJS.ReadableStream
    let resolvedFileName: string

    if (file instanceof Blob) {
        filePart = file
        resolvedFileName = fileName || (file instanceof File ? file.name : undefined) || 'upload'
    } else if (typeof file === 'string') {
        // File path: Node-only, so import lazily to keep browser bundles clean.
        const [fsModule, pathModule] = await Promise.all([import('fs'), import('path')])
        resolvedFileName = fileName || pathModule.basename(file)
        // `openAsBlob` reads the file lazily, so a large upload is not pulled
        // into memory, and the resulting body still has a known length.
        filePart = await fsModule.openAsBlob(file)
    } else if (Buffer.isBuffer(file)) {
        if (!fileName) {
            throw new Error('fileName is required when uploading from a Buffer')
        }
        resolvedFileName = fileName
        filePart = new Blob([
            new Uint8Array(file.buffer as ArrayBuffer, file.byteOffset, file.byteLength),
        ])
    } else {
        if (!fileName) {
            throw new Error('fileName is required when uploading from a stream')
        }
        resolvedFileName = fileName
        filePart = file
    }

    const multipart = buildMultipartBody({
        file: filePart,
        fileName: resolvedFileName,
        fileContentType:
            (filePart instanceof Blob ? filePart.type : undefined) ||
            getContentTypeFromFileName(resolvedFileName),
        additionalFields,
    })

    // The boundary is ours, so Content-Type has to be set explicitly — `fetch`
    // only fills it in for a `FormData` body.
    headers['Content-Type'] = multipart.contentType
    body = multipart.body

    // Make the request using fetch
    const response: HttpResponse<unknown> = await fetchWithRetry({
        url,
        options: {
            method: 'POST',
            body,
            headers,
            timeout: 30000, // 30 second timeout for file uploads
            // Required by fetch whenever the body is a stream. Harmless on the
            // Blob path, and not in the DOM RequestInit types.
            ...(multipart.isStreamed ? { duplex: 'half' } : {}),
        } as RequestInit & { timeout?: number },
        // A stream can only be read once, so a retry would resend an empty
        // body. Blob-backed uploads stay replayable and keep the default.
        ...(multipart.isStreamed ? { retryConfig: { retries: 0 } } : {}),
        customFetch,
    })

    return camelCaseKeys(response.data)
}
