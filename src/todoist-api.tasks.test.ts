import { TodoistApi } from '.'
import {
    getSyncBaseUri,
    ENDPOINT_REST_TASK_CLOSE,
    ENDPOINT_REST_TASK_REOPEN,
    ENDPOINT_REST_TASKS,
    ENDPOINT_REST_TASKS_FILTER,
    ENDPOINT_REST_TASKS_COMPLETED_BY_COMPLETION_DATE,
    ENDPOINT_REST_TASKS_COMPLETED_BY_DUE_DATE,
    ENDPOINT_REST_TASKS_COMPLETED_SEARCH,
    ENDPOINT_REST_TASKS_COMPLETED,
    ENDPOINT_SYNC_QUICK_ADD,
} from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import {
    DEFAULT_AUTH_TOKEN,
    DEFAULT_REQUEST_ID,
    DEFAULT_TASK,
    DEFAULT_TASK_ID,
} from './test-utils/test-defaults'
import { getTaskUrl } from './utils/url-helpers'

function getTarget(baseUrl = 'https://api.todoist.com') {
    return new TodoistApi(DEFAULT_AUTH_TOKEN, { baseUrl })
}

describe('TodoistApi task endpoints', () => {
    describe('addTask', () => {
        const DEFAULT_ADD_TASK_ARGS = {
            content: 'This is a task',
        }

        test('returns result from rest client', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, () => {
                    return HttpResponse.json(DEFAULT_TASK, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.addTask(DEFAULT_ADD_TASK_ARGS)

            expect(task).toEqual(DEFAULT_TASK)
        })

        test('returns result from rest client against staging', async () => {
            const stagingBaseUrl = 'https://staging.todoist.com'
            server.use(
                http.post(`${getSyncBaseUri(stagingBaseUrl)}${ENDPOINT_REST_TASKS}`, () => {
                    return HttpResponse.json(DEFAULT_TASK, { status: 200 })
                }),
            )
            const api = getTarget(stagingBaseUrl)

            const task = await api.addTask(DEFAULT_ADD_TASK_ARGS, DEFAULT_REQUEST_ID)

            expect(task).toEqual(DEFAULT_TASK)
        })

        test('adds uncompletable prefix when isUncompletable is true', async () => {
            const expectedTask = {
                ...DEFAULT_TASK,
                content: '* This is an uncompletable task',
                isUncompletable: true,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.content).toBe('* This is an uncompletable task')
                    return HttpResponse.json(expectedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.addTask({
                content: 'This is an uncompletable task',
                isUncompletable: true,
            })

            expect(task.content).toBe('* This is an uncompletable task')
            expect(task.isUncompletable).toBe(true)
        })

        test('preserves existing prefix when isUncompletable is false', async () => {
            const expectedTask = {
                ...DEFAULT_TASK,
                content: '* Already has prefix',
                isUncompletable: true,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.content).toBe('* Already has prefix')
                    return HttpResponse.json(expectedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.addTask({
                content: '* Already has prefix',
                isUncompletable: false,
            })

            expect(task.content).toBe('* Already has prefix')
            expect(task.isUncompletable).toBe(true)
        })

        test('does not add prefix when isUncompletable is false', async () => {
            const expectedTask = {
                ...DEFAULT_TASK,
                content: 'Regular completable task',
                isUncompletable: false,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.content).toBe('Regular completable task')
                    return HttpResponse.json(expectedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.addTask({
                content: 'Regular completable task',
                isUncompletable: false,
            })

            expect(task.content).toBe('Regular completable task')
            expect(task.isUncompletable).toBe(false)
        })
    })

    describe('updateTask', () => {
        const DEFAULT_UPDATE_TASK_ARGS = { content: 'some new content' }
        const DEFAULT_UPDATED_TASK_URL = getTaskUrl(
            DEFAULT_TASK_ID,
            DEFAULT_UPDATE_TASK_ARGS.content,
        )

        test('returns success result from rest client', async () => {
            const returnedTask = {
                ...DEFAULT_TASK,
                ...DEFAULT_UPDATE_TASK_ARGS,
                url: DEFAULT_UPDATED_TASK_URL,
            }
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, () => {
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.updateTask('123', DEFAULT_UPDATE_TASK_ARGS)

            expect(response).toEqual(returnedTask)
        })

        test('processes content with isUncompletable when both are provided', async () => {
            const returnedTask = {
                ...DEFAULT_TASK,
                content: '* Updated uncompletable task',
                isUncompletable: true,
                url: getTaskUrl(DEFAULT_TASK_ID, '* Updated uncompletable task'),
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.content).toBe('* Updated uncompletable task')
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.updateTask('123', {
                content: 'Updated uncompletable task',
                isUncompletable: true,
            })

            expect(response.content).toBe('* Updated uncompletable task')
            expect(response.isUncompletable).toBe(true)
        })

        test('does not process content when only isUncompletable is provided', async () => {
            const returnedTask = {
                ...DEFAULT_TASK,
                isUncompletable: false,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.content).toBeUndefined()
                    expect(body.is_uncompletable).toBe(false) // Note: snake_case conversion
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.updateTask('123', {
                isUncompletable: false,
            })

            expect(response.isUncompletable).toBe(false)
        })

        test('translates dueString null to "no date"', async () => {
            const returnedTask = {
                ...DEFAULT_TASK,
                due: null,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.due_string).toBe('no date')
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.updateTask('123', {
                dueString: null,
            })

            expect(response.due).toBeNull()
        })

        test('remaps order to child_order in payload', async () => {
            const returnedTask = { ...DEFAULT_TASK }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.child_order).toBe(3)
                    expect(body.order).toBeUndefined()
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            await api.updateTask('123', { order: 3 })
        })

        test('does not send child_order when order is not provided', async () => {
            const returnedTask = { ...DEFAULT_TASK }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.child_order).toBeUndefined()
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            await api.updateTask('123', { content: 'some content' })
        })

        test('keeps deadlineDate null in payload', async () => {
            const returnedTask = {
                ...DEFAULT_TASK,
                deadline: null,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.deadline_date).toBeNull()
                    return HttpResponse.json(returnedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.updateTask('123', {
                deadlineDate: null,
            })

            expect(response.deadline).toBeNull()
        })
    })

    describe('closeTask', () => {
        test('returns success result from rest client', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123/${ENDPOINT_REST_TASK_CLOSE}`,
                    () => {
                        return HttpResponse.json(undefined, { status: 204 })
                    },
                ),
            )
            const api = getTarget()

            const response = await api.closeTask('123')

            expect(response).toEqual(true)
        })
    })

    describe('reopenTask', () => {
        test('returns success result from rest client', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123/${ENDPOINT_REST_TASK_REOPEN}`,
                    () => {
                        return HttpResponse.json(undefined, { status: 204 })
                    },
                ),
            )
            const api = getTarget()

            const response = await api.reopenTask('123')

            expect(response).toEqual(true)
        })
    })

    describe('deleteTask', () => {
        test('returns success result from rest client', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/123`, () => {
                    return HttpResponse.json(undefined, { status: 204 })
                }),
            )
            const api = getTarget()

            const response = await api.deleteTask('123')

            expect(response).toEqual(true)
        })
    })

    describe('quickAddTask', () => {
        const DEFAULT_QUICK_ADD_ARGS = {
            text: 'This is a quick add text',
            note: 'This is a note',
            reminder: 'tomorrow 5pm',
            autoReminder: true,
        }

        test('returns result from rest client', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC_QUICK_ADD}`, () => {
                    return HttpResponse.json(DEFAULT_TASK, { status: 200 })
                }),
            )
            const api = getTarget()
            const task = await api.quickAddTask(DEFAULT_QUICK_ADD_ARGS)
            expect(task).toEqual(DEFAULT_TASK)
        })

        test('adds uncompletable prefix when isUncompletable is true', async () => {
            const expectedTask = {
                ...DEFAULT_TASK,
                content: '* Quick uncompletable task',
                isUncompletable: true,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC_QUICK_ADD}`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.text).toBe('* Quick uncompletable task')
                    return HttpResponse.json(expectedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.quickAddTask({
                text: 'Quick uncompletable task',
                isUncompletable: true,
            })

            expect(task.content).toBe('* Quick uncompletable task')
            expect(task.isUncompletable).toBe(true)
        })

        test('preserves existing prefix even when isUncompletable is false', async () => {
            const expectedTask = {
                ...DEFAULT_TASK,
                content: '* Already prefixed quick task',
                isUncompletable: true,
            }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC_QUICK_ADD}`, async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>
                    expect(body.text).toBe('* Already prefixed quick task')
                    return HttpResponse.json(expectedTask, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.quickAddTask({
                text: '* Already prefixed quick task',
                isUncompletable: false,
            })

            expect(task.content).toBe('* Already prefixed quick task')
            expect(task.isUncompletable).toBe(true)
        })
    })

    describe('getTask', () => {
        test('returns result from rest client', async () => {
            const taskId = '12'
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/${taskId}`, () => {
                    return HttpResponse.json(DEFAULT_TASK, { status: 200 })
                }),
            )
            const api = getTarget()

            const task = await api.getTask(taskId)

            expect(task).toEqual(DEFAULT_TASK)
        })
    })

    describe('getTasks', () => {
        const DEFAULT_GET_TASKS_ARGS = {
            projectId: '123',
            limit: 10,
            cursor: '0',
        }

        test('returns result from rest client', async () => {
            const tasks = [DEFAULT_TASK]
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, () => {
                    return HttpResponse.json({ results: tasks, nextCursor: '123' }, { status: 200 })
                }),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.getTasks(DEFAULT_GET_TASKS_ARGS)

            expect(results).toEqual(tasks)
            expect(nextCursor).toBe('123')
        })

        test('serializes IDs as a comma-separated query parameter', async () => {
            let capturedUrl = ''
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, ({ request }) => {
                    capturedUrl = request.url
                    return HttpResponse.json({ results: [], nextCursor: null }, { status: 200 })
                }),
            )
            const api = getTarget()

            await api.getTasks({ ids: ['id-one', 'id-two'] })

            expect(new URL(capturedUrl).searchParams.get('ids')).toBe('id-one,id-two')
        })
    })

    describe('getTasksByFilter', () => {
        const DEFAULT_GET_TASKS_BY_FILTER_ARGS = {
            query: 'today',
            lang: 'en',
            cursor: null,
            limit: 10,
        }

        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_FILTER}`, () => {
                    return HttpResponse.json(
                        { results: [DEFAULT_TASK], nextCursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const response = await api.getTasksByFilter(DEFAULT_GET_TASKS_BY_FILTER_ARGS)

            expect(response).toEqual({
                results: [DEFAULT_TASK],
                nextCursor: null,
            })
        })

        test('validates task array in response', async () => {
            const invalidTask = { ...DEFAULT_TASK, due: '2020-01-31' }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_FILTER}`, () => {
                    return HttpResponse.json(
                        { results: [invalidTask], nextCursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            await expect(api.getTasksByFilter(DEFAULT_GET_TASKS_BY_FILTER_ARGS)).rejects.toThrow()
        })
    })

    describe('getCompletedTasksByCompletionDate', () => {
        const DEFAULT_GET_COMPLETED_TASKS_ARGS = {
            since: '2025-01-01T00:00:00Z',
            until: '2025-12-31T23:59:59Z',
            workspaceId: null,
            cursor: null,
            limit: 10,
        }

        test('returns result from rest client', async () => {
            server.use(
                http.get(
                    `${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED_BY_COMPLETION_DATE}`,
                    () => {
                        return HttpResponse.json(
                            { items: [DEFAULT_TASK], nextCursor: '123' },
                            { status: 200 },
                        )
                    },
                ),
            )
            const api = getTarget()

            const response = await api.getCompletedTasksByCompletionDate(
                DEFAULT_GET_COMPLETED_TASKS_ARGS,
            )

            expect(response).toEqual({
                items: [DEFAULT_TASK],
                nextCursor: '123',
            })
        })

        test('validates task array in response', async () => {
            const invalidTask = { ...DEFAULT_TASK, due: '2020-01-31' }
            server.use(
                http.get(
                    `${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED_BY_COMPLETION_DATE}`,
                    () => {
                        return HttpResponse.json(
                            { items: [invalidTask], nextCursor: null },
                            { status: 200 },
                        )
                    },
                ),
            )
            const api = getTarget()

            await expect(
                api.getCompletedTasksByCompletionDate(DEFAULT_GET_COMPLETED_TASKS_ARGS),
            ).rejects.toThrow()
        })
    })

    describe('getCompletedTasksByDueDate', () => {
        const DEFAULT_GET_COMPLETED_TASKS_ARGS = {
            since: '2025-01-01T00:00:00Z',
            until: '2025-12-31T23:59:59Z',
            workspaceId: null,
            cursor: null,
            limit: 10,
        }

        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED_BY_DUE_DATE}`, () => {
                    return HttpResponse.json(
                        { items: [DEFAULT_TASK], nextCursor: '456' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const response = await api.getCompletedTasksByDueDate(DEFAULT_GET_COMPLETED_TASKS_ARGS)

            expect(response).toEqual({
                items: [DEFAULT_TASK],
                nextCursor: '456',
            })
        })

        test('validates task array in response', async () => {
            const invalidTask = { ...DEFAULT_TASK, due: '2020-01-31' }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED_BY_DUE_DATE}`, () => {
                    return HttpResponse.json(
                        { items: [invalidTask], nextCursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            await expect(
                api.getCompletedTasksByDueDate(DEFAULT_GET_COMPLETED_TASKS_ARGS),
            ).rejects.toThrow()
        })
    })

    describe('searchCompletedTasks', () => {
        const DEFAULT_SEARCH_COMPLETED_TASKS_ARGS = {
            query: 'buy milk',
            cursor: null,
            limit: 10,
        }

        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED_SEARCH}`, () => {
                    return HttpResponse.json(
                        { items: [DEFAULT_TASK], nextCursor: '789' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const response = await api.searchCompletedTasks(DEFAULT_SEARCH_COMPLETED_TASKS_ARGS)

            expect(response).toEqual({
                items: [DEFAULT_TASK],
                nextCursor: '789',
            })
        })

        test('validates task array in response', async () => {
            const invalidTask = { ...DEFAULT_TASK, due: '2020-01-31' }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED_SEARCH}`, () => {
                    return HttpResponse.json(
                        { items: [invalidTask], nextCursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            await expect(
                api.searchCompletedTasks(DEFAULT_SEARCH_COMPLETED_TASKS_ARGS),
            ).rejects.toThrow()
        })
    })

    describe('getAllCompletedTasks', () => {
        test('returns completed tasks from rest client', async () => {
            const mockResponse = {
                projects: { '123': { id: '123', name: 'Project' } },
                sections: {},
                items: [DEFAULT_TASK],
            }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS_COMPLETED}`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getAllCompletedTasks({ projectId: '123' })

            expect(result.items).toHaveLength(1)
            expect(result.projects).toHaveProperty('123')
        })
    })
})
