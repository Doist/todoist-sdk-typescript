import { vi } from 'vitest'
import { TodoistApi } from '.'
import { getSyncBaseUri } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import {
    DEFAULT_AUTH_TOKEN,
    DEFAULT_PROJECT,
    DEFAULT_RAW_COMMENT,
    DEFAULT_SECTION,
    DEFAULT_TASK,
} from './test-utils/test-defaults'
import { uploadMultipartFile } from './utils/multipart-upload'

// Mock the multipart upload helper
vi.mock('./utils/multipart-upload')
const mockedUploadMultipartFile = vi.mocked(uploadMultipartFile)

const RAW_TEMPLATE = {
    id: 'UT_28Rc62VC22j439VcPJMw9xgWx2',
    name: 'Launch plan',
    template_type: 'project',
    template_source: 'user',
    short_description: 'Everything for a launch',
    long_description: 'Everything for a launch',
    instructions: null,
    import_url: null,
    view_type: 'board',
    thumbnail_image: null,
    thumbnail_image_dark: null,
    cover_image: null,
    preview_image: null,
    template_color: 'blue',
    background_color: null,
    background_color_dark: null,
    creator: { user_id: '1', name: 'Ada', position: '', avatar: '' },
    seo: null,
    more_resources: [],
    category_ids: [],
    project_count: null,
    workspace_id: null,
    shared_with_workspace_members: false,
    can_edit: true,
    last_edited_by: { user_id: '1', name: 'Ada', position: '', avatar: '' },
    last_edited_at: '2026-11-04T10:00:00Z',
}

function getTemplatesBaseUri() {
    return getSyncBaseUri().replace('/api/v1/', '/api/v1.6/')
}

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

    describe('createProjectFromTemplateId', () => {
        test('posts snake_case args and returns the new project ID', async () => {
            let body: unknown
            server.use(
                http.post(`${getSyncBaseUri()}projects/from_template`, async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json({ status: 'ok', project_id: '6X7rM8997g3RQmvh' })
                }),
            )
            const api = getTarget()

            const result = await api.createProjectFromTemplateId({
                templateId: 'UT_28Rc62VC22j439VcPJMw9xgWx2',
                name: 'Q3 launch',
                workspaceId: '42',
                folderId: '7',
            })

            expect(body).toEqual({
                template_id: 'UT_28Rc62VC22j439VcPJMw9xgWx2',
                name: 'Q3 launch',
                workspace_id: '42',
                folder_id: '7',
            })
            expect(result).toEqual({ status: 'ok', projectId: '6X7rM8997g3RQmvh' })
        })
    })

    describe('saveProjectAsTemplate', () => {
        test('defaults to a project template and returns the validated template', async () => {
            let body: unknown
            server.use(
                http.post(`${getTemplatesBaseUri()}templates/user`, async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json(RAW_TEMPLATE)
                }),
            )
            const api = getTarget()

            const result = await api.saveProjectAsTemplate({
                projectId: '123',
                name: 'Launch plan',
                description: 'Everything for a launch',
                color: 'blue',
                forWorkspace: true,
            })

            expect(body).toEqual({
                project_id: '123',
                name: 'Launch plan',
                description: 'Everything for a launch',
                color: 'blue',
                for_workspace: true,
                template_type: 'project',
            })
            expect(result).toMatchObject({
                id: 'UT_28Rc62VC22j439VcPJMw9xgWx2',
                templateType: 'project',
                templateSource: 'user',
                viewType: 'board',
                lastEditedBy: { userId: '1', name: 'Ada' },
            })
        })

        test('sends a numeric color ID as a number', async () => {
            let body: unknown
            server.use(
                http.post(`${getTemplatesBaseUri()}templates/user`, async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json(RAW_TEMPLATE)
                }),
            )
            const api = getTarget()

            await api.saveProjectAsTemplate({
                projectId: '123',
                name: 'Launch plan',
                description: '',
                color: 30,
            })

            expect(body).toMatchObject({ color: 30 })
        })

        test('reports a curated source as todoist, however the API spells it', async () => {
            server.use(
                http.post(`${getTemplatesBaseUri()}templates/user`, () =>
                    HttpResponse.json({ ...RAW_TEMPLATE, template_source: 'doist' }),
                ),
            )
            const api = getTarget()

            const result = await api.saveProjectAsTemplate({
                projectId: '123',
                name: 'Launch plan',
                description: '',
                color: 'blue',
            })

            expect(result.templateSource).toBe('todoist')
        })

        test('rejects a response that is not a template', async () => {
            server.use(
                http.post(`${getTemplatesBaseUri()}templates/user`, () =>
                    HttpResponse.json({ status: 'ok' }),
                ),
            )
            const api = getTarget()

            await expect(
                api.saveProjectAsTemplate({
                    projectId: '123',
                    name: 'Launch plan',
                    description: '',
                    color: 'blue',
                }),
            ).rejects.toThrow()
        })
    })

    describe('getTemplates', () => {
        test('sends filters as snake_case query params and validates each template', async () => {
            let params: URLSearchParams | undefined
            server.use(
                http.get(`${getSyncBaseUri()}templates`, ({ request }) => {
                    params = new URL(request.url).searchParams
                    return HttpResponse.json({ results: [RAW_TEMPLATE], next_cursor: 'abc.def' })
                }),
            )
            const api = getTarget()

            const result = await api.getTemplates({
                templateSource: 'all',
                templateType: 'project',
                query: 'launch',
                categoryId: 'work',
                limit: 10,
            })

            expect(Object.fromEntries(params ?? [])).toEqual({
                template_source: 'all',
                template_type: 'project',
                query: 'launch',
                category_id: 'work',
                limit: '10',
            })
            expect(result.nextCursor).toBe('abc.def')
            expect(result.results).toHaveLength(1)
            expect(result.results[0]).toMatchObject({
                id: 'UT_28Rc62VC22j439VcPJMw9xgWx2',
                templateSource: 'user',
            })
        })

        test('rejects a page with a malformed template', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}templates`, () =>
                    HttpResponse.json({ results: [{ id: 'x' }], next_cursor: null }),
                ),
            )
            const api = getTarget()

            await expect(api.getTemplates()).rejects.toThrow()
        })
    })

    describe('getTemplatesByIds', () => {
        test('joins the IDs into one comma-separated param', async () => {
            let params: URLSearchParams | undefined
            server.use(
                http.get(`${getSyncBaseUri()}templates`, ({ request }) => {
                    params = new URL(request.url).searchParams
                    return HttpResponse.json({ results: [], next_cursor: null })
                }),
            )
            const api = getTarget()

            const result = await api.getTemplatesByIds({
                ids: ['bug-tracking', 'UT_28Rc62VC22j439VcPJMw9xgWx2'],
                locale: 'de',
            })

            expect(Object.fromEntries(params ?? [])).toEqual({
                ids: 'bug-tracking,UT_28Rc62VC22j439VcPJMw9xgWx2',
                locale: 'de',
            })
            expect(result).toEqual({ results: [], nextCursor: null })
        })
    })

    describe('getTemplate', () => {
        test('fetches one template by ID', async () => {
            let locale: string | null | undefined
            server.use(
                http.get(
                    `${getSyncBaseUri()}templates/UT_28Rc62VC22j439VcPJMw9xgWx2`,
                    ({ request }) => {
                        locale = new URL(request.url).searchParams.get('locale')
                        return HttpResponse.json(RAW_TEMPLATE)
                    },
                ),
            )
            const api = getTarget()

            const result = await api.getTemplate('UT_28Rc62VC22j439VcPJMw9xgWx2', { locale: 'fr' })

            expect(locale).toBe('fr')
            expect(result.name).toBe('Launch plan')
        })

        test('rejects an empty ID before making a request', async () => {
            const api = getTarget()

            await expect(api.getTemplate('')).rejects.toThrow()
        })
    })

    describe('getTemplateCategories', () => {
        test('returns the validated categories', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}templates/categories`, () =>
                    HttpResponse.json({
                        categories: [
                            {
                                id: 'work',
                                name: 'Work',
                                description: null,
                                seo: { title: 'Work templates', description: null },
                            },
                        ],
                    }),
                ),
            )
            const api = getTarget()

            const result = await api.getTemplateCategories({ templateType: 'project' })

            expect(result).toEqual([
                {
                    id: 'work',
                    name: 'Work',
                    description: null,
                    seo: { title: 'Work templates', description: null },
                },
            ])
        })
    })

    describe('updateUserTemplate', () => {
        test('puts only the given fields and returns the validated template', async () => {
            let body: unknown
            server.use(
                http.put(
                    `${getTemplatesBaseUri()}templates/user/UT_28Rc62VC22j439VcPJMw9xgWx2`,
                    async ({ request }) => {
                        body = await request.json()
                        return HttpResponse.json({ status: 'ok', ...RAW_TEMPLATE, name: 'Renamed' })
                    },
                ),
            )
            const api = getTarget()

            const result = await api.updateUserTemplate('UT_28Rc62VC22j439VcPJMw9xgWx2', {
                name: 'Renamed',
                projectId: '123',
                sharedWithWorkspaceMembers: true,
            })

            expect(body).toEqual({
                name: 'Renamed',
                project_id: '123',
                shared_with_workspace_members: true,
            })
            expect(result.name).toBe('Renamed')
        })

        test('rejects an empty template ID before making a request', async () => {
            const api = getTarget()

            await expect(api.updateUserTemplate('', { name: 'x' })).rejects.toThrow()
        })
    })

    describe('previewTemplateFromCSV', () => {
        test('uploads the CSV and renames sync names to SDK ones', async () => {
            mockedUploadMultipartFile.mockResolvedValue({
                uploadedFileName: '1234567_abcdef_weekly.csv',
                templateType: 'project',
                projects: [DEFAULT_PROJECT],
                sections: [DEFAULT_SECTION],
                items: [DEFAULT_TASK],
                notes: [DEFAULT_RAW_COMMENT],
                projectNotes: [],
                projectViewOptionsDefaults: [],
                reminders: [],
            })
            const api = getTarget()

            const result = await api.previewTemplateFromCSV({
                file: Buffer.from('TYPE,CONTENT\ntask,Plan'),
                fileName: 'weekly.csv',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'templates/user/preview',
                    fileName: 'weekly.csv',
                }),
            )
            expect(result.uploadedFileName).toBe('1234567_abcdef_weekly.csv')
            expect(result.tasks).toHaveLength(1)
            expect(result.comments).toHaveLength(1)
            expect(result.projectComments).toEqual([])
            expect(result).not.toHaveProperty('items')
        })
    })

    describe('createTemplateFromCSV', () => {
        test('uploads a file with the template fields as form fields', async () => {
            mockedUploadMultipartFile.mockResolvedValue({
                ...RAW_TEMPLATE,
                templateType: 'project',
                templateSource: 'user',
                shortDescription: '',
                longDescription: '',
                thumbnailImage: null,
                thumbnailImageDark: null,
                coverImage: null,
                previewImage: null,
                templateColor: null,
                backgroundColor: null,
                backgroundColorDark: null,
                moreResources: [],
                categoryIds: [],
            })
            const api = getTarget()

            const result = await api.createTemplateFromCSV({
                file: Buffer.from('TYPE,CONTENT\ntask,Plan'),
                fileName: 'weekly.csv',
                name: 'Weekly',
                description: 'Plan the week',
                color: 30,
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'templates/user/import',
                    additionalFields: {
                        template_type: 'project',
                        name: 'Weekly',
                        description: 'Plan the week',
                        color: '30',
                    },
                }),
            )
            expect(result.id).toBe('UT_28Rc62VC22j439VcPJMw9xgWx2')
        })

        test('saves a staged file as JSON without uploading again', async () => {
            let body: unknown
            server.use(
                http.post(`${getTemplatesBaseUri()}templates/user/import`, async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json(RAW_TEMPLATE)
                }),
            )
            const api = getTarget()

            await api.createTemplateFromCSV({
                uploadedFileName: '1234567_abcdef_weekly.csv',
                name: 'Weekly',
                description: 'Plan the week',
                color: 'blue',
            })

            expect(mockedUploadMultipartFile).not.toHaveBeenCalled()
            expect(body).toEqual({
                template_type: 'project',
                name: 'Weekly',
                description: 'Plan the week',
                color: 'blue',
                uploaded_file_name: '1234567_abcdef_weekly.csv',
            })
        })

        test('needs either a file or a staged file name', async () => {
            const api = getTarget()

            await expect(
                api.createTemplateFromCSV({ name: 'Weekly', description: '', color: 'blue' }),
            ).rejects.toThrow('needs either `file` or `uploadedFileName`')
        })
    })
})
