import { TodoistApi, type CurrentUser } from '.'
import { getSyncBaseUri, ENDPOINT_REST_USER, ENDPOINT_REST_PRODUCTIVITY } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN } from './test-utils/test-defaults'

function getTarget(baseUrl = 'https://api.todoist.com') {
    return new TodoistApi(DEFAULT_AUTH_TOKEN, { baseUrl })
}

const DEFAULT_CURRENT_USER_RESPONSE: CurrentUser = {
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

const PRODUCTIVITY_STATS_RESPONSE = {
    completedCount: 42,
    daysItems: [
        {
            date: '2025-01-01',
            items: [],
            totalCompleted: 0,
        },
        {
            date: '2025-01-02',
            items: [{ completed: 2, id: 'dummy-id-1' }],
            totalCompleted: 2,
        },
    ],
    goals: {
        currentDailyStreak: { count: 3, end: '2025-01-02', start: '2025-01-01' },
        currentWeeklyStreak: { count: 1, end: '2025-01-02', start: '2025-01-01' },
        dailyGoal: 5,
        ignoreDays: [5, 6],
        karmaDisabled: 0,
        lastDailyStreak: { count: 2, end: '2025-01-01', start: '2024-12-31' },
        lastWeeklyStreak: { count: 1, end: '2024-12-31', start: '2024-12-25' },
        maxDailyStreak: { count: 4, end: '2024-12-20', start: '2024-12-17' },
        maxWeeklyStreak: { count: 2, end: '2024-12-10', start: '2024-12-03' },
        user: 'dummy-user',
        userId: 'dummy-user-id',
        vacationMode: 1,
        weeklyGoal: 10,
    },
    karma: 1234,
    karmaGraphData: [{ date: '2025-01-01', karmaAvg: 1000 }],
    karmaLastUpdate: 5,
    karmaTrend: 'down',
    karmaUpdateReasons: [
        {
            negativeKarma: 1,
            negativeKarmaReasons: ['reason1'],
            newKarma: 1234,
            positiveKarma: 2,
            positiveKarmaReasons: ['reasonA'],
            time: '2025-01-02T12:00:00.000Z',
        },
    ],
    projectColors: { dummyProjectId: 'blue' },
    weekItems: [
        {
            from: '2025-01-01',
            items: [{ completed: 3, id: 'dummy-id-2' }],
            to: '2025-01-07',
            totalCompleted: 3,
        },
    ],
}

describe('TodoistApi user endpoints', () => {
    describe('getUser', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(DEFAULT_CURRENT_USER_RESPONSE, { status: 200 })
                }),
            )
            const api = getTarget()

            const actual = await api.getUser()

            expect(actual).toEqual(DEFAULT_CURRENT_USER_RESPONSE)
        })

        test('returns result from rest client against staging', async () => {
            const stagingBaseUrl = 'https://api.todoist-staging.com'
            server.use(
                http.get(`${getSyncBaseUri(stagingBaseUrl)}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(DEFAULT_CURRENT_USER_RESPONSE, { status: 200 })
                }),
            )
            const api = getTarget(stagingBaseUrl)

            const actual = await api.getUser()

            expect(actual).toEqual(DEFAULT_CURRENT_USER_RESPONSE)
        })

        test('handles user with null business account id', async () => {
            const responseWithNullBusinessAccount = {
                ...DEFAULT_CURRENT_USER_RESPONSE,
                businessAccountId: null,
            }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(responseWithNullBusinessAccount, { status: 200 })
                }),
            )
            const api = getTarget()

            const actual = await api.getUser()

            expect(actual.businessAccountId).toBeNull()
        })

        test('handles user with null avatar fields', async () => {
            const responseWithNullAvatars = {
                ...DEFAULT_CURRENT_USER_RESPONSE,
                avatarBig: null,
                avatarMedium: null,
                avatarS640: null,
                avatarSmall: null,
            }
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(responseWithNullAvatars, { status: 200 })
                }),
            )
            const api = getTarget()

            const actual = await api.getUser()

            expect(actual.avatarBig).toBeNull()
            expect(actual.avatarMedium).toBeNull()
            expect(actual.avatarS640).toBeNull()
            expect(actual.avatarSmall).toBeNull()
        })

        test('handles user with tzInfo field', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(DEFAULT_CURRENT_USER_RESPONSE, { status: 200 })
                }),
            )
            const api = getTarget()

            const actual = await api.getUser()

            expect(actual.tzInfo).toEqual({
                gmtString: '+02:00',
                hours: 2,
                isDst: 1,
                minutes: 0,
                timezone: 'Europe/Madrid',
            })
            expect(actual.tzInfo.timezone).toBe('Europe/Madrid')
        })
    })

    describe('getProductivityStats', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_PRODUCTIVITY}`, () => {
                    return HttpResponse.json(PRODUCTIVITY_STATS_RESPONSE, { status: 200 })
                }),
            )
            const api = getTarget()
            const stats = await api.getProductivityStats()
            expect(stats).toEqual({
                ...PRODUCTIVITY_STATS_RESPONSE,
                goals: {
                    ...PRODUCTIVITY_STATS_RESPONSE.goals,
                    ignoreDays: ['Friday', 'Saturday'],
                    karmaDisabled: false,
                    vacationMode: true,
                },
            })
            expect(stats.goals.karmaDisabled).toBe(false)
            expect(stats.goals.vacationMode).toBe(true)
            expect(stats.goals.ignoreDays).toEqual(['Friday', 'Saturday'])
        })
    })
})
