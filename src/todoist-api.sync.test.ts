import { ZodError } from 'zod'
import { TodoistApi } from '.'
import { getSyncBaseUri, ENDPOINT_SYNC } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import {
    DEFAULT_AUTH_TOKEN,
    DEFAULT_TASK,
    DEFAULT_LABEL,
    DEFAULT_SECTION,
    DEFAULT_COLLABORATOR,
    DEFAULT_COLLABORATOR_STATE,
    DEFAULT_NOTE,
    DEFAULT_FOLDER,
} from './test-utils/test-defaults'
import { createCommand } from './utils/sync-helpers'
import { parseSyncResponse } from './utils/validators'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi sync endpoint', () => {
    describe('sync', () => {
        test('returns a sync response', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                    return HttpResponse.json({ sync_token: 'token123' }, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.sync({
                commands: [createCommand('item_add', { content: 'Buy milk' })],
                resourceTypes: ['items'],
                syncToken: '*',
            })

            expect(response.syncToken).toBe('token123')
        })

        test('sends the command type and args in the request body', async () => {
            let capturedBody:
                | { commands: Array<{ type: string; args: unknown }> }
                | null
                | undefined

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, async ({ request }) => {
                    capturedBody = (await request.json()) as typeof capturedBody
                    return HttpResponse.json({ sync_token: 'token123' }, { status: 200 })
                }),
            )
            const api = getTarget()

            await api.sync({
                commands: [createCommand('item_add', { content: 'Buy milk' })],
                syncToken: '*',
            })

            expect(capturedBody).toBeDefined()
            expect(capturedBody?.commands[0].type).toBe('item_add')
            expect(capturedBody?.commands[0].args).toEqual({ content: 'Buy milk' })
        })

        test('rejects invalid command name in sync request at compile time', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                    return HttpResponse.json({}, { status: 200 })
                }),
            )
            const api = getTarget()

            await api.sync({
                commands: [
                    // @ts-expect-error invalid command name
                    createCommand('task_add', { content: 'Buy milk' }),
                ],
                resourceTypes: ['items'],
                syncToken: '*',
            })
        })

        test('parses resource arrays through Zod validators', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                    return HttpResponse.json(
                        {
                            sync_token: 'token123',
                            items: [DEFAULT_TASK],
                            labels: [DEFAULT_LABEL],
                            sections: [DEFAULT_SECTION],
                        },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const response = await api.sync({
                resourceTypes: ['items', 'labels', 'sections'],
                syncToken: '*',
            })

            expect(response.items).toEqual([DEFAULT_TASK])
            expect(response.labels).toEqual([DEFAULT_LABEL])
            expect(response.sections).toEqual([DEFAULT_SECTION])
        })

        test('throws ZodError for invalid resource data', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_SYNC}`, () => {
                    return HttpResponse.json(
                        {
                            sync_token: 'token123',
                            items: [{ invalid: true }],
                        },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            await expect(
                api.sync({
                    resourceTypes: ['items'],
                    syncToken: '*',
                }),
            ).rejects.toThrow(ZodError)
        })
    })
})

describe('parseSyncResponse', () => {
    test('passes through metadata fields unchanged', () => {
        const response = {
            syncToken: 'token123',
            fullSync: true,
            tempIdMapping: { temp1: 'real1' },
        }

        const result = parseSyncResponse(response)

        expect(result.syncToken).toBe('token123')
        expect(result.fullSync).toBe(true)
        expect(result.tempIdMapping).toEqual({ temp1: 'real1' })
    })

    test('passes through unschema fields unchanged', () => {
        const response = {
            syncToken: 'token123',
            dayOrders: { '123': 1, '456': 2 },
            stats: { foo: 'bar' },
            notificationSettings: { emailNotifications: true },
        }

        const result = parseSyncResponse(response)

        expect(result.dayOrders).toEqual({ '123': 1, '456': 2 })
        expect(result.stats).toEqual({ foo: 'bar' })
        expect(result.notificationSettings).toEqual({ emailNotifications: true })
    })

    test('handles empty response', () => {
        const result = parseSyncResponse({})
        expect(result).toEqual({})
    })

    test('validates resource arrays', () => {
        const response = {
            items: [DEFAULT_TASK],
            labels: [DEFAULT_LABEL],
            sections: [DEFAULT_SECTION],
            notes: [DEFAULT_NOTE],
            collaborators: [DEFAULT_COLLABORATOR],
            collaboratorStates: [DEFAULT_COLLABORATOR_STATE],
            folders: [DEFAULT_FOLDER],
        }

        const result = parseSyncResponse(response)

        expect(result.items).toEqual([DEFAULT_TASK])
        expect(result.labels).toEqual([DEFAULT_LABEL])
        expect(result.sections).toEqual([DEFAULT_SECTION])
        expect(result.notes).toEqual([DEFAULT_NOTE])
        expect(result.collaborators).toEqual([DEFAULT_COLLABORATOR])
        expect(result.collaboratorStates).toEqual([DEFAULT_COLLABORATOR_STATE])
        expect(result.folders).toEqual([DEFAULT_FOLDER])
    })

    test('throws ZodError for invalid items', () => {
        const response = {
            items: [{ invalid: true }],
        }

        expect(() => parseSyncResponse(response)).toThrow(ZodError)
    })

    test('applies SyncUser transforms', () => {
        const rawUser = {
            id: '1',
            email: 'test@test.com',
            fullName: 'Test User',
            activatedUser: true,
            autoReminder: 0,
            businessAccountId: null,
            dailyGoal: 5,
            dateFormat: 0,
            dateistLang: null,
            daysOff: [6, 7],
            featureIdentifier: 'abc',
            features: {
                karmaDisabled: false,
                restriction: 0,
                karmaVacation: false,
                dateistLang: null,
                beta: 1,
                hasPushReminders: true,
                dateistInlineDisabled: false,
            },
            hasMagicNumber: false,
            hasPassword: true,
            imageId: null,
            inboxProjectId: '100',
            isCelebrationsEnabled: true,
            isPremium: false,
            joinableWorkspace: null,
            joinedAt: '2020-01-01',
            gettingStartedGuideProjects: null,
            karma: 100,
            karmaTrend: 'up',
            lang: 'en',
            mobileHost: null,
            mobileNumber: null,
            nextWeek: 1,
            premiumStatus: 'not_premium',
            premiumUntil: null,
            shareLimit: 5,
            sortOrder: 0,
            startDay: 1,
            startPage: 'inbox',
            themeId: '0',
            timeFormat: 0,
            token: 'abc123',
            tzInfo: {
                timezone: 'UTC',
                hours: 0,
                minutes: 0,
                isDst: 0,
                gmtString: 'GMT+0',
            },
            uniquePrefix: 1,
            verificationStatus: 'verified',
            websocketUrl: 'wss://example.com',
            weekendStartDay: 6,
            weeklyGoal: 25,
        }

        const result = parseSyncResponse({ user: rawUser })

        expect(result.user?.dateFormat).toBe('DD/MM/YYYY')
        expect(result.user?.timeFormat).toBe('24h')
        expect(result.user?.startDay).toBe('Monday')
        expect(result.user?.nextWeek).toBe('Monday')
        expect(result.user?.features.beta).toBe(true)
        expect(result.user?.tzInfo.isDst).toBe(false)
    })

    test('applies SyncWorkspace transform for dateCreated normalization', () => {
        const rawWorkspace = {
            id: '1',
            name: 'Test Workspace',
            description: '',
            creatorId: '2',
            dateCreated: '2020-01-01',
            isDeleted: false,
            isCollapsed: false,
            plan: 'STARTER',
            currentActiveProjects: 5,
            currentMemberCount: 3,
            currentTemplateCount: 0,
            adminSortingApplied: false,
        }

        const result = parseSyncResponse({ workspaces: [rawWorkspace] })

        expect(result.workspaces?.[0].createdAt).toEqual(new Date('2020-01-01'))
    })

    test('throws ZodError when resource has wrong type (object instead of array)', () => {
        expect(() => parseSyncResponse({ items: {} })).toThrow(ZodError)
    })

    test('throws ZodError when resource is null', () => {
        expect(() => parseSyncResponse({ items: null })).toThrow(ZodError)
    })

    test('preserves unknown top-level fields', () => {
        const response = {
            syncToken: 'token123',
            someNewField: { nested: true },
        }

        const result = parseSyncResponse(response)

        expect((result as Record<string, unknown>).someNewField).toEqual({ nested: true })
    })

    test('does not parse absent resource fields', () => {
        const response = {
            syncToken: 'token123',
        }

        const result = parseSyncResponse(response)

        expect(result.items).toBeUndefined()
        expect(result.projects).toBeUndefined()
        expect(result.user).toBeUndefined()
    })
})
