import type { Dispatcher } from 'undici'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CustomFetch, CustomFetchResponse } from '../types/http'
import { fetchWithRetry } from './fetch-with-retry'
import * as httpDispatcher from './http-dispatcher'

// This file controls the transport directly, so opt out of the suite-wide
// seam installed in `test-utils/msw-setup.ts`.
vi.unmock('./http-dispatcher')

// A minimal dispatcher for tests that exercise the built-in fetch path with a
// dispatcher present but no paired undici fetch (so the global fetch is used).
function fakeDispatcher(): Dispatcher {
    return { dispatch() {}, close: async () => {} } as unknown as Dispatcher
}

describe('fetchWithRetry', () => {
    const originalFetch = global.fetch

    afterEach(async () => {
        global.fetch = originalFetch
        vi.useRealTimers()
        vi.restoreAllMocks()
        vi.clearAllMocks()
        await httpDispatcher.resetDefaultDispatcherForTests()
    })

    test('uses the default dispatcher when customFetch is not provided', async () => {
        const fetchMock = vi.fn<typeof fetch>()
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
            }),
        )
        global.fetch = fetchMock

        const dispatcher = fakeDispatcher()
        vi.spyOn(httpDispatcher, 'getDefaultTransport').mockResolvedValue({
            dispatcher,
            fetch: undefined,
        })

        const response = await fetchWithRetry<{ ok: boolean }>({
            url: 'https://api.todoist.com/api/v1/tasks',
            options: { method: 'GET' },
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.todoist.com/api/v1/tasks',
            expect.objectContaining({
                method: 'GET',
                dispatcher,
            }),
        )
        expect(response.data).toEqual({ ok: true })
    })

    test('prefers undici’s paired fetch over the global fetch', async () => {
        const globalFetchMock = vi.fn<typeof fetch>()
        global.fetch = globalFetchMock

        const nodeFetch = vi.fn<typeof fetch>()
        nodeFetch.mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
            }),
        )
        const dispatcher = fakeDispatcher()
        vi.spyOn(httpDispatcher, 'getDefaultTransport').mockResolvedValue({
            dispatcher,
            fetch: nodeFetch as unknown as typeof import('undici').fetch,
        })

        const response = await fetchWithRetry<{ ok: boolean }>({
            url: 'https://api.todoist.com/api/v1/tasks',
            options: { method: 'GET' },
        })

        expect(nodeFetch).toHaveBeenCalledWith(
            'https://api.todoist.com/api/v1/tasks',
            expect.objectContaining({ method: 'GET', dispatcher }),
        )
        expect(globalFetchMock).not.toHaveBeenCalled()
        expect(response.data).toEqual({ ok: true })
    })

    test('prefers customFetch over the built-in fetch path', async () => {
        const fetchMock = vi.fn<typeof fetch>()
        global.fetch = fetchMock

        const getDefaultTransportSpy = vi.spyOn(httpDispatcher, 'getDefaultTransport')
        const customFetch = vi.fn<CustomFetch>()
        customFetch.mockResolvedValue(createResponse('{"ok":true}'))

        const response = await fetchWithRetry<{ ok: boolean }>({
            url: 'https://api.todoist.com/api/v1/tasks',
            options: {
                method: 'POST',
                timeout: 1000,
                headers: { 'x-test': '1' },
            },
            customFetch,
        })

        expect(getDefaultTransportSpy).not.toHaveBeenCalled()
        expect(customFetch).toHaveBeenCalledTimes(1)
        expect(customFetch).toHaveBeenCalledWith(
            'https://api.todoist.com/api/v1/tasks',
            expect.objectContaining({
                method: 'POST',
                timeout: 1000,
                headers: { 'x-test': '1' },
            }),
        )
        expect(fetchMock).not.toHaveBeenCalled()
        expect(response.data).toEqual({ ok: true })
    })

    test('retries network errors using the configured retry policy', async () => {
        const customFetch = vi.fn<CustomFetch>()
        customFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(createResponse('{"retried":true}'))

        const response = await fetchWithRetry<{ retried: boolean }>({
            url: 'https://api.todoist.com/api/v1/tasks',
            retryConfig: {
                retries: 2,
                retryDelay: () => 0,
            },
            customFetch,
        })

        expect(customFetch).toHaveBeenCalledTimes(3)
        expect(response.data).toEqual({ retried: true })
    })

    test('retries timeout errors when configured', async () => {
        vi.useFakeTimers()

        const fetchMock = vi.fn<typeof fetch>()
        fetchMock
            .mockImplementationOnce(
                (_url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) =>
                    new Promise<Response>((_resolve, reject) => {
                        options?.signal?.addEventListener(
                            'abort',
                            () => {
                                const reason = options.signal?.reason
                                reject(
                                    reason instanceof Error
                                        ? reason
                                        : new Error(String(reason ?? 'Request aborted')),
                                )
                            },
                            { once: true },
                        )
                    }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    statusText: 'OK',
                }),
            )
        global.fetch = fetchMock

        vi.spyOn(httpDispatcher, 'getDefaultTransport').mockResolvedValue({
            dispatcher: fakeDispatcher(),
            fetch: undefined,
        })

        const requestPromise = fetchWithRetry<{ ok: boolean }>({
            url: 'https://api.todoist.com/api/v1/tasks',
            options: { method: 'GET', timeout: 20 },
            retryConfig: {
                retries: 1,
                retryDelay: () => 0,
            },
        })

        await vi.advanceTimersByTimeAsync(20)

        const response = await requestPromise

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(response.data).toEqual({ ok: true })
    })

    test('aborts built-in fetch requests when the timeout is reached', async () => {
        vi.useFakeTimers()

        const fetchMock = vi.fn<typeof fetch>()
        fetchMock.mockImplementation(
            (_url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) =>
                new Promise<Response>((_resolve, reject) => {
                    options?.signal?.addEventListener(
                        'abort',
                        () => {
                            const reason = options.signal?.reason
                            reject(
                                reason instanceof Error
                                    ? reason
                                    : new Error(String(reason ?? 'Request aborted')),
                            )
                        },
                        { once: true },
                    )
                }),
        )
        global.fetch = fetchMock

        const dispatcher = fakeDispatcher()
        const getDefaultTransportSpy = vi
            .spyOn(httpDispatcher, 'getDefaultTransport')
            .mockResolvedValue({ dispatcher, fetch: undefined })

        const requestPromise = fetchWithRetry({
            url: 'https://api.todoist.com/api/v1/tasks',
            options: { method: 'GET', timeout: 20 },
            retryConfig: { retries: 0 },
        })
        const requestExpectation = expect(requestPromise).rejects.toThrow(
            'Request timeout after 20ms',
        )

        await vi.advanceTimersByTimeAsync(20)

        await requestExpectation

        expect(getDefaultTransportSpy).toHaveBeenCalled()
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.todoist.com/api/v1/tasks',
            expect.objectContaining({
                dispatcher,
                signal: expect.any(AbortSignal),
            }),
        )
    })

    test('returns raw text when the response body is not JSON', async () => {
        const customFetch = vi.fn<CustomFetch>()
        customFetch.mockResolvedValue(createResponse('plain text response'))

        const response = await fetchWithRetry<string>({
            url: 'https://api.todoist.com/api/v1/tasks',
            customFetch,
        })

        expect(response.data).toBe('plain text response')
    })
})

function createResponse(body: string): CustomFetchResponse {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {},
        text: () => Promise.resolve(body),
        json: () => Promise.resolve(JSON.parse(body) as unknown),
    }
}
