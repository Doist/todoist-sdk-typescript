import * as fs from 'fs'
import { Readable } from 'stream'
import { vi } from 'vitest'
import { captureRequest, getLastRequest, http, HttpResponse, server } from '../test-utils/msw-setup'
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

    /**
     * Captures the encoded request body rather than a parsed `FormData`.
     *
     * The body has to be asserted as bytes: a `FormData` body is only encoded
     * by the `fetch` that owns that `FormData` class, and the SDK dispatches
     * through undici's own `fetch`. A body built from the global `FormData`
     * therefore arrives as the literal string "[object FormData]" with no file
     * in it, and a `request.formData()` assertion cannot tell the difference.
     */
    function captureRawBody() {
        let rawBody: string | undefined
        let contentType: string | undefined
        server.use(
            http.post(`${baseUrl}${endpoint}`, async ({ request }) => {
                contentType = request.headers.get('content-type') ?? undefined
                rawBody = await request.text()
                return HttpResponse.json(mockResponseData, { status: 200 })
            }),
        )
        return {
            getRawBody: () => rawBody ?? '',
            getContentType: () => contentType ?? '',
            getBoundary: () => /boundary=(.+)$/.exec(contentType ?? '')?.[1],
        }
    }

    /** Asserts the body is a well-formed multipart payload carrying the file. */
    function expectMultipart(
        captured: ReturnType<typeof captureRawBody>,
        expected: { fileName: string; contentType: string; contents: string },
    ) {
        const boundary = captured.getBoundary()
        expect(boundary).toBeDefined()

        const rawBody = captured.getRawBody()
        expect(rawBody).not.toBe('[object FormData]')
        expect(rawBody).toContain(`--${boundary}`)
        expect(rawBody).toContain(`name="file"; filename="${expected.fileName}"`)
        expect(rawBody).toContain(`Content-Type: ${expected.contentType}`)
        expect(rawBody).toContain(expected.contents)
        expect(rawBody).toContain(`--${boundary}--`)
    }

    describe('file path uploads', () => {
        test('uploads file from path without fileName', async () => {
            mockedFs.openAsBlob.mockResolvedValue(new Blob(['on-disk-contents']))
            const captured = captureRawBody()

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: '/path/to/document.pdf',
                fileName: undefined,
                additionalFields: { project_id: '123' },
                requestId: 'req-123',
            })

            // Read lazily off disk rather than buffered into memory.
            expect(mockedFs.openAsBlob).toHaveBeenCalledWith('/path/to/document.pdf')
            expect(result).toEqual(mockResponseData)

            expectMultipart(captured, {
                fileName: 'document.pdf',
                contentType: 'application/octet-stream',
                contents: 'on-disk-contents',
            })
            expect(captured.getRawBody()).toContain('name="project_id"')
        })

        test('uploads file from path with custom fileName', async () => {
            mockedFs.openAsBlob.mockResolvedValue(new Blob(['on-disk-contents']))
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: '/path/to/document.pdf',
                fileName: 'custom-name.pdf',
                additionalFields: {},
            })

            expect(mockedFs.openAsBlob).toHaveBeenCalledWith('/path/to/document.pdf')
            expectMultipart(captured, {
                fileName: 'custom-name.pdf',
                contentType: 'application/octet-stream',
                contents: 'on-disk-contents',
            })
        })
    })

    describe('Buffer uploads', () => {
        test('uploads file from Buffer with fileName', async () => {
            const captured = captureRawBody()

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: Buffer.from('test file content'),
                fileName: 'test-file.png',
                additionalFields: { workspace_id: 456 },
            })

            expect(result).toEqual(mockResponseData)
            expectMultipart(captured, {
                fileName: 'test-file.png',
                contentType: 'image/png',
                contents: 'test file content',
            })
            expect(captured.getRawBody()).toContain('name="workspace_id"')
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
            const captured = captureRawBody()

            const result = await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: Readable.from([Buffer.from('streamed-'), Buffer.from('contents')]),
                fileName: 'stream-file.pdf',
                additionalFields: { delete: true },
            })

            expect(result).toEqual(mockResponseData)
            expectMultipart(captured, {
                fileName: 'stream-file.pdf',
                contentType: 'application/octet-stream',
                contents: 'streamed-contents',
            })
            expect(captured.getRawBody()).toContain('name="delete"')
        })

        test('accepts a stream that yields strings', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: Readable.from(['string-chunk']),
                fileName: 'stream-file.pdf',
                additionalFields: {},
            })

            expect(captured.getRawBody()).toContain('string-chunk')
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

    describe('Blob uploads', () => {
        test('encodes a Blob as a real multipart body', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: new Blob(['file-contents'], { type: 'image/png' }),
                fileName: 'screenshot.png',
                additionalFields: { project_id: '123' },
            })

            expectMultipart(captured, {
                fileName: 'screenshot.png',
                contentType: 'image/png',
                contents: 'file-contents',
            })
            expect(captured.getRawBody()).toContain('name="project_id"')
        })

        test('falls back to the file name for the part content type', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: new Blob(['file-contents']),
                fileName: 'photo.jpg',
                additionalFields: {},
            })

            expect(captured.getRawBody()).toContain('Content-Type: image/jpeg')
        })

        test('uses the File name when no fileName is given', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: new File(['file-contents'], 'from-file-object.png', { type: 'image/png' }),
                fileName: undefined,
                additionalFields: {},
            })

            expect(captured.getRawBody()).toContain('filename="from-file-object.png"')
        })

        test('escapes quotes in the file name', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: new Blob(['file-contents']),
                fileName: 'we"ird.png',
                additionalFields: {},
            })

            expect(captured.getRawBody()).toContain('filename="we%22ird.png"')
        })
    })

    describe('additional fields handling', () => {
        test('filters out null and undefined values', async () => {
            const captured = captureRawBody()

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
                file: Buffer.from('test'),
                fileName: 'test.pdf',
                additionalFields: additionalFields,
            })

            const rawBody = captured.getRawBody()
            expect(rawBody).toContain('name="field1"')
            // Falsy values are still values and must survive.
            expect(rawBody).toContain('name="field4"')
            expect(rawBody).toContain('name="field5"')
            expect(rawBody).not.toContain('name="field2"')
            expect(rawBody).not.toContain('name="field3"')
        })

        test('handles empty additional fields', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: Buffer.from('test'),
                fileName: 'test.pdf',
                additionalFields: {},
            })

            const boundary = captured.getBoundary()
            expect(captured.getRawBody()).toContain(`--${boundary}--`)
        })
    })

    describe('headers handling', () => {
        test('sets the multipart content type with our own boundary', async () => {
            const captured = captureRawBody()

            await uploadMultipartFile({
                baseUrl: baseUrl,
                authToken: authToken,
                endpoint: endpoint,
                file: Buffer.from('test'),
                fileName: 'test.pdf',
                additionalFields: {},
            })

            // The boundary is ours, so it has to be declared explicitly —
            // `fetch` only fills this in for a `FormData` body.
            expect(captured.getContentType()).toMatch(
                /^multipart\/form-data; boundary=----todoist-sdk-/,
            )
        })

        test('includes the auth header', async () => {
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
