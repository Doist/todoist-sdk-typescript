import { TodoistApi } from '.'
import {
    getSyncBaseUri,
    ENDPOINT_REST_PROJECTS,
    ENDPOINT_REST_PROJECTS_SEARCH,
    ENDPOINT_REST_PROJECT_COLLABORATORS,
    PROJECT_ARCHIVE,
    PROJECT_UNARCHIVE,
    ENDPOINT_REST_PROJECTS_MOVE_TO_WORKSPACE,
    ENDPOINT_REST_PROJECTS_MOVE_TO_PERSONAL,
    ENDPOINT_REST_PROJECTS_ARCHIVED_COUNT,
    ENDPOINT_REST_PROJECTS_PERMISSIONS,
    ENDPOINT_REST_PROJECT_FULL,
    ENDPOINT_REST_PROJECT_JOIN,
} from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import {
    DEFAULT_AUTH_TOKEN,
    DEFAULT_PROJECT,
    DEFAULT_USER,
    PROJECT_WITH_OPTIONALS_AS_NULL,
    DEFAULT_PROJECT_ID,
    DEFAULT_TASK,
    DEFAULT_SECTION,
    DEFAULT_RAW_COMMENT,
    DEFAULT_FOLDER,
    DEFAULT_COLLABORATOR,
    DEFAULT_COLLABORATOR_STATE,
    DEFAULT_NOTE,
    DEFAULT_WORKSPACE_PROJECT,
} from './test-utils/test-defaults'
import { getProjectUrl } from './utils/url-helpers'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi project endpoints', () => {
    describe('getProject', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123`, () => {
                    return HttpResponse.json(DEFAULT_PROJECT, { status: 200 })
                }),
            )
            const api = getTarget()

            const project = await api.getProject('123')

            expect(project).toEqual(DEFAULT_PROJECT)
        })
    })

    describe('getProjects', () => {
        test('returns result from rest client', async () => {
            const projects = [DEFAULT_PROJECT, PROJECT_WITH_OPTIONALS_AS_NULL]
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}`, () => {
                    return HttpResponse.json(
                        { results: projects, nextCursor: '123' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.getProjects()

            expect(results).toEqual(projects)
            expect(nextCursor).toBe('123')
        })

        test('forwards folderId and workspaceId as snake_case query params', async () => {
            let capturedUrl = ''
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}`, ({ request }) => {
                    capturedUrl = request.url
                    return HttpResponse.json({ results: [], nextCursor: null }, { status: 200 })
                }),
            )
            const api = getTarget()

            await api.getProjects({ folderId: '5', workspaceId: '9' })

            const params = new URL(capturedUrl).searchParams
            expect(params.get('folder_id')).toBe('5')
            expect(params.get('workspace_id')).toBe('9')
        })
    })

    describe('searchProjects', () => {
        test('returns result from rest client', async () => {
            const projects = [DEFAULT_PROJECT, PROJECT_WITH_OPTIONALS_AS_NULL]
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS_SEARCH}`, () => {
                    return HttpResponse.json(
                        { results: projects, nextCursor: '123' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.searchProjects({ query: 'Work' })

            expect(results).toEqual(projects)
            expect(nextCursor).toBe('123')
        })
    })

    describe('addProject', () => {
        const DEFAULT_ADD_PROJECT_ARGS = {
            name: 'This is a project',
        }

        test('returns result from rest client', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}`, () => {
                    return HttpResponse.json(DEFAULT_PROJECT, { status: 200 })
                }),
            )
            const api = getTarget()

            const project = await api.addProject(DEFAULT_ADD_PROJECT_ARGS)

            expect(project).toEqual(DEFAULT_PROJECT)
        })
    })

    describe('updateProject', () => {
        const DEFAULT_UPDATE_PROJECT_ARGS = { name: 'a name' }
        const DEFAULT_UPDATED_PROJECT_URL = getProjectUrl(
            DEFAULT_PROJECT_ID,
            DEFAULT_UPDATE_PROJECT_ARGS.name,
        )

        test('returns success result from rest client', async () => {
            const returnedProject = {
                ...DEFAULT_PROJECT,
                ...DEFAULT_UPDATE_PROJECT_ARGS,
                url: DEFAULT_UPDATED_PROJECT_URL,
            }
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123`, () => {
                    return HttpResponse.json(returnedProject, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.updateProject('123', DEFAULT_UPDATE_PROJECT_ARGS)

            expect(result).toEqual(returnedProject)
        })

        test('sends folderId as snake_case in body, preserving null for clear', async () => {
            const capturedBodies: unknown[] = []
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123`,
                    async ({ request }) => {
                        capturedBodies.push(await request.json())
                        return HttpResponse.json(DEFAULT_WORKSPACE_PROJECT, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            await api.updateProject('123', { folderId: '42' })
            await api.updateProject('123', { folderId: null })

            expect(capturedBodies[0]).toEqual({ folder_id: '42' })
            expect(capturedBodies[1]).toEqual({ folder_id: null })
        })
    })

    describe('deleteProject', () => {
        test('returns success result from rest client', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123`, () => {
                    return HttpResponse.json(undefined, { status: 204 })
                }),
            )
            const api = getTarget()

            const result = await api.deleteProject('123')

            expect(result).toEqual(true)
        })
    })

    describe('getProjectCollaborators', () => {
        const projectId = '123'
        const users = [DEFAULT_USER]

        test('returns result from rest client', async () => {
            server.use(
                http.get(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/${projectId}/${ENDPOINT_REST_PROJECT_COLLABORATORS}`,
                    () => {
                        return HttpResponse.json(
                            { results: users, nextCursor: '123' },
                            { status: 200 },
                        )
                    },
                ),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.getProjectCollaborators(projectId)

            expect(results).toEqual(users)
            expect(nextCursor).toBe('123')
        })
    })

    describe('archiveProject', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123/${PROJECT_ARCHIVE}`,
                    () => {
                        return HttpResponse.json(DEFAULT_PROJECT, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const project = await api.archiveProject('123')
            expect(project).toEqual(DEFAULT_PROJECT)
        })
    })

    describe('unarchiveProject', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123/${PROJECT_UNARCHIVE}`,
                    () => {
                        return HttpResponse.json(DEFAULT_PROJECT, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const project = await api.unarchiveProject('123')
            expect(project).toEqual(DEFAULT_PROJECT)
        })

        describe('getArchivedProjects', () => {
            test('returns result from rest client', async () => {
                const projects = [DEFAULT_PROJECT, PROJECT_WITH_OPTIONALS_AS_NULL]
                server.use(
                    http.get(`${getSyncBaseUri()}projects/archived`, () => {
                        return HttpResponse.json(
                            { results: projects, nextCursor: 'abc' },
                            { status: 200 },
                        )
                    }),
                )
                const api = getTarget()

                const { results, nextCursor } = await api.getArchivedProjects()
                expect(results).toEqual(projects)
                expect(nextCursor).toBe('abc')
            })
        })
    })

    describe('moveProjectToWorkspace', () => {
        test('returns project from response', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS_MOVE_TO_WORKSPACE}`, () => {
                    return HttpResponse.json(
                        { project: DEFAULT_PROJECT, items: [], sections: [] },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const project = await api.moveProjectToWorkspace({
                projectId: '123',
                workspaceId: '456',
            })

            expect(project).toEqual(DEFAULT_PROJECT)
        })
    })

    describe('moveProjectToPersonal', () => {
        test('returns project from response', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS_MOVE_TO_PERSONAL}`, () => {
                    return HttpResponse.json(
                        { project: DEFAULT_PROJECT, items: [], sections: [] },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const project = await api.moveProjectToPersonal({ projectId: '123' })

            expect(project).toEqual(DEFAULT_PROJECT)
        })
    })

    describe('getArchivedProjectsCount', () => {
        test('returns count from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS_ARCHIVED_COUNT}`, () => {
                    return HttpResponse.json({ count: 42 }, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getArchivedProjectsCount()

            expect(result).toEqual({ count: 42 })
        })
    })

    describe('getProjectPermissions', () => {
        test('returns permissions from rest client', async () => {
            const permissions = {
                projectCollaboratorActions: [{ name: 'ADMIN', actions: [{ name: 'edit' }] }],
                workspaceCollaboratorActions: [{ name: 'MEMBER', actions: [{ name: 'view' }] }],
            }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS_PERMISSIONS}`, () => {
                    return HttpResponse.json(permissions, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getProjectPermissions()

            expect(result).toEqual(permissions)
        })
    })

    describe('getFullProject', () => {
        test('returns full project data from rest client', async () => {
            const fullData = {
                project: DEFAULT_PROJECT,
                commentsCount: 5,
                tasks: [DEFAULT_TASK],
                sections: [DEFAULT_SECTION],
                collaborators: [DEFAULT_USER],
                notes: [DEFAULT_RAW_COMMENT],
            }
            server.use(
                http.get(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123/${ENDPOINT_REST_PROJECT_FULL}`,
                    () => {
                        return HttpResponse.json(fullData, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const result = await api.getFullProject('123')

            expect(result.project).toEqual(DEFAULT_PROJECT)
            expect(result.commentsCount).toBe(5)
            expect(result.tasks).toHaveLength(1)
            expect(result.sections).toHaveLength(1)
            expect(result.collaborators).toHaveLength(1)
            expect(result.notes).toHaveLength(1)
        })
    })

    describe('joinProject', () => {
        test('returns full join data from rest client', async () => {
            const joinData = {
                project: DEFAULT_WORKSPACE_PROJECT,
                tasks: [DEFAULT_TASK],
                sections: [DEFAULT_SECTION],
                comments: [DEFAULT_NOTE],
                collaborators: [DEFAULT_COLLABORATOR],
                collaboratorStates: [DEFAULT_COLLABORATOR_STATE],
                folder: DEFAULT_FOLDER,
                subprojects: [],
            }
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123/${ENDPOINT_REST_PROJECT_JOIN}`,
                    () => {
                        return HttpResponse.json(joinData, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const result = await api.joinProject('123')

            expect(result.project).toEqual(DEFAULT_WORKSPACE_PROJECT)
            expect(result.tasks).toHaveLength(1)
            expect(result.sections).toHaveLength(1)
            expect(result.comments).toHaveLength(1)
            expect(result.collaborators).toHaveLength(1)
            expect(result.collaboratorStates).toHaveLength(1)
            expect(result.folder).toEqual(DEFAULT_FOLDER)
            expect(result.subprojects).toHaveLength(0)
        })

        test('returns null folder when project has no folder', async () => {
            const joinData = {
                project: DEFAULT_WORKSPACE_PROJECT,
                tasks: [],
                sections: [],
                comments: [],
                collaborators: [],
                collaboratorStates: [],
                folder: null,
                subprojects: [],
            }
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/123/${ENDPOINT_REST_PROJECT_JOIN}`,
                    () => {
                        return HttpResponse.json(joinData, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const result = await api.joinProject('123')

            expect(result.folder).toBeNull()
        })
    })
})
