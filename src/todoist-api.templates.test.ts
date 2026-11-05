import { vi } from 'vitest'
import { TodoistApi } from '.'
import { getSyncBaseUri } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN, DEFAULT_SECTION, DEFAULT_TASK } from './test-utils/test-defaults'
import { uploadMultipartFile } from './utils/multipart-upload'

// Mock the multipart upload helper
vi.mock('./utils/multipart-upload')
const mockedUploadMultipartFile = vi.mocked(uploadMultipartFile)

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi template endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('exportTemplateAsFile', () => {
        test('returns file content from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}templates/file`, () => {
                    return HttpResponse.json('task,priority\nBuy milk,4', {
                        status: 200,
                    })
                }),
            )
            const api = getTarget()

            const result = await api.exportTemplateAsFile({ projectId: '123' })

            expect(result).toBe('task,priority\nBuy milk,4')
        })
    })

    describe('exportTemplateAsUrl', () => {
        test('returns file URL from rest client', async () => {
            const mockResponse = {
                file_name: 'template.csv',
                file_url: 'https://example.com/template.csv',
            }
            server.use(
                http.get(`${getSyncBaseUri()}templates/url`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.exportTemplateAsUrl({ projectId: '123' })

            expect(result).toMatchObject({
                fileName: 'template.csv',
                fileUrl: 'https://example.com/template.csv',
            })
        })
    })

    describe('createProjectFromCSV', () => {
        test('uploads file and returns validated response', async () => {
            mockedUploadMultipartFile.mockResolvedValue({
                status: 'ok',
                project_id: 'proj_123',
                template_type: 'project',
                projects: [],
                sections: [DEFAULT_SECTION],
                tasks: [DEFAULT_TASK],
                comments: [],
            })

            const api = getTarget()
            const result = await api.createProjectFromCSV({
                name: 'New Project',
                file: Buffer.from('template content'),
                fileName: 'template.csv',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'projects/import',
                    additionalFields: { name: 'New Project' },
                }),
            )
            expect(result.status).toBe('ok')
            expect(result.sections).toHaveLength(1)
            expect(result.tasks).toHaveLength(1)
        })

        test('includes workspaceId when provided', async () => {
            mockedUploadMultipartFile.mockResolvedValue({
                status: 'ok',
                project_id: 'proj_123',
                template_type: 'project',
                projects: [],
                sections: [],
                tasks: [],
                comments: [],
            })

            const api = getTarget()
            await api.createProjectFromCSV({
                name: 'Workspace Project',
                file: Buffer.from('content'),
                fileName: 'template.csv',
                workspaceId: 'ws_456',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    additionalFields: { name: 'Workspace Project', workspace_id: 'ws_456' },
                }),
            )
        })
    })

    describe('importCSVIntoProject', () => {
        test('uploads file and returns validated response', async () => {
            mockedUploadMultipartFile.mockResolvedValue({
                status: 'ok',
                template_type: 'project',
                projects: [],
                sections: [],
                tasks: [DEFAULT_TASK],
                comments: [],
            })

            const api = getTarget()
            const result = await api.importCSVIntoProject({
                projectId: 'proj_123',
                file: Buffer.from('template content'),
                fileName: 'template.csv',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'projects/proj_123/import',
                    additionalFields: {},
                }),
            )
            expect(result.status).toBe('ok')
            expect(result.tasks).toHaveLength(1)
        })

        test('rejects an empty project ID before uploading', async () => {
            const api = getTarget()

            await expect(
                api.importCSVIntoProject({ projectId: '', file: Buffer.from('content') }),
            ).rejects.toThrow()
            expect(mockedUploadMultipartFile).not.toHaveBeenCalled()
        })
    })

    describe('importTemplateFromId', () => {
        test('posts to the project and keeps the project ID out of the body', async () => {
            const mockResponse = {
                status: 'ok',
                template_type: 'project',
                projects: [],
                sections: [],
                tasks: [],
                comments: [],
                project_notes: [],
            }
            let body: unknown
            server.use(
                http.post(
                    `${getSyncBaseUri()}projects/123/import_template`,
                    async ({ request }) => {
                        body = await request.json()
                        return HttpResponse.json(mockResponse, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const result = await api.importTemplateFromId({
                projectId: '123',
                templateId: 'product-launch',
                locale: 'de',
            })

            expect(body).toEqual({ template_id: 'product-launch', locale: 'de' })
            expect(result.status).toBe('ok')
            expect(result.templateType).toBe('project')
            expect(result.tasks).toEqual([])
            expect(result.sections).toEqual([])
        })
    })
})
