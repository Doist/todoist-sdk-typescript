import { v4 as uuidv4 } from 'uuid'
import { API_BASE_URI } from '../consts/endpoints'
import { TodoistRequestError } from '../types/errors'
import type { CustomFetch, CustomHeaders, HttpMethod, HttpResponse } from '../types/http'
import { isHttpError, isNetworkError } from '../types/http'
import { camelCaseKeys, snakeCaseKeys } from '../utils/case-conversion'
import { mergeHeaders, resolveCustomHeaders } from '../utils/headers'
import { fetchWithRetry } from './fetch-with-retry'

type GetTodoistRequestErrorArgs = {
    error: Error
    originalStack?: Error
}

type GetRequestConfigurationArgs = {
    baseURL: string
    apiToken?: string
    requestId?: string
    customHeaders?: CustomHeaders
}

type GetHttpClientArgs = {
    baseURL: string
    apiToken?: string
    requestId?: string
    customHeaders?: CustomHeaders
}

type RequestArgs = {
    httpMethod: HttpMethod
    baseUri: string
    relativePath: string
    apiToken?: string
    payload?: Record<string, unknown>
    requestId?: string
    hasSyncCommands?: boolean
    customHeaders?: CustomHeaders
    customFetch?: CustomFetch
    /** Top-level response fields whose map keys are identifiers, left out of camel-casing. */
    opaqueKeyMaps?: ReadonlySet<string>
}

export function paramsSerializer(params: Record<string, unknown>) {
    const qs = new URLSearchParams()

    Object.keys(params).forEach((key) => {
        const value = params[key]
        if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
                qs.append(key, JSON.stringify(value))
            } else if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                qs.append(key, String(value))
            } else {
                qs.append(key, JSON.stringify(value))
            }
        }
    })

    return qs.toString()
}

const defaultHeaders = {
    'Content-Type': 'application/json',
}

function getAuthHeader(apiKey: string) {
    return `Bearer ${apiKey}`
}

function getRetryDelay(retryCount: number) {
    return retryCount === 1 ? 0 : 500
}

function getTodoistRequestError(args: GetTodoistRequestErrorArgs): TodoistRequestError {
    const { error, originalStack } = args
    const requestError = new TodoistRequestError(error.message)

    requestError.stack = originalStack ? originalStack.stack : error.stack

    if (isHttpError(error)) {
        requestError.httpStatusCode = error.status
        requestError.responseData = error.data
    }

    return requestError
}

/**
 * Normalises anything thrown while making an API request into the error a
 * caller should see: a `TodoistRequestError` (carrying the HTTP status and
 * response body when there is one) reported against `originalStack`, or a
 * generic `Error` when the thrown value isn't an `Error` at all.
 */
export function toTodoistRequestError(error: unknown, originalStack?: Error): Error {
    if (!(error instanceof Error)) {
        return new Error('An unknown error occurred during the request')
    }

    return getTodoistRequestError({ error, originalStack })
}

function getRequestConfiguration(args: GetRequestConfigurationArgs) {
    const { baseURL, apiToken, requestId, customHeaders } = args
    const authHeader = apiToken ? { Authorization: getAuthHeader(apiToken) } : undefined
    const requestIdHeader = requestId ? { 'X-Request-Id': requestId } : undefined
    // Custom headers sit below auth and request id so they can never replace them.
    const headers = mergeHeaders(
        defaultHeaders,
        resolveCustomHeaders(customHeaders),
        authHeader,
        requestIdHeader,
    )

    return { baseURL, headers }
}

function getHttpClientConfig(args: GetHttpClientArgs) {
    const { baseURL, apiToken, requestId, customHeaders } = args
    const configuration = getRequestConfiguration({ baseURL, apiToken, requestId, customHeaders })

    return {
        ...configuration,
        timeout: 30000, // 30 second timeout
        retry: {
            retries: 3,
            retryCondition: isNetworkError,
            retryDelay: getRetryDelay,
        },
    }
}

export function isSuccess(response: HttpResponse): boolean {
    return response.status >= 200 && response.status < 300
}

export async function request<T>(args: RequestArgs): Promise<HttpResponse<T>> {
    const {
        httpMethod,
        baseUri,
        relativePath,
        apiToken,
        payload,
        requestId: initialRequestId,
        hasSyncCommands,
        customHeaders,
        customFetch,
        opaqueKeyMaps,
    } = args

    // Capture original stack for better error reporting
    const originalStack = new Error()

    try {
        let requestId = initialRequestId
        // Sync api don't allow a request id in the CORS
        if (httpMethod === 'POST' && !requestId && !baseUri.includes(API_BASE_URI)) {
            requestId = uuidv4()
        }

        const config = getHttpClientConfig({ baseURL: baseUri, apiToken, requestId, customHeaders })
        const url = `${baseUri}${relativePath}`

        const fetchOptions: RequestInit & { timeout?: number } = {
            method: httpMethod,
            headers: config.headers,
            timeout: config.timeout,
        }

        let finalUrl = url

        switch (httpMethod) {
            case 'GET':
                // For GET requests, add query parameters to URL
                if (payload) {
                    // Convert payload from camelCase to snake_case
                    const convertedPayload = snakeCaseKeys(payload)
                    const queryString = paramsSerializer(convertedPayload)
                    if (queryString) {
                        const separator = url.includes('?') ? '&' : '?'
                        finalUrl = `${url}${separator}${queryString}`
                    }
                }
                break
            case 'POST':
            case 'PUT':
            case 'PATCH':
            case 'DELETE': {
                // Convert payload from camelCase to snake_case
                // Note: While DELETE with body is uncommon, the Todoist API uses it for some endpoints
                if (payload) {
                    const convertedPayload = snakeCaseKeys(payload)
                    const body = hasSyncCommands
                        ? JSON.stringify(convertedPayload)
                        : JSON.stringify(convertedPayload)

                    fetchOptions.body = body
                }
                break
            }
        }

        // Make the request
        const response = await fetchWithRetry<T>({
            url: finalUrl,
            options: fetchOptions,
            retryConfig: config.retry,
            customFetch,
        })

        // Convert snake_case response to camelCase
        const convertedData = camelCaseKeys(response.data, { opaqueKeyMaps })
        return { ...response, data: convertedData }
    } catch (error: unknown) {
        throw toTodoistRequestError(error, originalStack)
    }
}
