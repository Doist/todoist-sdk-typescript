import { vi } from 'vitest'
import { TodoistApi } from '.'
import { getSyncBaseUri } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN } from './test-utils/test-defaults'
import type { CustomFetchResponse } from './types/http'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi backups endpoints', () => {
    describe('getBackups', () => {
        test('returns backups from rest client', async () => {
            const mockResponse = [
                { version: '2025-02-13 02:03', url: 'https://example.com/backup1.zip' },
                { version: '2025-02-12 02:03', url: 'https://example.com/backup2.zip' },
            ]
            server.use(
                http.get(`${getSyncBaseUri()}backups`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getBackups()

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({
                version: '2025-02-13 02:03',
                url: 'https://example.com/backup1.zip',
            })
        })
    })

    describe('downloadBackup', () => {
        test('returns file response from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}backups/download`, () => {
                    return new HttpResponse('binary-content', { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.downloadBackup({ file: 'backup123.zip' })

            expect(result.ok).toBe(true)
            expect(result.status).toBe(200)
            const text = await result.text()
            expect(text).toBe('binary-content')
        })

        test('returns binary arrayBuffer from custom fetch byte-for-byte', async () => {
            // ZIP magic bytes — includes 0x90 which would be corrupted by a UTF-8 text round-trip
            const binaryBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x90])
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/zip' },
                text: () => Promise.resolve(''),
                json: () => Promise.resolve({}),
                arrayBuffer: () => Promise.resolve(binaryBytes.buffer),
            })

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, { customFetch: mockCustomFetch })
            const result = await api.downloadBackup({ file: 'backup123.zip' })
            const buffer = await result.arrayBuffer()

            expect(new Uint8Array(buffer)).toEqual(binaryBytes)
        })

        test('throws only when arrayBuffer() is called on a custom fetch lacking it', async () => {
            const mockCustomFetch =
                vi.fn<(url: string, init?: RequestInit) => Promise<CustomFetchResponse>>()
            mockCustomFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/zip' },
                text: () => Promise.resolve(''),
                json: () => Promise.resolve({}),
                // no arrayBuffer
            })

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, { customFetch: mockCustomFetch })
            const result = await api.downloadBackup({ file: 'backup123.zip' })

            expect(() => result.arrayBuffer()).toThrow(
                /customFetch response must implement arrayBuffer\(\) for downloadBackup/,
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

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, { customFetch: mockCustomFetch })

            await expect(api.downloadBackup({ file: 'backup123.zip' })).rejects.toThrow(
                'Failed to download backup: 404 Not Found',
            )
        })
    })
})

describe('TodoistApi email forwarding endpoints', () => {
    describe('getOrCreateEmailForwarding', () => {
        test('returns email from rest client', async () => {
            const mockResponse = { email: 'forward+123@todoist.com' }
            server.use(
                http.put(`${getSyncBaseUri()}emails`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getOrCreateEmailForwarding({
                objType: 'project',
                objId: '123',
            })

            expect(result.email).toBe('forward+123@todoist.com')
        })
    })

    describe('disableEmailForwarding', () => {
        test('returns success from rest client', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}emails`, () => {
                    return HttpResponse.json({ status: 'ok' }, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.disableEmailForwarding({
                objType: 'project',
                objId: '123',
            })

            expect(result).toBe(true)
        })
    })
})

describe('TodoistApi ID mapping endpoints', () => {
    describe('getIdMappings', () => {
        test('returns ID mappings from rest client', async () => {
            const mockResponse = [
                { old_id: '918273645', new_id: '6VfWjjjFg2xqX6Pa' },
                { old_id: null, new_id: '6WMVPf8Hm8JP6mC8' },
            ]
            server.use(
                http.get(`${getSyncBaseUri()}id_mappings/tasks/abc,def`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getIdMappings({
                objName: 'tasks',
                objIds: ['abc', 'def'],
            })

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({
                oldId: '918273645',
                newId: '6VfWjjjFg2xqX6Pa',
            })
            expect(result[1].oldId).toBeNull()
        })
    })

    describe('getMovedIds', () => {
        test('returns moved IDs from rest client', async () => {
            const mockResponse = [{ old_id: '6WMVPf8Hm8JP6mC8', new_id: '6WMVPf8Hm8JP6mFx' }]
            server.use(
                http.get(`${getSyncBaseUri()}moved_ids/sections`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getMovedIds({ objName: 'sections' })

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                oldId: '6WMVPf8Hm8JP6mC8',
                newId: '6WMVPf8Hm8JP6mFx',
            })
        })
    })
})
