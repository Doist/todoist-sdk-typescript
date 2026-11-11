import { TodoistApi } from '.'
import { getSyncBaseUri, ENDPOINT_SYNC } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN, DEFAULT_REQUEST_ID, DEFAULT_TASK } from './test-utils/test-defaults'
import { getTaskUrl } from './utils/url-helpers'

type SyncCommand = {
    uuid: string
    type: string
    args: {
        id?: string
        project_id?: string
        section_id?: string
        parent_id?: string
    }
}

type SyncPayload = {
    commands: SyncCommand[]
    resource_types: string[]
}

function getTarget(baseUrl = 'https://api.todoist.com') {
    return new TodoistApi(DEFAULT_AUTH_TOKEN, { baseUrl })
}

describe('TodoistApi moveTasks', () => {
    const TASK_IDS = ['123', '456', '789']
    const MOVED_TASKS = TASK_IDS.map((id) => ({
        ...DEFAULT_TASK,
        id,
        projectId: '999',
        url: getTaskUrl(id, DEFAULT_TASK.content),
    }))

    test('moves multiple tasks to project with unique UUIDs', async () => {
        let capturedPayload: SyncPayload | null = null

        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                capturedPayload = (await request.json()) as SyncPayload
                return HttpResponse.json(
                    {
                        items: MOVED_TASKS,
                        sync_status: { [expect.any(String)]: 'ok' },
                    },
                    { status: 200 },
                )
            }),
        )
        const api = getTarget()

        const result = await api.moveTasks(TASK_IDS, { projectId: '999' }, DEFAULT_REQUEST_ID)

        // Verify return value
        expect(result).toEqual(MOVED_TASKS)

        // Critical: Verify unique UUIDs (see https://github.com/todoist/todoist-sdk-typescript/issues/310)
        expect(capturedPayload).not.toBeNull()
        // oxlint-disable-next-line no-non-null-assertion
        const payload = capturedPayload!

        const commands: SyncCommand[] = payload.commands
        expect(commands).toBeDefined()
        expect(commands.length).toBe(TASK_IDS.length)

        const uuids = commands.map((cmd) => cmd.uuid)
        const uniqueUuids = new Set(uuids)
        expect(uniqueUuids.size).toBe(TASK_IDS.length) // All UUIDs must be different

        // Verify command structure
        commands.forEach((cmd) => {
            expect(cmd.type).toBe('item_move')
            expect(cmd.args).toMatchObject({ project_id: '999' })
        })
        expect(payload.resource_types).toEqual(['items'])
    })

    test('supports section move', async () => {
        let capturedPayload: SyncPayload | null = null

        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                capturedPayload = (await request.json()) as SyncPayload
                return HttpResponse.json(
                    {
                        items: [{ ...DEFAULT_TASK, id: '123', sectionId: '888' }],
                        sync_status: { [expect.any(String)]: 'ok' },
                    },
                    { status: 200 },
                )
            }),
        )
        const api = getTarget()

        await api.moveTasks(['123'], { sectionId: '888' })

        expect(capturedPayload).not.toBeNull()
        // oxlint-disable-next-line no-non-null-assertion
        const payload = capturedPayload!

        const commands: SyncCommand[] = payload.commands
        const firstCommand: SyncCommand = commands[0]
        expect(firstCommand.args).toEqual({
            id: '123',
            section_id: '888',
        })
    })

    test('supports parent move', async () => {
        let capturedPayload: SyncPayload | null = null

        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                capturedPayload = (await request.json()) as SyncPayload
                return HttpResponse.json(
                    {
                        items: [{ ...DEFAULT_TASK, id: '123', parentId: '777' }],
                        sync_status: { [expect.any(String)]: 'ok' },
                    },
                    { status: 200 },
                )
            }),
        )
        const api = getTarget()

        await api.moveTasks(['123'], { parentId: '777' })

        expect(capturedPayload).not.toBeNull()
        // oxlint-disable-next-line no-non-null-assertion
        const payload = capturedPayload!

        const commands: SyncCommand[] = payload.commands
        const firstCommand: SyncCommand = commands[0]
        expect(firstCommand.args).toEqual({
            id: '123',
            parent_id: '777',
        })
    })

    test('handles error cases', async () => {
        const api = getTarget()

        // Test maximum limit
        const manyTaskIds = Array.from({ length: 101 }, (_, i) => `task_${i}`)
        await expect(api.moveTasks(manyTaskIds, { projectId: '999' })).rejects.toThrow(
            'Maximum number of items is 100',
        )

        // Test sync API error
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                return HttpResponse.json(
                    {
                        items: [],
                        sync_status: {
                            uuid: { error: 'TASK_NOT_FOUND', http_code: 404, error_extra: {} },
                        },
                    },
                    { status: 200 },
                )
            }),
        )
        await expect(api.moveTasks(['123'], { projectId: '999' })).rejects.toThrow('TASK_NOT_FOUND')

        // Test no tasks returned
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                return HttpResponse.json(
                    { sync_status: { [expect.any(String)]: 'ok' } },
                    { status: 200 },
                )
            }),
        )
        await expect(api.moveTasks(['123'], { projectId: '999' })).rejects.toThrow(
            'Tasks not found',
        )
    })

    test('filters returned tasks to requested IDs only', async () => {
        const extraTask = {
            ...DEFAULT_TASK,
            id: '999',
            projectId: '999',
            url: getTaskUrl('999', DEFAULT_TASK.content),
        }
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                return HttpResponse.json(
                    {
                        items: [...MOVED_TASKS, extraTask],
                        sync_status: { [expect.any(String)]: 'ok' },
                    },
                    { status: 200 },
                )
            }),
        )
        const api = getTarget()

        const result = await api.moveTasks(TASK_IDS, { projectId: '999' })

        expect(result).toEqual(MOVED_TASKS) // Should not include extraTask
        expect(result).not.toContainEqual(extraTask)
    })
})
