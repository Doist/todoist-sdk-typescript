import { TodoistApi } from '.'
import { getSyncBaseUri } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN } from './test-utils/test-defaults'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi insights endpoints', () => {
    describe('getProjectActivityStats', () => {
        test('returns activity stats from rest client', async () => {
            const mockResponse = {
                day_items: [
                    { date: '2025-01-13', total_count: 3 },
                    { date: '2025-01-14', total_count: 5 },
                ],
                week_items: null,
            }
            server.use(
                http.get(`${getSyncBaseUri()}projects/123/insights/activity_stats`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getProjectActivityStats('123')

            expect(result.dayItems).toHaveLength(2)
            expect(result.dayItems[0]).toMatchObject({
                date: '2025-01-13',
                totalCount: 3,
            })
            expect(result.weekItems).toBeNull()
        })

        test('returns weekly counts when requested', async () => {
            const mockResponse = {
                day_items: [{ date: '2025-01-13', total_count: 3 }],
                week_items: [
                    {
                        from_date: '2025-01-06',
                        to_date: '2025-01-12',
                        total_count: 18,
                    },
                ],
            }
            server.use(
                http.get(`${getSyncBaseUri()}projects/123/insights/activity_stats`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getProjectActivityStats('123', {
                weeks: 4,
                includeWeeklyCounts: true,
            })

            expect(result.weekItems).toHaveLength(1)
            expect(result.weekItems![0]).toMatchObject({
                fromDate: '2025-01-06',
                toDate: '2025-01-12',
                totalCount: 18,
            })
        })
    })

    describe('getProjectHealth', () => {
        test('returns health status from rest client', async () => {
            const mockResponse = {
                status: 'ON_TRACK',
                description: 'Project is on track',
                description_summary: 'On track',
                project_id: '123',
                updated_at: '2025-01-15T00:00:00Z',
                is_stale: false,
                update_in_progress: false,
            }
            server.use(
                http.get(`${getSyncBaseUri()}projects/123/insights/health`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getProjectHealth('123')

            expect(result.status).toBe('ON_TRACK')
            expect(result.descriptionSummary).toBe('On track')
            expect(result.projectId).toBe('123')
        })
    })

    describe('getProjectHealthContext', () => {
        test('returns health context from rest client', async () => {
            const mockResponse = {
                project_id: '123',
                project_name: 'My Project',
                project_description: null,
                project_metrics: {
                    total_tasks: 10,
                    completed_tasks: 5,
                    overdue_tasks: 2,
                    tasks_created_this_week: 3,
                    tasks_completed_this_week: 1,
                    average_completion_time: 2.5,
                },
                tasks: [
                    {
                        id: '1',
                        content: 'Task 1',
                        due: null,
                        deadline: null,
                        priority: '4',
                        is_completed: false,
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-10T00:00:00Z',
                        completed_at: null,
                        completed_by_uid: null,
                        labels: ['work'],
                    },
                ],
            }
            server.use(
                http.get(`${getSyncBaseUri()}projects/123/insights/health/context`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getProjectHealthContext('123')

            expect(result.projectId).toBe('123')
            expect(result.projectMetrics.totalTasks).toBe(10)
            expect(result.tasks).toHaveLength(1)
        })
    })

    describe('getProjectProgress', () => {
        test('returns progress from rest client', async () => {
            const mockResponse = {
                project_id: '123',
                completed_count: 5,
                active_count: 10,
                progress_percent: 33,
            }
            server.use(
                http.get(`${getSyncBaseUri()}projects/123/insights/progress`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getProjectProgress('123')

            expect(result).toMatchObject({
                projectId: '123',
                completedCount: 5,
                activeCount: 10,
                progressPercent: 33,
            })
        })
    })

    describe('getWorkspaceInsights', () => {
        test('returns an empty list when the workspace has no insights', async () => {
            const mockResponse = {
                project_insights: [],
            }
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/456/insights`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getWorkspaceInsights('456')

            expect(result.projectInsights).toEqual([])
        })

        test('returns workspace insights from rest client', async () => {
            const mockResponse = {
                project_insights: [
                    {
                        project_id: '123',
                        health: {
                            status: 'ON_TRACK',
                            is_stale: false,
                            update_in_progress: false,
                        },
                        progress: {
                            project_id: '123',
                            completed_count: 5,
                            active_count: 10,
                            progress_percent: 33,
                        },
                    },
                ],
            }
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/456/insights`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.getWorkspaceInsights('456')

            expect(result.projectInsights).toHaveLength(1)
            expect(result.projectInsights[0].health?.status).toBe('ON_TRACK')
            expect(result.projectInsights[0].progress?.progressPercent).toBe(33)
        })
    })

    describe('analyzeProjectHealth', () => {
        test('returns health from rest client', async () => {
            const mockResponse = {
                status: 'AT_RISK',
                description: 'Several tasks overdue',
                is_stale: false,
                update_in_progress: false,
            }
            server.use(
                http.post(`${getSyncBaseUri()}projects/123/insights/health/analyze`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const api = getTarget()

            const result = await api.analyzeProjectHealth('123')

            expect(result.status).toBe('AT_RISK')
            expect(result.description).toBe('Several tasks overdue')
        })
    })
})
