import { TodoistApi } from '.'
import {
    getSyncBaseUri,
    ENDPOINT_REST_GOALS,
    ENDPOINT_REST_GOALS_SEARCH,
    GOAL_COMPLETE,
    GOAL_UNCOMPLETE,
    GOAL_TASKS,
} from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import {
    DEFAULT_AUTH_TOKEN,
    DEFAULT_GOAL,
    DEFAULT_GOAL_ID,
    DEFAULT_GOAL_NO_PROGRESS,
    DEFAULT_TASK_ID,
} from './test-utils/test-defaults'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

// Realistic REST payload: backend uses snake_case and "item" terminology for progress.
// The transport layer runs camelCaseKeys() before the schema sees this, so after that
// step the fields are `totalItemCount` / `completedItemCount` / `percentage`.
// GoalProgressSchema.preprocess then renames them to `totalTaskCount` / `completedTaskCount`.
const RAW_GOAL_RESPONSE = {
    id: DEFAULT_GOAL_ID,
    owner_type: 'USER',
    owner_id: '5',
    name: 'Ship v2',
    description: 'Launch the new version',
    deadline: '2026-04-03',
    parent_goal_id: null,
    child_order: 0,
    is_completed: false,
    completed_at: null,
    responsible_uid: null,
    is_deleted: false,
    progress: {
        total_item_count: 5,
        completed_item_count: 2,
        percentage: 40,
    },
    creator_uid: '5',
    created_at: '2020-09-08T12:00:00Z',
    updated_at: '2020-09-08T12:00:00Z',
}

const RAW_GOAL_RESPONSE_NO_PROGRESS = {
    ...RAW_GOAL_RESPONSE,
    id: DEFAULT_GOAL_NO_PROGRESS.id,
    progress: undefined,
}

describe('TodoistApi goal endpoints', () => {
    describe('getGoals', () => {
        test('returns result from rest client and normalizes progress to *TaskCount', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}`, () => {
                    return HttpResponse.json(
                        { results: [RAW_GOAL_RESPONSE], next_cursor: 'abc' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.getGoals()

            expect(results).toEqual([DEFAULT_GOAL])
            expect(nextCursor).toBe('abc')
        })

        test('serializes filter args onto request URL', async () => {
            let capturedUrl: URL | undefined
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}`, ({ request }) => {
                    capturedUrl = new URL(request.url)
                    return HttpResponse.json(
                        { results: [RAW_GOAL_RESPONSE], next_cursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            await api.getGoals({
                workspaceId: '100',
                ownerType: 'USER',
                cursor: 'abc',
                limit: 25,
            })

            expect(capturedUrl?.searchParams.get('workspace_id')).toBe('100')
            expect(capturedUrl?.searchParams.get('owner_type')).toBe('USER')
            expect(capturedUrl?.searchParams.get('cursor')).toBe('abc')
            expect(capturedUrl?.searchParams.get('limit')).toBe('25')
        })

        test('passes through goals without progress', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}`, () => {
                    return HttpResponse.json(
                        { results: [RAW_GOAL_RESPONSE_NO_PROGRESS], next_cursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results } = await api.getGoals()

            expect(results[0]?.progress).toBeUndefined()
        })
    })

    describe('searchGoals', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS_SEARCH}`, () => {
                    return HttpResponse.json(
                        { results: [RAW_GOAL_RESPONSE], next_cursor: null },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results } = await api.searchGoals({ query: 'Ship' })

            expect(results).toEqual([DEFAULT_GOAL])
        })
    })

    describe('getGoal', () => {
        test('returns goal with normalized progress', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}`, () =>
                    HttpResponse.json(RAW_GOAL_RESPONSE, { status: 200 }),
                ),
            )
            const api = getTarget()

            const goal = await api.getGoal(DEFAULT_GOAL_ID)

            expect(goal).toEqual(DEFAULT_GOAL)
        })
    })

    describe('addGoal', () => {
        test('returns created goal', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}`, () =>
                    HttpResponse.json(RAW_GOAL_RESPONSE, { status: 200 }),
                ),
            )
            const api = getTarget()

            const goal = await api.addGoal({ name: 'Ship v2' })

            expect(goal).toEqual(DEFAULT_GOAL)
        })
    })

    describe('updateGoal', () => {
        test('returns updated goal', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}`, () =>
                    HttpResponse.json(RAW_GOAL_RESPONSE, { status: 200 }),
                ),
            )
            const api = getTarget()

            const goal = await api.updateGoal(DEFAULT_GOAL_ID, { name: 'Ship v2' })

            expect(goal).toEqual(DEFAULT_GOAL)
        })
    })

    describe('deleteGoal', () => {
        test('returns success', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}`, () =>
                    HttpResponse.json(undefined, { status: 204 }),
                ),
            )
            const api = getTarget()

            const result = await api.deleteGoal(DEFAULT_GOAL_ID)

            expect(result).toBe(true)
        })
    })

    describe('completeGoal', () => {
        test('returns completed goal', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}/${GOAL_COMPLETE}`,
                    () =>
                        HttpResponse.json(
                            { ...RAW_GOAL_RESPONSE, is_completed: true },
                            { status: 200 },
                        ),
                ),
            )
            const api = getTarget()

            const goal = await api.completeGoal(DEFAULT_GOAL_ID)

            expect(goal).toEqual({ ...DEFAULT_GOAL, isCompleted: true })
        })
    })

    describe('uncompleteGoal', () => {
        test('returns reopened goal', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}/${GOAL_UNCOMPLETE}`,
                    () => HttpResponse.json(RAW_GOAL_RESPONSE, { status: 200 }),
                ),
            )
            const api = getTarget()

            const goal = await api.uncompleteGoal(DEFAULT_GOAL_ID)

            expect(goal).toEqual(DEFAULT_GOAL)
        })
    })

    describe('linkTaskToGoal', () => {
        test('returns goal after linking task and maps taskId to item_id in payload', async () => {
            let capturedBody: unknown
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}/${GOAL_TASKS}`,
                    async ({ request }) => {
                        capturedBody = await request.json()
                        return HttpResponse.json(RAW_GOAL_RESPONSE, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const goal = await api.linkTaskToGoal({
                goalId: DEFAULT_GOAL_ID,
                taskId: DEFAULT_TASK_ID,
            })

            expect(goal).toEqual(DEFAULT_GOAL)
            expect(capturedBody).toEqual({ item_id: DEFAULT_TASK_ID })
        })
    })

    describe('unlinkTaskFromGoal', () => {
        test('returns success', async () => {
            server.use(
                http.delete(
                    `${getSyncBaseUri()}${ENDPOINT_REST_GOALS}/${DEFAULT_GOAL_ID}/${GOAL_TASKS}/${DEFAULT_TASK_ID}`,
                    () => HttpResponse.json(undefined, { status: 204 }),
                ),
            )
            const api = getTarget()

            const result = await api.unlinkTaskFromGoal({
                goalId: DEFAULT_GOAL_ID,
                taskId: DEFAULT_TASK_ID,
            })

            expect(result).toBe(true)
        })
    })
})
