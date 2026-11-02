import { TodoistApi } from '.'
import { ENDPOINT_SYNC, getSyncBaseUri } from './consts/endpoints'
import { HttpResponse, http, server } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN, DEFAULT_REQUEST_ID } from './test-utils/test-defaults'

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

    test('clears calendar settings through Sync', async () => {
        let requestBody: { commands?: Array<Record<string, unknown>> } | undefined
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                requestBody = (await request.json()) as typeof requestBody
                const commandId = requestBody?.commands?.[0]?.uuid as string
                return HttpResponse.json({ sync_status: { [commandId]: 'ok' } })
            }),
        )

        await getTarget().setViewOptions({ viewType: 'TODAY', calendarSettings: null })

        expect(requestBody?.commands?.[0]).toMatchObject({
            type: 'view_options_set',
            args: { view_type: 'TODAY', calendar_settings: null },
        })
    })

    test('accepts only known values when setting view options, at compile time', async () => {
        server.use(
            http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                const body = (await request.json()) as { commands: Array<{ uuid: string }> }
                return HttpResponse.json({ sync_status: { [body.commands[0].uuid]: 'ok' } })
            }),
        )
        const api = getTarget()

        await api.setViewOptions({
            viewType: 'ASSIGNED_TO_ME',
            viewMode: 'TABLE',
            sortedBy: 'LABEL',
        })
        // @ts-expect-error unknown view mode
        await api.setViewOptions({ viewType: 'TODAY', viewMode: 'NEW_MODE' })
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

    describe('property settings', () => {
        // `added_date` and `addedDate` are distinct property IDs that any case conversion would merge.
        const properties = {
            'field:6Jf8VQXx': { width: 180, future_attribute: { 'option:Ab3Cd': 'x' } },
            added_date: { is_hidden: true },
            addedDate: { width: 120 },
        }

        test('gets property settings with every key as the API sent it', async () => {
            const propertySettings = { order: ['field:6Jf8VQXx', 'addedDate'], properties }
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () =>
                    HttpResponse.json({
                        view_options: [{ view_type: 'TODAY', property_settings: propertySettings }],
                    }),
                ),
            )

            const [result] = await getTarget().getViewOptions()

            expect(result.propertySettings).toEqual(propertySettings)
        })

        test('sets a property settings patch, nulls included, with every key as given', async () => {
            let args: unknown
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                    const body = (await request.json()) as {
                        commands: Array<{ uuid: string; args: unknown }>
                    }
                    args = body.commands[0].args
                    return HttpResponse.json({ sync_status: { [body.commands[0].uuid]: 'ok' } })
                }),
            )
            const patch = { order: null, properties: { ...properties, due: { width: null } } }

            await getTarget().setViewOptions({ viewType: 'TODAY', propertySettings: patch })

            expect(args).toEqual({ view_type: 'TODAY', property_settings: patch })
        })
    })
})
