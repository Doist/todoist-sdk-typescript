import type { CustomFetchResponse, FileResponse } from '../types/http'
import { headersToRecord } from './headers'

type AnyResponse = CustomFetchResponse | Response

/**
 * Wraps either a native `Response` or a `CustomFetchResponse` into the SDK's
 * `FileResponse` shape (binary endpoints: `viewAttachment`, `downloadBackup`).
 *
 * `arrayBuffer()` is resolved lazily. A customFetch implementation that omits
 * `arrayBuffer()` is still valid for callers that only read `text()`/`json()`;
 * the descriptive error is thrown only if the caller actually requests binary
 * bytes. This avoids the lossy `text()` → `TextEncoder` round-trip that
 * corrupts non-UTF-8 bytes (every `0x80`-`0xFF` byte not part of a valid UTF-8
 * sequence is replaced with `U+FFFD`).
 */
export function wrapAsFileResponse(
    response: AnyResponse,
    context: 'viewAttachment' | 'downloadBackup',
): FileResponse {
    const headers =
        response.headers instanceof Headers ? headersToRecord(response.headers) : response.headers

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        text: () => response.text(),
        json: () => response.json(),
        arrayBuffer: () => {
            if (typeof response.arrayBuffer !== 'function') {
                throw new Error(
                    `customFetch response must implement arrayBuffer() for ${context} (binary endpoint); reading the body via text() corrupts non-UTF-8 bytes`,
                )
            }
            return response.arrayBuffer()
        },
    }
}
