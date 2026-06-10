import * as fs from 'fs'
import { Readable } from 'stream'
import { vi } from 'vitest'
import { getSyncBaseUri } from './consts/endpoints'
import { server, http, HttpResponse, getLastRequest, captureRequest } from './test-utils/msw-setup'
import { TodoistApi } from './todoist-api'
import { snakeCaseKeys } from './utils/case-conversion'

// Mock fs
vi.mock('fs')
const mockedFs = vi.mocked(fs)

describe('TodoistApi uploads', () => {
    describe('uploadFile', () => {
        const mockUploadResult = {
            fileUrl: 'https://files.todoist.com/uploads/test-file.pdf',
            fileName: 'test-file.pdf',
            fileSize: 1024,
            fileType: 'application/pdf',
            resourceType: 'file',
            uploadState: 'completed' as const,
            image: null,
            imageWidth: null,
            imageHeight: null,
        }

        beforeEach(() => {
            // Mock successful upload response with MSW
            server.use(
                http.post(`${getSyncBaseUri()}uploads`, async ({ request }) => {
                    let body: unknown = undefined
                    try {
                        body = await request.formData()
                    } catch {
                        // FormData parsing might fail in test environment
                    }
                    captureRequest({ request, body })
                    return HttpResponse.json(snakeCaseKeys(mockUploadResult), { status: 200 })
                }),
            )
        })

        test('uploads file from Buffer with fileName', async () => {
            const api = new TodoistApi('token')
            const buffer = Buffer.from('test file content')

            const result = await api.uploadFile({
                file: buffer,
                fileName: 'test-file.pdf',
                projectId: '12345',
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.url).toBe(`${getSyncBaseUri()}uploads`)
            expect(capturedRequest?.headers['authorization']).toBe('Bearer token')
            expect(result).toEqual(mockUploadResult)
        })

        test('uploads file from file path', async () => {
            const mockStream = new Readable()
            mockedFs.createReadStream.mockReturnValue(mockStream as fs.ReadStream)

            const api = new TodoistApi('token')

            const result = await api.uploadFile({
                file: '/path/to/document.pdf',
                projectId: '12345',
            })

            expect(mockedFs.createReadStream).toHaveBeenCalledWith('/path/to/document.pdf')

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(result).toEqual(mockUploadResult)
        })

        test('uploads file from file path with custom fileName', async () => {
            const mockStream = new Readable()
            mockedFs.createReadStream.mockReturnValue(mockStream as fs.ReadStream)

            const api = new TodoistApi('token')

            await api.uploadFile({
                file: '/path/to/document.pdf',
                fileName: 'custom-name.pdf',
            })

            expect(mockedFs.createReadStream).toHaveBeenCalledWith('/path/to/document.pdf')

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
        })

        test('uploads file from stream with fileName', async () => {
            const mockStream = new Readable()
            const api = new TodoistApi('token')

            await api.uploadFile({
                file: mockStream,
                fileName: 'stream-file.pdf',
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
        })

        test.each([
            {
                description: 'Buffer',
                file: Buffer.from('test file content'),
                expectedError: 'fileName is required when uploading from a Buffer',
            },
            {
                description: 'stream',
                file: new Readable(),
                expectedError: 'fileName is required when uploading from a stream',
            },
        ])(
            'throws error when $description provided without fileName',
            async ({ file, expectedError }) => {
                const api = new TodoistApi('token')

                await expect(
                    api.uploadFile({
                        file,
                    }),
                ).rejects.toThrow(expectedError)
            },
        )

        test('uploads file with requestId', async () => {
            const api = new TodoistApi('token')
            const buffer = Buffer.from('test file content')
            const requestId = 'test-request-id'

            await api.uploadFile(
                {
                    file: buffer,
                    fileName: 'test.pdf',
                },
                requestId,
            )

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.headers['x-request-id']).toBe(requestId)
        })

        test('uploads file without projectId', async () => {
            const api = new TodoistApi('token')
            const buffer = Buffer.from('test file content')

            await api.uploadFile({
                file: buffer,
                fileName: 'test.pdf',
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
        })
    })

    describe('deleteUpload', () => {
        test('deletes upload successfully', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}uploads`, async ({ request }) => {
                    let body: unknown = undefined
                    try {
                        body = await request.json()
                    } catch {
                        // Might not have a body
                    }
                    captureRequest({ request, body })
                    return HttpResponse.json('ok', { status: 200 })
                }),
            )

            const api = new TodoistApi('token')

            const result = await api.deleteUpload({
                fileUrl: 'https://files.todoist.com/uploads/test-file.pdf',
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.method).toBe('DELETE')
            expect(capturedRequest?.headers['authorization']).toBe('Bearer token')
            expect(capturedRequest?.body).toEqual({
                file_url: 'https://files.todoist.com/uploads/test-file.pdf',
            })
            expect(result).toBe(true)
        })

        test('deletes upload with requestId', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}uploads`, async ({ request }) => {
                    let body: unknown = undefined
                    try {
                        body = await request.json()
                    } catch {
                        // Might not have a body
                    }
                    captureRequest({ request, body })
                    return HttpResponse.json('ok', { status: 200 })
                }),
            )

            const api = new TodoistApi('token')
            const requestId = 'test-request-id'

            const result = await api.deleteUpload(
                {
                    fileUrl: 'https://files.todoist.com/uploads/test-file.pdf',
                },
                requestId,
            )

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.method).toBe('DELETE')
            expect(capturedRequest?.headers['authorization']).toBe('Bearer token')
            expect(capturedRequest?.headers['x-request-id']).toBe(requestId)
            expect(capturedRequest?.body).toEqual({
                file_url: 'https://files.todoist.com/uploads/test-file.pdf',
            })
            expect(result).toBe(true)
        })
    })
})
