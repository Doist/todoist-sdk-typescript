import type { RequestUrlParam, RequestUrlResponse } from 'obsidian'
import type { CustomFetch, CustomFetchResponse } from '../types/http'

/**
 * Creates a CustomFetch adapter for Obsidian's requestUrl API.
 *
 * This adapter bridges the gap between Obsidian's requestUrl interface and the
 * standard fetch-like interface expected by the Todoist API SDK.
 *
 * Key differences handled by this adapter:
 * - Obsidian returns response data as properties (response.json, response.text)
 *   while the SDK expects methods (response.json(), response.text())
 * - Obsidian's requestUrl bypasses CORS restrictions that would block standard fetch
 * - Obsidian throws on HTTP errors by default; we set throw: false to handle manually
 * - Obsidian doesn't provide statusText; we default to empty string
 *
 * @example
 * ```typescript
 * import { requestUrl } from 'obsidian';
 * import { createObsidianFetchAdapter } from './obsidian-fetch-adapter';
 *
 * const api = new TodoistApi('your-token', {
 *   customFetch: createObsidianFetchAdapter(requestUrl)
 * });
 * ```
 *
 * @param requestUrl - The Obsidian requestUrl function
 * @returns A CustomFetch function compatible with the Todoist API SDK
 */
export function createObsidianFetchAdapter(
    requestUrl: (request: RequestUrlParam | string) => Promise<RequestUrlResponse>,
): CustomFetch {
    return async (
        url: string,
        options?: RequestInit & { timeout?: number },
    ): Promise<CustomFetchResponse> => {
        // Build the request parameters in Obsidian's format
        const requestParams: RequestUrlParam = {
            url,
            method: options?.method || 'GET',
            headers: options?.headers as Record<string, string> | undefined,
            body: options?.body as string | ArrayBuffer | undefined,
            throw: false, // Don't throw on HTTP errors; let the SDK handle status codes
        }

        // Make the request using Obsidian's requestUrl
        const response = await requestUrl(requestParams)

        // Transform Obsidian's response format to match CustomFetchResponse interface
        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: '', // Obsidian doesn't provide statusText
            headers: response.headers,
            // Wrap Obsidian's direct properties as methods returning promises
            text: () => Promise.resolve(response.text),
            json: () => Promise.resolve(response.json as unknown),
            arrayBuffer: () => Promise.resolve(response.arrayBuffer),
        }
    }
}
