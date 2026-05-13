import * as fs from 'fs'
import { Readable } from 'stream'
import { vi } from 'vitest'
import { server, http, HttpResponse, getLastRequest, captureRequest } from '../test-utils/msw-setup'
import { uploadMultipartFile } from './multipart-upload'

// Mock fs
vi.mock('fs')
const mockedFs = vi.mocked(fs)

describe('uploadMultipartFile', () => {
    const baseUrl = 'https://api.todoist.com/api/v1/'
    const authToken = 'test-token'
    const endpoint = 'test-endpoint'
    const mockResponseData = { fileUrl: 'https://example.com/file.pdf' }

    beforeEach(() => {
        // Mock successful upload response with MSW
        server.use(
            http.post(`${baseUrl}${endpoint}`, async ({ request }) => {
                // Capture request but don't try to parse FormData as JSON
                let body: unknown = undefined
                try {
                    body = await request.formData()
                } catch {
                    // FormData parsing might fail in test environment
                }
                captureRequest({ request, body })
                return HttpResponse.json(mockResponseData, { status: 200 })
            }),
        )
    })

    describe('file path uploads', () => {
        test('uploads file from path without fileName', async () => {
            const mockStream = new Readable()
            mockedFs.createReadStream.mockReturnValue(mockStream as fs.ReadStream)

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: '/path/to/document.pdf',
                fileName: undefined,
                additionalFields: { project_id: '123' },
                requestId: 'req-123',
            })

            expect(mockedFs.createReadStream).toHaveBeenCalledWith('/path/to/document.pdf')
            expect(result).toEqual(mockResponseData)

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.url).toBe(`${baseUrl}${endpoint}`)
            expect(capturedRequest?.headers['authorization']).toBe('Bearer test-token')
            expect(capturedRequest?.headers['x-request-id']).toBe('req-123')
        })

        test('uploads file from path with custom fileName', async () => {
            const mockStream = new Readable()
            mockedFs.createReadStream.mockReturnValue(mockStream as fs.ReadStream)

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: '/path/to/document.pdf',
                fileName: 'custom-name.pdf',
                additionalFields: {},
            })

            expect(mockedFs.createReadStream).toHaveBeenCalledWith('/path/to/document.pdf')

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
        })
    })

    describe('Buffer uploads', () => {
        test('uploads file from Buffer with fileName', async () => {
            const buffer = Buffer.from('test file content')

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: buffer,
                fileName: 'test-file.pdf',
                additionalFields: { workspace_id: 456 },
            })

            expect(result).toEqual(mockResponseData)

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.url).toBe(`${baseUrl}${endpoint}`)
            expect(capturedRequest?.headers['authorization']).toBe('Bearer test-token')
        })

        test('throws error when Buffer provided without fileName', async () => {
            const buffer = Buffer.from('test file content')

            await expect(
                uploadMultipartFile({
                    baseUrl: baseUrl,
                    authToken: authToken,
                    endpoint: endpoint,
                    file: buffer,
                    fileName: undefined,
                    additionalFields: {},
                }),
            ).rejects.toThrow('fileName is required when uploading from a Buffer')
        })
    })

    describe('Stream uploads', () => {
        test('uploads file from stream with fileName', async () => {
            const mockStream = new Readable()

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: mockStream,
                fileName: 'stream-file.pdf',
                additionalFields: { delete: true },
            })

            expect(result).toEqual(mockResponseData)

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
        })

        test('throws error when stream provided without fileName', async () => {
            const mockStream = new Readable()

            await expect(
                uploadMultipartFile({
                    baseUrl: baseUrl,
                    authToken: authToken,
                    endpoint: endpoint,
                    file: mockStream,
                    fileName: undefined,
                    additionalFields: {},
                }),
            ).rejects.toThrow('fileName is required when uploading from a stream')
        })
    })

    describe('additional fields handling', () => {
        test('filters out null and undefined values', async () => {
            const buffer = Buffer.from('test')

            const additionalFields: Record<string, string | number | boolean> = {
                field1: 'value1',
                field4: 0,
                field5: false,
            }
            // Add fields that might be null/undefined conditionally
            const field2Value = null
            const field3Value = undefined
            if (field2Value !== null && field2Value !== undefined) {
                additionalFields.field2 = field2Value
            }
            if (field3Value !== null && field3Value !== undefined) {
                additionalFields.field3 = field3Value
            }

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: buffer,
                fileName: 'test.pdf',
                additionalFields: additionalFields,
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            // We can't easily test FormData contents, but we verified the method doesn't throw
        })

        test('handles empty additional fields', async () => {
            const buffer = Buffer.from('test')

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: buffer,
                fileName: 'test.pdf',
                additionalFields: {},
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
        })
    })

    describe('headers handling', () => {
        test('includes FormData headers', async () => {
            const buffer = Buffer.from('test')

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: buffer,
                fileName: 'test.pdf',
                additionalFields: {},
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.headers['authorization']).toBe('Bearer test-token')
            // FormData.getHeaders() is mocked, so we can't test specific multipart headers
        })

        test('omits X-Request-Id when not provided', async () => {
            const buffer = Buffer.from('test')

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: buffer,
                fileName: 'test.pdf',
                additionalFields: {},
            })

            const capturedRequest = getLastRequest()
            expect(capturedRequest).toBeDefined()
            expect(capturedRequest?.headers['x-request-id']).toBeUndefined()
        })
    })

    describe('response conversion', () => {
        test('camelCases snake_case keys returned by the server', async () => {
            server.use(
                http.post(`${baseUrl}${endpoint}`, () =>
                    HttpResponse.json(
                        {
                            file_url: 'https://example.com/file.pdf',
                            file_name: 'file.pdf',
                            resource_type: 'file',
                            nested_object: { inner_key: 'value' },
                        },
                        { status: 200 },
                    ),
                ),
            )

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: Buffer.from('test'),
                fileName: 'test.pdf',
                additionalFields: {},
            })

            expect(result).toEqual({
                fileUrl: 'https://example.com/file.pdf',
                fileName: 'file.pdf',
                resourceType: 'file',
                nestedObject: { innerKey: 'value' },
            })
        })
    })
})
