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

const MOCK_TEMPLATE_API = {
    id: 'product-launch',
    name: 'Product launch',
    template_type: 'project',
    template_source: 'doist',
    short_description: 'Ship faster',
    long_description: 'A reusable checklist for product launches.',
    instructions: null,
    import_url: null,
    view_type: 'list',
    thumbnail_image: null,
    thumbnail_image_dark: null,
    cover_image: null,
    preview_image: null,
    template_color: null,
    background_color: null,
    background_color_dark: null,
    creator: { name: 'Doist', position: 'Team', avatar: '' },
    seo: null,
    more_resources: [],
    category_ids: ['productivity'],
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

    describe('createProjectFromTemplate', () => {
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
            const result = await api.createProjectFromTemplate({
                name: 'New Project',
                file: Buffer.from('template content'),
                fileName: 'template.csv',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'templates/create_project_from_file',
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
            await api.createProjectFromTemplate({
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

    describe('importTemplateIntoProject', () => {
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
            const result = await api.importTemplateIntoProject({
                projectId: 'proj_123',
                file: Buffer.from('template content'),
                fileName: 'template.csv',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'templates/import_into_project_from_file',
                    additionalFields: { project_id: 'proj_123' },
                }),
            )
            expect(result.status).toBe('ok')
            expect(result.tasks).toHaveLength(1)
        })
    })

    describe('getTemplates', () => {
        test('returns validated, camelCased list with pagination metadata', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}templates/list`, () => {
                    return HttpResponse.json(
                        {
                            templates: [MOCK_TEMPLATE_API],
                            count: 1,
                            has_more: true,
                            next_cursor: 'abc',
                        },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const result = await api.getTemplates({ templateType: 'project', limit: 1 })

            expect(result.count).toBe(1)
            expect(result.hasMore).toBe(true)
            expect(result.nextCursor).toBe('abc')
            expect(result.templates).toHaveLength(1)
            expect(result.templates[0]).toMatchObject({
                id: 'product-launch',
                templateType: 'project',
                templateSource: 'doist',
                shortDescription: 'Ship faster',
                categoryIds: ['productivity'],
            })
        })

        test('forwards filter args as snake_case query params', async () => {
            let observedUrl = ''
            server.use(
                http.get(`${getSyncBaseUri()}templates/list`, ({ request }) => {
                    observedUrl = request.url
                    return HttpResponse.json(
                        { templates: [], count: 0, has_more: false },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            await api.getTemplates({
                templateType: 'all',
                templateSource: 'workspace',
                categoryId: 'productivity',
                cursor: 'cur_1',
            })

            expect(observedUrl).toContain('template_type=all')
            expect(observedUrl).toContain('template_source=workspace')
            expect(observedUrl).toContain('category_id=productivity')
            expect(observedUrl).toContain('cursor=cur_1')
        })
    })

    describe('getTemplateCategories', () => {
        test('returns validated categories', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}templates/categories`, () => {
                    return HttpResponse.json(
                        {
                            categories: [
                                {
                                    id: 'productivity',
                                    name: 'Productivity',
                                    description: 'Get things done.',
                                    seo: { title: 'Productivity', description: null },
                                },
                            ],
                        },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const result = await api.getTemplateCategories({ locale: 'en' })

            expect(result.categories).toHaveLength(1)
            expect(result.categories[0]).toMatchObject({
                id: 'productivity',
                name: 'Productivity',
                seo: { title: 'Productivity', description: null },
            })
        })
    })

    describe('getTemplatesByIds', () => {
        test('joins template ids into CSV and validates each value in the response map', async () => {
            let observedUrl = ''
            server.use(
                http.get(`${getSyncBaseUri()}templates/get`, ({ request }) => {
                    observedUrl = request.url
                    return HttpResponse.json(
                        { templates: { 'product-launch': MOCK_TEMPLATE_API } },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const result = await api.getTemplatesByIds({
                templateIds: ['product-launch', 'sprint-planning'],
                locale: 'en',
            })

            const params = new URL(observedUrl).searchParams
            expect(params.get('template_ids')).toBe('product-launch,sprint-planning')
            expect(params.get('locale')).toBe('en')
            expect(Object.keys(result.templates)).toEqual(['product-launch'])
            expect(result.templates['product-launch']).toMatchObject({
                id: 'product-launch',
                shortDescription: 'Ship faster',
            })
        })

        test('rejects an empty templateIds array before making a request', async () => {
            const api = getTarget()
            await expect(api.getTemplatesByIds({ templateIds: [] })).rejects.toThrow(
                /non-empty array/,
            )
        })

        test('rejects more than 100 templateIds', async () => {
            const api = getTarget()
            const tooMany = Array.from({ length: 101 }, (_, i) => `id-${i}`)
            await expect(api.getTemplatesByIds({ templateIds: tooMany })).rejects.toThrow(
                /at most 100/,
            )
        })

        test('rejects templateIds containing empty strings', async () => {
            const api = getTarget()
            await expect(api.getTemplatesByIds({ templateIds: ['valid', ''] })).rejects.toThrow(
                /non-empty strings/,
            )
        })

        test('throws when the response omits the templates field', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}templates/get`, () => {
                    return HttpResponse.json({}, { status: 200 })
                }),
            )
            const api = getTarget()
            await expect(
                api.getTemplatesByIds({ templateIds: ['product-launch'] }),
            ).rejects.toThrow(/expected record/)
        })
    })

    describe('importTemplateFromId', () => {
        test('returns import result from rest client', async () => {
            const mockResponse = {
                status: 'ok',
                template_type: 'project',
                projects: [],
                sections: [],
                tasks: [],
                comments: [],
                project_notes: [],
            }
            server.use(
                http.post(
                    `${getSyncBaseUri()}templates/import_into_project_from_template_id`,
                    () => {
                        return HttpResponse.json(mockResponse, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const result = await api.importTemplateFromId({
                projectId: '123',
                templateId: 'product-launch',
            })

            expect(result.status).toBe('ok')
            expect(result.templateType).toBe('project')
            expect(result.tasks).toEqual([])
            expect(result.sections).toEqual([])
        })
    })
})
