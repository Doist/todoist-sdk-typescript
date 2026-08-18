import { TodoistApi } from '.'
import { ENDPOINT_SYNC, getSyncBaseUri } from './consts/endpoints'
import { HttpResponse, http, server } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN, DEFAULT_REQUEST_ID } from './test-utils/test-defaults'
import { findViewOptions } from './utils/view-options'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi view options', () => {
    test('gets active view options through Sync', async () => {
        let requestBody: Record<string, unknown> | undefined
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                requestBody = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({
                    view_options: [
                        {
                            view_type: 'UPCOMING',
                            object_id: null,
                            view_mode: null,
                            sorted_by: 'DUE_DATE',
                            sort_order: 'ASC',
                            calendar_settings: {
                                layout: 'WEEK',
                                visible_day_count: 3,
                                color: 'PRIORITY',
                            },
                            is_deleted: false,
                            future_option: true,
                        },
                        {
                            view_type: 'FILTER',
                            object_id: 'deleted-filter',
                            is_deleted: true,
                        },
                    ],
                })
            }),
        )

        const result = await getTarget().getViewOptions()

        expect(requestBody).toEqual({ resource_types: ['view_options'], sync_token: '*' })
        expect(result).toEqual([
            {
                viewType: 'UPCOMING',
                objectId: null,
                viewMode: null,
                sortedBy: 'DUE_DATE',
                sortOrder: 'ASC',
                calendarSettings: {
                    layout: 'WEEK',
                    visibleDayCount: 3,
                    color: 'PRIORITY',
                },
                isDeleted: false,
                futureOption: true,
            },
        ])
    })

    test('propagates get failures', async () => {
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () =>
                HttpResponse.json({ error: 'failure' }, { status: 500 }),
            ),
        )

        await expect(getTarget().getViewOptions()).rejects.toThrow()
    })

    test('sets view options through Sync', async () => {
        let requestBody: { commands?: Array<Record<string, unknown>> } | undefined
        let requestId: string | null = null
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                requestBody = (await request.json()) as typeof requestBody
                requestId = request.headers.get('x-request-id')
                const commandId = requestBody?.commands?.[0]?.uuid as string
                return HttpResponse.json({ sync_status: { [commandId]: 'ok' } })
            }),
        )

        await getTarget().setViewOptions(
            {
                viewType: 'FILTER',
                objectId: 'filter1',
                viewMode: 'BOARD',
                groupedBy: 'ASSIGNEE',
                sortedBy: 'PRIORITY',
                sortOrder: 'DESC',
                calendarSettings: { layout: 'WEEK', visibleDayCount: 3 },
            },
            DEFAULT_REQUEST_ID,
        )

        expect(requestId).toBe(DEFAULT_REQUEST_ID)
        expect(requestBody?.commands?.[0]).toMatchObject({
            type: 'view_options_set',
            args: {
                view_type: 'FILTER',
                object_id: 'filter1',
                view_mode: 'BOARD',
                grouped_by: 'ASSIGNEE',
                sorted_by: 'PRIORITY',
                sort_order: 'DESC',
                calendar_settings: { layout: 'WEEK', visible_day_count: 3 },
            },
        })
    })

    test('deletes view options through Sync', async () => {
        let requestBody: { commands?: Array<Record<string, unknown>> } | undefined
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                requestBody = (await request.json()) as typeof requestBody
                const commandId = requestBody?.commands?.[0]?.uuid as string
                return HttpResponse.json({ sync_status: { [commandId]: 'ok' } })
            }),
        )

        await getTarget().deleteViewOptions({ viewType: 'TODAY' })

        expect(requestBody?.commands?.[0]).toMatchObject({
            type: 'view_options_delete',
            args: { view_type: 'TODAY' },
        })
    })
})

describe('findViewOptions', () => {
    const options = [
        { viewType: 'FILTER' as const, objectId: 'filter1', sortedBy: 'DUE_DATE' as const },
        {
            viewType: 'WORKSPACE_FILTER' as const,
            objectId: 'filter2',
            sortedBy: 'PRIORITY' as const,
        },
        { viewType: 'UPCOMING' as const, objectId: null, sortedBy: 'DEADLINE' as const },
        { viewType: 'TODAY' as const, isDeleted: true },
    ]

    test('matches object-backed views by type and ID', () => {
        expect(
            findViewOptions(options, {
                viewTypes: ['FILTER', 'WORKSPACE_FILTER'],
                objectId: 'filter2',
            })?.sortedBy,
        ).toBe('PRIORITY')
    })

    test('matches singleton views with null or omitted object IDs', () => {
        expect(findViewOptions(options, { viewTypes: ['UPCOMING'] })?.sortedBy).toBe('DEADLINE')
    })

    test('ignores deleted options', () => {
        expect(findViewOptions(options, { viewTypes: ['TODAY'] })).toBeUndefined()
    })
})
