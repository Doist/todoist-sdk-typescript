import { vi } from 'vitest'
import { getSyncBaseUri } from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { TodoistApi } from './todoist-api'
import { uploadMultipartFile } from './utils/multipart-upload'

// Mock the multipart upload helper
vi.mock('./utils/multipart-upload')
const mockedUploadMultipartFile = vi.mocked(uploadMultipartFile)

describe('TodoistApi workspaces', () => {
    const api = new TodoistApi('token')

    beforeEach(() => {
        vi.clearAllMocks()
    })

    // Test fixtures
    const mockBusinessWorkspace = {
        id: '12345',
        name: 'My Workspace',
        plan: 'BUSINESS',
        role: 'ADMIN',
        invite_code: 'invite123',
        is_link_sharing_enabled: true,
        is_guest_allowed: false,
        limits: {
            current: {
                max_projects: 300,
                max_workspace_users: 100,
                upload_limit_mb: 100,
                plan_name: 'teams_workspaces_business',
            },
            next: null,
        },
        logo_big: 'https://example.com/logo_big.jpg',
        logo_medium: 'https://example.com/logo_medium.jpg',
        logo_small: 'https://example.com/logo_small.jpg',
        logo_s640: 'https://example.com/logo_s640.jpg',
        created_at: '2023-01-01T00:00:00Z',
        creator_id: '98765',
        properties: {},
    }

    const mockStarterWorkspace = {
        id: '67890',
        name: 'Personal',
        plan: 'STARTER',
        role: 'ADMIN',
        invite_code: 'invite456',
        is_link_sharing_enabled: false,
        is_guest_allowed: false,
        limits: {
            current: {
                max_projects: 5,
                max_workspace_users: 5,
                upload_limit_mb: 5,
                plan_name: 'teams_workspaces_starter',
            },
            next: null,
        },
        created_at: '2023-06-01T00:00:00Z',
        creator_id: '11111',
        properties: {},
    }

    describe('getWorkspaceInvitations', () => {
        test('gets workspace invitations', async () => {
            const mockResponse = ['user1@example.com', 'user2@example.com']
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/invitations`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceInvitations({ workspaceId: '123' })

            expect(result).toEqual(mockResponse)
        })

        test('gets workspace invitations with requestId', async () => {
            const mockResponse = ['user@example.com']
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/invitations`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )
            const requestId = 'test-request'

            const result = await api.getWorkspaceInvitations({ workspaceId: '456' }, requestId)

            expect(result).toEqual(mockResponse)
        })
    })

    describe('getAllWorkspaceInvitations', () => {
        test('gets all workspace invitations', async () => {
            const mockResponse = [
                {
                    id: '1',
                    inviterId: '123',
                    userEmail: 'admin@example.com',
                    workspaceId: '456',
                    role: 'ADMIN' as const,
                },
            ]
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/invitations/all`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getAllWorkspaceInvitations()

            expect(result).toEqual(mockResponse)
        })

        test('gets all workspace invitations with requestId', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/invitations/all`, () => {
                    return HttpResponse.json([], { status: 200 })
                }),
            )
            const requestId = 'admin-request'

            const result = await api.getAllWorkspaceInvitations({}, requestId)

            expect(result).toEqual([])
        })
    })

    describe('deleteWorkspaceInvitation', () => {
        const mockInvitation = {
            id: '123',
            inviterId: '456',
            userEmail: 'user@example.com',
            workspaceId: '789',
            role: 'MEMBER' as const,
        }

        test('deletes workspace invitation', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}workspaces/invitations/delete`, () => {
                    return HttpResponse.json(mockInvitation, { status: 200 })
                }),
            )

            const result = await api.deleteWorkspaceInvitation({
                workspaceId: '789',
                userEmail: 'user@example.com',
            })

            expect(result).toEqual(mockInvitation)
        })
    })

    describe('acceptWorkspaceInvitation', () => {
        const mockInvitation = {
            id: '123',
            inviterId: '456',
            userEmail: 'user@example.com',
            workspaceId: '789',
            role: 'GUEST' as const,
        }

        test('accepts workspace invitation', async () => {
            server.use(
                http.put(`${getSyncBaseUri()}workspaces/invitations/abc123/accept`, () => {
                    return HttpResponse.json(mockInvitation, { status: 200 })
                }),
            )

            const result = await api.acceptWorkspaceInvitation({ inviteCode: 'abc123' })

            expect(result).toEqual(mockInvitation)
        })
    })

    describe('rejectWorkspaceInvitation', () => {
        const mockInvitation = {
            id: '123',
            inviterId: '456',
            userEmail: 'user@example.com',
            workspaceId: '789',
            role: 'ADMIN' as const,
        }

        test('rejects workspace invitation', async () => {
            server.use(
                http.put(`${getSyncBaseUri()}workspaces/invitations/def456/reject`, () => {
                    return HttpResponse.json(mockInvitation, { status: 200 })
                }),
            )

            const result = await api.rejectWorkspaceInvitation({ inviteCode: 'def456' })

            expect(result).toEqual(mockInvitation)
        })
    })

    describe('joinWorkspace', () => {
        // Mock response in snake_case (API format)
        const mockJoinResponse = {
            custom_sorting_applied: true,
            project_sort_preference: 'alphabetical' as const,
            role: 'MEMBER' as const,
            user_id: '123',
            workspace_id: '456',
        }

        // Expected result after camelCase conversion
        const expectedJoinResult = {
            customSortingApplied: true,
            projectSortPreference: 'alphabetical' as const,
            role: 'MEMBER' as const,
            userId: '123',
            workspaceId: '456',
        }

        test('joins workspace via invite code', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}workspaces/join`, () => {
                    return HttpResponse.json(mockJoinResponse, { status: 200 })
                }),
            )

            const result = await api.joinWorkspace({ inviteCode: 'invite123' })

            expect(result).toEqual(expectedJoinResult)
        })

        test('joins workspace via workspace ID', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}workspaces/join`, () => {
                    return HttpResponse.json(mockJoinResponse, { status: 200 })
                }),
            )

            const result = await api.joinWorkspace({ workspaceId: '789' })

            expect(result).toEqual(expectedJoinResult)
        })
    })

    describe('uploadWorkspaceLogo', () => {
        const mockLogoResponse = { logoUrl: 'https://example.com/logo.png' }

        beforeEach(() => {
            mockedUploadMultipartFile.mockResolvedValue(mockLogoResponse)
        })

        test('uploads workspace logo from file', async () => {
            const result = await api.uploadWorkspaceLogo({
                workspaceId: '123',
                file: '/path/to/logo.png',
                fileName: 'logo.png',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith({
                baseUrl: getSyncBaseUri(),
                authToken: 'token',
                endpoint: 'workspaces/logo',
                file: '/path/to/logo.png',
                fileName: 'logo.png',
                additionalFields: { workspace_id: '123' },
                requestId: undefined,
            })
            expect(result).toEqual(mockLogoResponse)
        })

        test('uploads workspace logo from Buffer', async () => {
            const buffer = Buffer.from('logo data')

            await api.uploadWorkspaceLogo({
                workspaceId: '456',
                file: buffer,
                fileName: 'logo.jpg',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith({
                baseUrl: getSyncBaseUri(),
                authToken: 'token',
                endpoint: 'workspaces/logo',
                file: buffer,
                fileName: 'logo.jpg',
                additionalFields: { workspace_id: '456' },
                requestId: undefined,
            })
        })

        test('deletes workspace logo', async () => {
            await api.uploadWorkspaceLogo({
                workspaceId: '789',
                delete: true,
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith({
                baseUrl: getSyncBaseUri(),
                authToken: 'token',
                endpoint: 'workspaces/logo',
                file: expect.any(Buffer),
                fileName: 'delete',
                additionalFields: {
                    workspace_id: '789',
                    delete: true,
                },
                requestId: undefined,
            })
        })

        test('throws error when file missing and not deleting', async () => {
            await expect(
                api.uploadWorkspaceLogo({
                    workspaceId: '123',
                }),
            ).rejects.toThrow('file is required when not deleting logo')
        })
    })

    describe('getWorkspacePlanDetails', () => {
        const mockPlanDetails = {
            currentMemberCount: 5,
            currentPlan: 'Business' as const,
            currentPlanStatus: 'Active' as const,
            downgradeAt: null,
            currentActiveProjects: 10,
            maximumActiveProjects: 300,
            priceList: [],
            workspaceId: 123,
            isTrialing: false,
            trialEndsAt: null,
            cancelAtPeriodEnd: false,
            hasTrialed: true,
            planPrice: null,
            hasBillingPortal: true,
            hasBillingPortalSwitchToAnnual: false,
        }

        test('gets workspace plan details', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/plan_details`, () => {
                    return HttpResponse.json(mockPlanDetails, { status: 200 })
                }),
            )

            const result = await api.getWorkspacePlanDetails({ workspaceId: '123' })

            expect(result).toEqual({ ...mockPlanDetails, workspaceId: '123' })
        })
    })

    describe('getWorkspaceUsers', () => {
        const expectedUsers = [
            {
                userId: '1',
                workspaceId: '123',
                userEmail: 'user1@example.com',
                fullName: 'User One',
                timezone: 'UTC',
                role: 'ADMIN' as const,
                imageId: null,
                isDeleted: false,
            },
            {
                userId: '2',
                workspaceId: '123',
                userEmail: 'user2@example.com',
                fullName: 'User Two',
                timezone: 'PST',
                role: 'MEMBER' as const,
                imageId: 'img123',
                isDeleted: false,
            },
        ]

        // Mock response with snake_case keys (will be converted to camelCase by http-client)
        const mockResponse = {
            has_more: false,
            next_cursor: undefined,
            workspace_users: [
                {
                    user_id: '1',
                    workspace_id: '123',
                    user_email: 'user1@example.com',
                    full_name: 'User One',
                    timezone: 'UTC',
                    role: 'ADMIN' as const,
                    image_id: null,
                    is_deleted: false,
                },
                {
                    user_id: '2',
                    workspace_id: '123',
                    user_email: 'user2@example.com',
                    full_name: 'User Two',
                    timezone: 'PST',
                    role: 'MEMBER' as const,
                    image_id: 'img123',
                    is_deleted: false,
                },
            ],
        }

        test('gets workspace users with default parameters', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/users`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceUsers()

            expect(result).toEqual({
                hasMore: false,
                nextCursor: undefined,
                workspaceUsers: expectedUsers,
            })
        })

        test('gets workspace users with all parameters', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/users`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceUsers({
                workspaceId: '456',
                cursor: 'cursor123',
                limit: 50,
            })

            expect(result).toEqual({
                hasMore: false,
                nextCursor: undefined,
                workspaceUsers: expectedUsers,
            })
        })

        test('handles null workspace ID', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/users`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceUsers({ workspaceId: null })

            expect(result).toEqual({
                hasMore: false,
                nextCursor: undefined,
                workspaceUsers: expectedUsers,
            })
        })
    })

    describe('getWorkspaceActiveProjects', () => {
        const mockProjects = [
            {
                id: '1',
                name: 'Project 1',
                color: 'blue',
                parentId: null,
                inboxProject: false,
                isShared: false,
                isFavorite: false,
                viewStyle: 'list' as const,
                url: 'https://app.todoist.com/app/project/project-1-1',
                canAssignTasks: true,
                childOrder: 0,
                createdAt: '2023-01-01T00:00:00Z',
                isArchived: false,
                isDeleted: false,
                isFrozen: false,
                updatedAt: '2023-01-01T00:00:00Z',
                defaultOrder: 0,
                description: '',
                isCollapsed: false,
            },
        ]

        const mockResponse = {
            results: mockProjects,
            nextCursor: 'next123',
        }

        test('gets workspace active projects', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/123/projects/active`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceActiveProjects({
                workspaceId: '123',
                cursor: 'cursor456',
                limit: 25,
            })

            expect(result.results).toEqual(
                mockProjects.map((p) => ({
                    ...p,
                    createdAt: new Date(p.createdAt),
                    updatedAt: new Date(p.updatedAt),
                })),
            )
        })
    })

    describe('getWorkspaceArchivedProjects', () => {
        const mockResponse = {
            results: [],
            nextCursor: null,
        }

        test('gets workspace archived projects', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/789/projects/archived`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceArchivedProjects({
                workspaceId: '789',
            })

            expect(result.results).toEqual([])
        })
    })

    describe('getWorkspaces', () => {
        test('gets workspaces successfully via REST', async () => {
            const mockWorkspacesArray = [mockBusinessWorkspace, mockStarterWorkspace]

            server.use(
                http.get(`${getSyncBaseUri()}workspaces`, () => {
                    return HttpResponse.json(mockWorkspacesArray, { status: 200 })
                }),
            )

            const result = await api.getWorkspaces()

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({
                id: '12345',
                name: 'My Workspace',
                plan: 'BUSINESS',
                role: 'ADMIN',
                inviteCode: 'invite123',
                isLinkSharingEnabled: true,
                isGuestAllowed: false,
            })
        })

        test('coerces numeric id and creator_id to strings', async () => {
            const mockWithNumericIds = [
                {
                    id: 69,
                    name: 'Numeric ID Workspace',
                    plan: 'BUSINESS',
                    invite_code: 'invite789',
                    is_link_sharing_enabled: true,
                    is_guest_allowed: true,
                    creator_id: 499807,
                    date_created: '2022-08-16T11:16:22.433711Z',
                    properties: {},
                },
            ]

            server.use(
                http.get(`${getSyncBaseUri()}workspaces`, () => {
                    return HttpResponse.json(mockWithNumericIds, { status: 200 })
                }),
            )

            const result = await api.getWorkspaces()

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                id: '69',
                name: 'Numeric ID Workspace',
                plan: 'BUSINESS',
                creatorId: '499807',
                createdAt: new Date('2022-08-16T11:16:22.433711Z'),
            })
            // id and creatorId should be strings after coercion
            expect(typeof result[0].id).toBe('string')
            expect(typeof result[0].creatorId).toBe('string')
        })

        test('handles missing role, limits, and createdAt fields', async () => {
            const mockMinimalWorkspace = [
                {
                    id: '12345',
                    name: 'Minimal Workspace',
                    plan: 'STARTER',
                    invite_code: 'invite999',
                    is_link_sharing_enabled: false,
                    is_guest_allowed: false,
                    creator_id: '11111',
                    date_created: '2023-06-01T00:00:00Z',
                    properties: {},
                },
            ]

            server.use(
                http.get(`${getSyncBaseUri()}workspaces`, () => {
                    return HttpResponse.json(mockMinimalWorkspace, { status: 200 })
                }),
            )

            const result = await api.getWorkspaces()

            expect(result).toHaveLength(1)
            expect(result[0].role).toBeUndefined()
            expect(result[0].limits).toBeUndefined()
            // dateCreated from the API is normalized to createdAt
            expect(result[0].createdAt).toEqual(new Date('2023-06-01T00:00:00Z'))
        })

        test('validates workspace schema', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces`, () => {
                    return HttpResponse.json(
                        [
                            {
                                id: '123',
                                name: 'Invalid',
                                plan: 'INVALID_PLAN',
                            },
                        ],
                        { status: 200 },
                    )
                }),
            )

            await expect(api.getWorkspaces()).rejects.toThrow()
        })
    })

    describe('getWorkspace', () => {
        test('gets a single workspace by ID', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/12345`, () => {
                    return HttpResponse.json(mockBusinessWorkspace, { status: 200 })
                }),
            )

            const result = await api.getWorkspace('12345')

            expect(result).toMatchObject({
                id: '12345',
                name: 'My Workspace',
                plan: 'BUSINESS',
            })
        })
    })

    describe('addWorkspace', () => {
        test('creates a workspace', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}workspaces`, () => {
                    return HttpResponse.json(mockBusinessWorkspace, { status: 200 })
                }),
            )

            const result = await api.addWorkspace({ name: 'My Workspace' })

            expect(result).toMatchObject({
                id: '12345',
                name: 'My Workspace',
            })
        })
    })

    describe('updateWorkspace', () => {
        test('updates a workspace', async () => {
            const updatedWorkspace = { ...mockBusinessWorkspace, name: 'Updated Name' }
            server.use(
                http.post(`${getSyncBaseUri()}workspaces/12345`, () => {
                    return HttpResponse.json(updatedWorkspace, { status: 200 })
                }),
            )

            const result = await api.updateWorkspace('12345', { name: 'Updated Name' })

            expect(result).toMatchObject({
                id: '12345',
                name: 'Updated Name',
            })
        })
    })

    describe('deleteWorkspace', () => {
        test('deletes a workspace', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}workspaces/12345`, () => {
                    return HttpResponse.json(undefined, { status: 204 })
                }),
            )

            const result = await api.deleteWorkspace('12345')

            expect(result).toEqual(true)
        })
    })

    describe('getWorkspaceMembersActivity', () => {
        test('gets workspace members activity', async () => {
            const mockResponse = {
                members: [
                    { user_id: '123', tasks_assigned: 5, tasks_overdue: 2 },
                    { user_id: '456', tasks_assigned: 3, tasks_overdue: 0 },
                ],
            }
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/members`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceMembersActivity({ workspaceId: '123' })

            expect(result.members).toHaveLength(2)
            expect(result.members[0]).toMatchObject({
                userId: '123',
                tasksAssigned: 5,
                tasksOverdue: 2,
            })
        })
    })

    describe('getWorkspaceUserTasks', () => {
        test('gets workspace user tasks', async () => {
            const mockResponse = {
                tasks: [
                    {
                        id: '1',
                        content: 'Test task',
                        responsible_uid: '123',
                        due: null,
                        deadline: null,
                        labels: ['work'],
                        notes_count: 0,
                        project_id: 'proj1',
                        project_name: 'Project 1',
                        priority: 1,
                        description: '',
                        is_overdue: false,
                    },
                ],
            }
            server.use(
                http.get(`${getSyncBaseUri()}workspaces/123/users/456/tasks`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.getWorkspaceUserTasks({
                workspaceId: '123',
                userId: '456',
            })

            expect(result.tasks).toHaveLength(1)
            expect(result.tasks[0]).toMatchObject({
                id: '1',
                content: 'Test task',
            })
        })
    })

    describe('inviteWorkspaceUsers', () => {
        test('invites users to a workspace', async () => {
            const mockResponse = {
                invited_emails: ['user1@example.com', 'user2@example.com'],
            }
            server.use(
                http.post(`${getSyncBaseUri()}workspaces/123/users/invite`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.inviteWorkspaceUsers({
                workspaceId: '123',
                emailList: ['user1@example.com', 'user2@example.com'],
            })

            expect(result.invitedEmails).toEqual(['user1@example.com', 'user2@example.com'])
        })
    })

    describe('updateWorkspaceUser', () => {
        test('updates a workspace user role', async () => {
            const mockResponse = {
                user_id: '456',
                workspace_id: '123',
                role: 'ADMIN',
                custom_sorting_applied: false,
                project_sort_preference: 'MANUAL',
            }
            server.use(
                http.post(`${getSyncBaseUri()}workspaces/123/users/456`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await api.updateWorkspaceUser({
                workspaceId: '123',
                userId: '456',
                role: 'ADMIN',
            })

            expect(result).toMatchObject({
                userId: '456',
                workspaceId: '123',
                role: 'ADMIN',
            })
        })
    })

    describe('removeWorkspaceUser', () => {
        test('removes a user from a workspace', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}workspaces/123/users/456`, () => {
                    return HttpResponse.json({ status: 'ok' }, { status: 200 })
                }),
            )

            const result = await api.removeWorkspaceUser({
                workspaceId: '123',
                userId: '456',
            })

            expect(result).toEqual(true)
        })
    })
})
