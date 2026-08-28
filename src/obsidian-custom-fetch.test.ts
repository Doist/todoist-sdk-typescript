/**
 * Integration tests demonstrating custom fetch with Obsidian's requestUrl API.
 *
 * These tests validate that the Todoist API SDK works correctly in Obsidian plugins,
 * which have restricted networking that requires using Obsidian's requestUrl instead
 * of standard fetch.
 *
 * This addresses issue #381: https://github.com/Doist/todoist-api-typescript/issues/381
 */

import type { RequestUrlParam, RequestUrlResponse } from 'obsidian'
import { vi } from 'vitest'
import { TodoistApi, type CurrentUser } from '.'
import {
    getSyncBaseUri,
    ENDPOINT_REST_USER,
    ENDPOINT_REST_TASKS,
    ENDPOINT_REST_PROJECTS,
    ENDPOINT_REST_LABELS,
} from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { createObsidianFetchAdapter } from './test-utils/obsidian-fetch-adapter'
import { DEFAULT_AUTH_TOKEN, DEFAULT_TASK, DEFAULT_LABEL } from './test-utils/test-defaults'

describe('Obsidian Custom Fetch Integration', () => {
    // Mock Obsidian's requestUrl function
    const mockRequestUrl =
        vi.fn<(request: RequestUrlParam | string) => Promise<RequestUrlResponse>>()

    beforeEach(() => {
        vi.clearAllMocks()

        // Configure mock to call through to MSW and return Obsidian-shaped responses
        mockRequestUrl.mockImplementation(async (request: RequestUrlParam | string) => {
            const params = typeof request === 'string' ? { url: request } : request
            const url = params.url
            const method = params.method || 'GET'
            const headers = params.headers || {}
            const body = params.body

            // Make actual request to MSW handlers
            const response = await fetch(url, {
                method,
                headers,
                body: body as BodyInit,
            })

            // Clone response to read body twice
            const responseClone = response.clone()
            const text = await response.text()
            let json: unknown
            try {
                json = text ? JSON.parse(text) : null
            } catch {
                json = null
            }

            const responseHeaders: Record<string, string> = {}
            responseClone.headers.forEach((value, key) => {
                responseHeaders[key] = value
            })

            // Return Obsidian-shaped response (properties, not methods)
            return {
                status: responseClone.status,
                headers: responseHeaders,
                arrayBuffer: await responseClone.arrayBuffer(),
                json,
                text,
            }
        })
    })

    describe('GET requests', () => {
        it('should get current user (simple GET, no parameters)', async () => {
            const mockUser: CurrentUser = {
                id: '123456789',
                email: 'test@example.com',
                fullName: 'Test User',
                avatarBig: null,
                avatarMedium: null,
                avatarS640: null,
                avatarSmall: null,
                businessAccountId: null,
                isPremium: true,
                premiumStatus: 'current_personal_plan',
                dateFormat: 0,
                timeFormat: 0,
                weeklyGoal: 100,
                dailyGoal: 10,
                completedCount: 1000,
                completedToday: 5,
                karma: 5000.0,
                karmaTrend: 'up',
                lang: 'en',
                nextWeek: 1,
                startDay: 1,
                startPage: 'project?id=123',
                tzInfo: {
                    gmtString: '+00:00',
                    hours: 0,
                    isDst: 0,
                    minutes: 0,
                    timezone: 'UTC',
                },
                inboxProjectId: '123',
                daysOff: [6, 7],
                weekendStartDay: 6,
            }

            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json(mockUser, { status: 200 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            const user = await api.getUser()

            expect(user).toEqual(mockUser)
            expect(mockRequestUrl).toHaveBeenCalledWith({
                url: `${getSyncBaseUri()}${ENDPOINT_REST_USER}`,
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: `Bearer ${DEFAULT_AUTH_TOKEN}`,
                }),
                body: undefined,
                throw: false,
            })
        })

        it('should get task by id (GET with path parameter)', async () => {
            const taskId = '123'
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/${taskId}`, () => {
                    return HttpResponse.json(DEFAULT_TASK, { status: 200 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            const task = await api.getTask(taskId)

            expect(task).toEqual(DEFAULT_TASK)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: `${getSyncBaseUri()}${ENDPOINT_REST_TASKS}/${taskId}`,
                    method: 'GET',
                }),
            )
        })

        it('should get tasks with filters (GET with query parameters)', async () => {
            const projectId = '123'
            const tasks = [DEFAULT_TASK]

            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, ({ request }) => {
                    const url = new URL(request.url)
                    expect(url.searchParams.get('project_id')).toBe(projectId)
                    return HttpResponse.json({ results: tasks, nextCursor: null }, { status: 200 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            const { results, nextCursor } = await api.getTasks({ projectId })

            expect(results).toEqual(tasks)
            expect(nextCursor).toBeNull()
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: expect.stringContaining('project_id=123'),
                    method: 'GET',
                }),
            )
        })
    })

    describe('POST requests', () => {
        it('should add task (POST with JSON body)', async () => {
            const newTask = { content: 'New task' }

            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`, async ({ request }) => {
                    const body = await request.json()
                    expect(body).toEqual(newTask)
                    return HttpResponse.json(DEFAULT_TASK, { status: 200 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            const task = await api.addTask(newTask)

            expect(task).toEqual(DEFAULT_TASK)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: `${getSyncBaseUri()}${ENDPOINT_REST_TASKS}`,
                    method: 'POST',
                    body: JSON.stringify(newTask),
                }),
            )
        })

        it('should update label (POST with path parameter and body)', async () => {
            const labelId = '456'
            const updates = { name: 'Updated Label' }

            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_LABELS}/${labelId}`,
                    async ({ request }) => {
                        const body = await request.json()
                        expect(body).toEqual(updates)
                        return HttpResponse.json({ ...DEFAULT_LABEL, ...updates }, { status: 200 })
                    },
                ),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            const label = await api.updateLabel(labelId, updates)

            expect(label.name).toBe('Updated Label')
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: `${getSyncBaseUri()}${ENDPOINT_REST_LABELS}/${labelId}`,
                    method: 'POST',
                    body: JSON.stringify(updates),
                }),
            )
        })
    })

    describe('DELETE requests', () => {
        it('should delete project (DELETE returning 204)', async () => {
            const projectId = '789'

            server.use(
                http.delete(`${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/${projectId}`, () => {
                    return new HttpResponse(null, { status: 204 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            const result = await api.deleteProject(projectId)

            expect(result).toBe(true)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: `${getSyncBaseUri()}${ENDPOINT_REST_PROJECTS}/${projectId}`,
                    method: 'DELETE',
                }),
            )
        })
    })

    describe('Error handling', () => {
        it('should handle HTTP errors correctly', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_USER}`, () => {
                    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
                }),
            )

            const api = new TodoistApi(DEFAULT_AUTH_TOKEN, {
                customFetch: createObsidianFetchAdapter(mockRequestUrl),
            })

            await expect(api.getUser()).rejects.toThrow()

            // Verify throw: false was set (so we can handle errors)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    throw: false,
                }),
            )
        })
    })
})
