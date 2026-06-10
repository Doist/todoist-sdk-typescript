import { vi } from 'vitest'
import { server, http, HttpResponse, getLastRequest, captureRequest } from './test-utils/msw-setup'
import { TodoistApi } from './todoist-api'
import type { Comment } from './types/comments'
import type { CustomFetchResponse } from './types/http'

const FILE_URL = 'https://files.todoist.com/user_upload/v2/123/file.png'

function createMockComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: 'comment-1',
        content: 'Check this out',
        postedAt: new Date('2024-01-01T00:00:00Z'),
        postedUid: 'user-1',
        taskId: 'task-1',
        projectId: undefined,
        uidsToNotify: null,
        reactions: null,
        isDeleted: false,
        fileAttachment: {
            resourceType: 'file',
            fileName: 'file.png',
            fileSize: 1024,
            fileType: 'image/png',
            fileUrl: FILE_URL,
            fileDuration: null,
            uploadState: 'completed',
            image: null,
            imageWidth: null,
            imageHeight: null,
            url: null,
            title: null,
        },
        ...overrides,
    }
}

describe('TodoistApi viewAttachment', () => {
    describe('with a URL string', () => {
        test('fetches attachment with authorization header', async () => {
            const imageData = new Uint8Array([137, 80, 78, 71])
            server.use(
                http.get(FILE_URL, ({ request }) => {
                    captureRequest({ request, body: null })
                    return new HttpResponse(imageData, {
                        status: 200,
                        headers: { 'Content-Type': 'image/png' },
                    })
                }),
            )

            const api = new TodoistApi('test-token')
            const response = await api.viewAttachment(FILE_URL)

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.headers['authorization']).toBe('Bearer test-token')
            expect(response.ok).toBe(true)
            expect(response.headers['content-type']).toBe('image/png')
        })

        test('returns response that can be read as ArrayBuffer', async () => {
            const imageData = new Uint8Array([137, 80, 78, 71])
            server.use(
                http.get(FILE_URL, () => {
                    return new HttpResponse(imageData, {
                        status: 200,
                        headers: { 'Content-Type': 'image/png' },
                    })
                }),
            )

            const api = new TodoistApi('test-token')
            const response = await api.viewAttachment(FILE_URL)
            const buffer = await response.arrayBuffer()

            expect(new Uint8Array(buffer)).toEqual(imageData)
        })

        test('returns response that can be read as text', async () => {
            const textContent = 'Hello, world!'
            server.use(
                http.get(FILE_URL, () => {
                    return new HttpResponse(textContent, {
                        status: 200,
                        headers: { 'Content-Type': 'text/plain' },
                    })
                }),
            )

            const api = new TodoistApi('test-token')
            const response = await api.viewAttachment(FILE_URL)
            const text = await response.text()

            expect(text).toBe(textContent)
        })
    })

    describe('with a Comment object', () => {
        test('extracts fileUrl from comment attachment', async () => {
            server.use(
                http.get(FILE_URL, ({ request }) => {
                    captureRequest({ request, body: null })
                    return new HttpResponse('data', { status: 200 })
                }),
            )

            const api = new TodoistApi('test-token')
            const comment = createMockComment()
            const response = await api.viewAttachment(comment)

            const capturedRequest = getLastRequest()
            expect(capturedRequest?.url).toBe(FILE_URL)
            expect(response.ok).toBe(true)
        })

        test('throws when comment has no file attachment', async () => {
            const api = new TodoistApi('test-token')
            const comment = createMockComment({ fileAttachment: null })

            await expect(api.viewAttachment(comment)).rejects.toThrow(
                'Comment does not have a file attachment',
            )
        })

        test('throws when comment attachment has no fileUrl', async () => {
            const api = new TodoistApi('test-token')
            const comment = createMockComment({
                fileAttachment: {
                    resourceType: 'file',
                    fileName: 'file.png',
                    fileUrl: null,
                },
            })

            await expect(api.viewAttachment(comment)).rejects.toThrow(
                'Comment does not have a file attachment',
            )
        })
    })

    describe('URL validation', () => {
        test('allows files.todoist.com URLs', async () => {
            server.use(
                http.get(FILE_URL, () => {
                    return new HttpResponse('data', { status: 200 })
                }),
            )

            const api = new TodoistApi('test-token')
            const response = await api.viewAttachment(FILE_URL)
            expect(response.ok).toBe(true)
        })

        test('allows BunnyCDN URLs without sending the auth token', async () => {
            const url = 'https://todoist.b-cdn.net/uploads/file.png'
            server.use(
                http.get(url, ({ request }) => {
                    captureRequest({ request, body: null })
                    return new HttpResponse('data', { status: 200 })
                }),
            )

            const api = new TodoistApi('test-token')
            const response = await api.viewAttachment(url)

            expect(response.ok).toBe(true)
            expect(getLastRequest()?.headers['authorization']).toBeUndefined()
        })

        test('allows CloudFront URLs without sending the auth token', async () => {
            const url = 'https://d1ysz50cxb9zwl.cloudfront.net/uploads/file.png'
            server.use(
                http.get(url, ({ request }) => {
                    captureRequest({ request, body: null })
                    return new HttpResponse('data', { status: 200 })
                }),
            )

            const api = new TodoistApi('test-token')
            const response = await api.viewAttachment(url)

            expect(response.ok).toBe(true)
            expect(getLastRequest()?.headers['authorization']).toBeUndefined()
        })

        test('rejects api.todoist.com URLs', async () => {
            const api = new TodoistApi('test-token')

            await expect(
                api.viewAttachment('https://api.todoist.com/api/v1/tasks'),
            ).rejects.toThrow('Attachment URLs must be on a known Todoist attachment host')
        })

        test('rejects other todoist.com subdomains', async () => {
            const api = new TodoistApi('test-token')

            await expect(
                api.viewAttachment('https://cdn.todoist.com/uploads/file.png'),
            ).rejects.toThrow('Attachment URLs must be on a known Todoist attachment host')
        })

        test('rejects non-todoist URLs', async () => {
            const api = new TodoistApi('test-token')

            await expect(api.viewAttachment('https://evil.com/steal-token')).rejects.toThrow(
                'Attachment URLs must be on a known Todoist attachment host',
            )
        })

        test('rejects URLs with a known host as a suffix of another domain', async () => {
            const api = new TodoistApi('test-token')

            await expect(
                api.viewAttachment('https://files.todoist.com.evil.com/file.png'),
            ).rejects.toThrow('Attachment URLs must be on a known Todoist attachment host')
        })
    })

    describe('with custom fetch', () => {
        test('uses custom fetch when provided', async () => {
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/plain' },
                text: () => Promise.resolve('custom fetch content'),
                json: () => Promise.resolve({}),
                arrayBuffer: () =>
                    Promise.resolve(new TextEncoder().encode('custom fetch content').buffer),
            })

            const api = new TodoistApi('test-token', { customFetch: mockCustomFetch })
            const response = await api.viewAttachment(FILE_URL)

            expect(mockCustomFetch).toHaveBeenCalledWith(FILE_URL, {
                method: 'GET',
                headers: { Authorization: 'Bearer test-token' },
            })
            expect(await response.text()).toBe('custom fetch content')
        })

        test('returns binary arrayBuffer from custom fetch byte-for-byte', async () => {
            // PNG magic bytes — includes 0x89 which would be corrupted by a UTF-8 text round-trip
            const binaryBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'image/png' },
                text: () => Promise.resolve(''),
                json: () => Promise.resolve({}),
                arrayBuffer: () => Promise.resolve(binaryBytes.buffer),
            })

            const api = new TodoistApi('test-token', { customFetch: mockCustomFetch })
            const response = await api.viewAttachment(FILE_URL)
            const buffer = await response.arrayBuffer()

            expect(new Uint8Array(buffer)).toEqual(binaryBytes)
        })

        test('text-only custom fetch response still works (no arrayBuffer required)', async () => {
            // text-only customFetch impl: lazy arrayBuffer check should not fire for text() callers
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/plain' },
                text: () => Promise.resolve('hello world'),
                json: () => Promise.resolve({}),
                // no arrayBuffer
            })

            const api = new TodoistApi('test-token', { customFetch: mockCustomFetch })
            const response = await api.viewAttachment(FILE_URL)

            expect(await response.text()).toBe('hello world')
        })

        test('throws only when arrayBuffer() is called on a custom fetch lacking it', async () => {
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'image/png' },
                text: () => Promise.resolve(''),
                json: () => Promise.resolve({}),
                // no arrayBuffer
            })

            const api = new TodoistApi('test-token', { customFetch: mockCustomFetch })
            const response = await api.viewAttachment(FILE_URL)

            expect(() => response.arrayBuffer()).toThrow(
                /customFetch response must implement arrayBuffer\(\)/,
            )
        })

        test('throws on error response from custom fetch', async () => {
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: {},
                text: () => Promise.resolve(''),
                json: () => Promise.resolve({}),
            })

            const api = new TodoistApi('test-token', { customFetch: mockCustomFetch })

            await expect(api.viewAttachment(FILE_URL)).rejects.toThrow(
                'Failed to fetch attachment: 404 Not Found',
            )
        })
    })

    describe('error handling', () => {
        test('throws on 404 response', async () => {
            server.use(
                http.get(FILE_URL, () => {
                    return new HttpResponse(null, { status: 404, statusText: 'Not Found' })
                }),
            )

            const api = new TodoistApi('test-token')

            await expect(api.viewAttachment(FILE_URL)).rejects.toThrow(
                'Failed to fetch attachment: 404 Not Found',
            )
        })

        test('throws on 403 response', async () => {
            server.use(
                http.get(FILE_URL, () => {
                    return new HttpResponse(null, { status: 403, statusText: 'Forbidden' })
                }),
            )

            const api = new TodoistApi('test-token')

            await expect(api.viewAttachment(FILE_URL)).rejects.toThrow(
                'Failed to fetch attachment: 403 Forbidden',
            )
        })
    })
})
