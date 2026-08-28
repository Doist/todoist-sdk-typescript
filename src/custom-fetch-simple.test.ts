import { vi } from 'vitest'
import { TodoistApi, type CurrentUser } from '.'
import { getSyncBaseUri, ENDPOINT_REST_USER } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { CustomFetch, CustomFetchResponse } from './types/http'

const DEFAULT_AUTH_TOKEN = 'test-auth-token'

const MOCK_CURRENT_USER: CurrentUser = {
    id: '123456789',
    email: 'test.user@example.com',
    fullName: 'Test User',
    avatarBig: 'https://example.com/avatars/test_user_big.jpg',
    avatarMedium: 'https://example.com/avatars/test_user_medium.jpg',
    avatarS640: 'https://example.com/avatars/test_user_s640.jpg',
    avatarSmall: 'https://example.com/avatars/test_user_small.jpg',
    businessAccountId: null,
    isPremium: true,
    premiumStatus: 'current_personal_plan',
    dateFormat: 0,
    timeFormat: 0,
    weeklyGoal: 100,
    dailyGoal: 10,
    completedCount: 102920,
    completedToday: 12,
    karma: 86394.0,
    karmaTrend: 'up',
    lang: 'en',
    nextWeek: 1,
    startDay: 1,
    startPage: 'project?id=test_project_123',
    tzInfo: {
        gmtString: '+02:00',
        hours: 2,
        isDst: 1,
        minutes: 0,
        timezone: 'Europe/Madrid',
    },
    inboxProjectId: 'test_project_123',
    daysOff: [6, 7],
    weekendStartDay: 6,
}

describe('Custom Fetch Core Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Constructor Options', () => {
        it('should accept customFetch in options', () => {
            const mockCustomFetch: CustomFetch = vi.fn()
            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: mockCustomFetch,
            })
            expect(api).toBeInstanceOf(TodoistApi)
        })
    })

    describe('Custom Fetch Usage', () => {
        it('should call custom fetch when provided', async () => {
            const mockCustomFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                text: () => Promise.resolve(JSON.stringify(MOCK_CURRENT_USER)),
                json: () => Promise.resolve(MOCK_CURRENT_USER),
            } as CustomFetchResponse)

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: mockCustomFetch,
            })

            await api.getUser()

            expect(mockCustomFetch).toHaveBeenCalledWith(
                `${getSyncBaseUri()}${ENDPOINT_REST_USER}`,
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${DEFAULT_AUTH_TOKEN}`,
                    }),
                }),
            )
        })

        it('should use native fetch when no custom fetch provided', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(MOCK_CURRENT_USER, { status: 200 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN)
            const user = await api.getUser()

            expect(user).toEqual(MOCK_CURRENT_USER)
        })
    })
})
