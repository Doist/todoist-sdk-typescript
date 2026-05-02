import { ZodError } from 'zod'
import { CalendarSchema, CalendarAccountSchema } from './calendars'
import { CollaboratorSchema, CollaboratorStateSchema } from './collaborators'
import { CompletedInfoSchema } from './completed-info'
import { FilterSchema } from './filters'
import { FolderSchema } from './folders'
import { LiveNotificationSchema } from './live-notifications'
import { NoteSchema } from './notes'
import { ReminderSchema } from './reminders'
import { SuggestionSchema } from './suggestions'
import { TooltipsSchema } from './tooltips'
import { SyncUserSchema } from './user'
import { UserPlanLimitsSchema, PlanLimitsSchema } from './user-plan-limits'
import { UserSettingsSchema } from './user-settings'
import { ViewOptionsSchema, ProjectViewOptionsDefaultsSchema } from './view-options'
import { WorkspaceFilterSchema } from './workspace-filters'
import { WorkspaceGoalSchema, WorkspaceGoalProgressSchema } from './workspace-goals'
import { SyncWorkspaceSchema } from './workspaces'

describe('Sync resource schemas', () => {
    describe('FilterSchema', () => {
        const validFilter = {
            id: '123',
            name: 'My Filter',
            query: 'today',
            color: 'red',
            isDeleted: false,
            isFavorite: true,
            isFrozen: false,
            itemOrder: 1,
        }

        test('validates valid data', () => {
            expect(FilterSchema.parse(validFilter)).toEqual(validFilter)
        })

        test('throws on invalid data', () => {
            expect(() => FilterSchema.parse({ id: 123 })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validFilter, newField: 'surprise' }
            const result = FilterSchema.parse(withExtra)
            expect(result).toHaveProperty('newField', 'surprise')
        })
    })

    describe('CollaboratorSchema', () => {
        const validCollaborator = {
            id: '456',
            email: 'test@example.com',
            fullName: 'Test User',
            timezone: 'US/Eastern',
            imageId: null,
        }

        test('validates valid data', () => {
            expect(CollaboratorSchema.parse(validCollaborator)).toEqual(validCollaborator)
        })

        test('throws on invalid data', () => {
            expect(() => CollaboratorSchema.parse({ id: '456' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validCollaborator, avatarUrl: 'http://example.com/img.png' }
            const result = CollaboratorSchema.parse(withExtra)
            expect(result).toHaveProperty('avatarUrl', 'http://example.com/img.png')
        })
    })

    describe('CollaboratorStateSchema', () => {
        const validState = {
            userId: '789',
            projectId: '101',
            state: 'active' as const,
            isDeleted: false,
        }

        test('validates valid data', () => {
            expect(CollaboratorStateSchema.parse(validState)).toEqual(validState)
        })

        test('accepts optional workspaceRole', () => {
            const withRole = { ...validState, workspaceRole: 'ADMIN' }
            expect(CollaboratorStateSchema.parse(withRole)).toHaveProperty('workspaceRole', 'ADMIN')
        })

        test('throws on invalid state value', () => {
            expect(() =>
                CollaboratorStateSchema.parse({ ...validState, state: 'unknown' }),
            ).toThrow(ZodError)
        })
    })

    describe('FolderSchema', () => {
        const validFolder = {
            id: '1',
            name: 'Work',
            workspaceId: 'ws1',
            isDeleted: false,
            defaultOrder: 0,
            childOrder: 1,
        }

        test('validates valid data', () => {
            expect(FolderSchema.parse(validFolder)).toEqual(validFolder)
        })

        test('throws on invalid data', () => {
            expect(() => FolderSchema.parse({ id: '1' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validFolder, color: 'blue' }
            const result = FolderSchema.parse(withExtra)
            expect(result).toHaveProperty('color', 'blue')
        })
    })

    describe('TooltipsSchema', () => {
        test('validates with seen and scheduled', () => {
            const data = { seen: ['tip1', 'tip2'], scheduled: ['tip3'] }
            expect(TooltipsSchema.parse(data)).toEqual(data)
        })

        test('validates empty object', () => {
            expect(TooltipsSchema.parse({})).toEqual({})
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { seen: [], extra: true }
            const result = TooltipsSchema.parse(withExtra)
            expect(result).toHaveProperty('extra', true)
        })
    })

    describe('NoteSchema', () => {
        const validNote = {
            id: 'note1',
            itemId: 'task1',
            content: 'A comment',
            postedAt: '2024-01-01T00:00:00Z',
            fileAttachment: null,
            postedUid: 'user1',
            uidsToNotify: null,
            reactions: null,
            isDeleted: false,
        }

        test('validates valid data', () => {
            expect(NoteSchema.parse(validNote)).toEqual({
                ...validNote,
                postedAt: new Date('2024-01-01T00:00:00Z'),
            })
        })

        test('validates with projectId instead of itemId', () => {
            const projectNote = { ...validNote, itemId: undefined, projectId: 'proj1' }
            expect(NoteSchema.parse(projectNote)).toHaveProperty('projectId', 'proj1')
        })

        test('throws on invalid data', () => {
            expect(() => NoteSchema.parse({ id: 'note1' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validNote, legacyField: 42 }
            const result = NoteSchema.parse(withExtra)
            expect(result).toHaveProperty('legacyField', 42)
        })
    })

    describe('WorkspaceFilterSchema', () => {
        const validWorkspaceFilter = {
            id: 'wf1',
            workspaceId: 'ws1',
            name: 'Team Filter',
            query: 'assigned to: me',
            color: 'blue',
            itemOrder: 0,
            isDeleted: false,
            isFavorite: false,
            isFrozen: false,
            creatorUid: 'user1',
            updaterUid: 'user1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        }

        test('validates valid data', () => {
            expect(WorkspaceFilterSchema.parse(validWorkspaceFilter)).toEqual({
                ...validWorkspaceFilter,
                createdAt: new Date('2024-01-01T00:00:00Z'),
                updatedAt: new Date('2024-01-01T00:00:00Z'),
            })
        })

        test('throws on invalid data', () => {
            expect(() => WorkspaceFilterSchema.parse({ id: 'wf1' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validWorkspaceFilter, sharedWith: ['user2'] }
            const result = WorkspaceFilterSchema.parse(withExtra)
            expect(result).toHaveProperty('sharedWith')
        })
    })

    describe('WorkspaceGoalSchema', () => {
        const validGoal = {
            id: 'goal1',
            workspaceId: 'ws1',
            title: 'Ship v2',
            description: null,
            deadline: null,
            isDeleted: false,
            projectIds: ['proj1', 'proj2'],
            progress: null,
            creatorUid: 'user1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        }

        test('validates valid data', () => {
            expect(WorkspaceGoalSchema.parse(validGoal)).toEqual({
                ...validGoal,
                createdAt: new Date('2024-01-01T00:00:00Z'),
                updatedAt: new Date('2024-01-01T00:00:00Z'),
            })
        })

        test('validates with progress', () => {
            const withProgress = {
                ...validGoal,
                progress: { completedItems: 3, totalItems: 10 },
            }
            const result = WorkspaceGoalSchema.parse(withProgress)
            expect(result.progress).toEqual({ completedItems: 3, totalItems: 10 })
        })

        test('throws on invalid data', () => {
            expect(() => WorkspaceGoalSchema.parse({ id: 'goal1' })).toThrow(ZodError)
        })
    })

    describe('WorkspaceGoalProgressSchema', () => {
        test('validates valid data', () => {
            const data = { completedItems: 5, totalItems: 10 }
            expect(WorkspaceGoalProgressSchema.parse(data)).toEqual(data)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { completedItems: 5, totalItems: 10, percentage: 50 }
            const result = WorkspaceGoalProgressSchema.parse(withExtra)
            expect(result).toHaveProperty('percentage', 50)
        })
    })

    describe('CalendarSchema', () => {
        const validCalendar = {
            id: 'cal1',
            summary: 'My Calendar',
            color: '#ff0000',
            accountId: 'acc1',
            isVisible: true,
        }

        test('validates valid data', () => {
            expect(CalendarSchema.parse(validCalendar)).toEqual(validCalendar)
        })

        test('accepts null color', () => {
            const result = CalendarSchema.parse({ ...validCalendar, color: null })
            expect(result.color).toBeNull()
        })

        test('accepts optional isTaskCalendar', () => {
            const result = CalendarSchema.parse({ ...validCalendar, isTaskCalendar: true })
            expect(result.isTaskCalendar).toBe(true)
        })

        test('throws on invalid data', () => {
            expect(() => CalendarSchema.parse({ id: 'cal1' })).toThrow(ZodError)
        })
    })

    describe('CalendarAccountSchema', () => {
        const validAccount = {
            id: 'acc1',
            name: 'Work Gmail',
            type: 'google' as const,
        }

        test('validates valid data', () => {
            expect(CalendarAccountSchema.parse(validAccount)).toEqual(validAccount)
        })

        test('validates with all optional fields', () => {
            const full = {
                ...validAccount,
                isDeleted: false,
                isEventsEnabled: true,
                isTasksEnabled: true,
                isAllDayTasksEnabled: false,
                pendingOperationUntil: null,
                calendarsSyncState: 'synced' as const,
            }
            expect(CalendarAccountSchema.parse(full)).toEqual(full)
        })

        test('throws on invalid type', () => {
            expect(() => CalendarAccountSchema.parse({ ...validAccount, type: 'yahoo' })).toThrow(
                ZodError,
            )
        })
    })

    describe('ReminderSchema (discriminated union)', () => {
        const baseReminder = {
            id: 'rem1',
            notifyUid: 'user1',
            itemId: 'task1',
            isDeleted: false,
        }

        test('validates location reminder', () => {
            const location = {
                ...baseReminder,
                type: 'location' as const,
                name: 'Office',
                locLat: '37.7749',
                locLong: '-122.4194',
                locTrigger: 'on_enter' as const,
                radius: 100,
            }
            const result = ReminderSchema.parse(location)
            expect(result.type).toBe('location')
        })

        test('validates absolute reminder', () => {
            const absolute = {
                ...baseReminder,
                type: 'absolute' as const,
                due: {
                    isRecurring: false,
                    string: 'Jan 1',
                    date: '2024-01-01',
                },
            }
            const result = ReminderSchema.parse(absolute)
            expect(result.type).toBe('absolute')
        })

        test('validates relative reminder', () => {
            const relative = {
                ...baseReminder,
                type: 'relative' as const,
                minuteOffset: 30,
            }
            const result = ReminderSchema.parse(relative)
            expect(result.type).toBe('relative')
        })

        test('throws on unknown type', () => {
            expect(() => ReminderSchema.parse({ ...baseReminder, type: 'unknown' })).toThrow(
                ZodError,
            )
        })

        test('preserves unknown fields via passthrough', () => {
            const relative = {
                ...baseReminder,
                type: 'relative' as const,
                minuteOffset: 30,
                service: 'push',
            }
            const result = ReminderSchema.parse(relative)
            expect(result).toHaveProperty('service', 'push')
        })
    })

    describe('CompletedInfoSchema (union)', () => {
        test('validates project metadata', () => {
            const data = { projectId: 'proj1', archivedSections: 2, completedItems: 10 }
            expect(CompletedInfoSchema.parse(data)).toEqual(data)
        })

        test('validates section metadata', () => {
            const data = { sectionId: 'sec1', id: '1', completedItems: 5 }
            expect(CompletedInfoSchema.parse(data)).toEqual(data)
        })

        test('validates task metadata', () => {
            const data = { itemId: 'task1', completedItems: 3 }
            expect(CompletedInfoSchema.parse(data)).toEqual(data)
        })

        test('throws on completely invalid data', () => {
            expect(() => CompletedInfoSchema.parse({ invalid: true })).toThrow(ZodError)
        })
    })

    describe('ViewOptionsSchema', () => {
        const validViewOptions = {
            viewType: 'TODAY' as const,
        }

        test('validates minimal data', () => {
            expect(ViewOptionsSchema.parse(validViewOptions)).toEqual(validViewOptions)
        })

        test('validates with all optional fields', () => {
            const full = {
                viewType: 'PROJECT' as const,
                objectId: 'proj1',
                groupedBy: 'PRIORITY' as const,
                filteredBy: null,
                viewMode: 'BOARD' as const,
                showCompletedTasks: false,
                sortedBy: 'DUE_DATE' as const,
                sortOrder: 'ASC' as const,
            }
            expect(ViewOptionsSchema.parse(full)).toEqual(full)
        })

        test('throws on invalid viewType', () => {
            expect(() => ViewOptionsSchema.parse({ viewType: 'INVALID' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validViewOptions, futureOption: true }
            const result = ViewOptionsSchema.parse(withExtra)
            expect(result).toHaveProperty('futureOption', true)
        })
    })

    describe('ProjectViewOptionsDefaultsSchema', () => {
        test('validates minimal data', () => {
            const data = { projectId: 'proj1' }
            expect(ProjectViewOptionsDefaultsSchema.parse(data)).toEqual(data)
        })

        test('validates with calendarSettings', () => {
            const data = {
                projectId: 'proj1',
                viewMode: 'CALENDAR' as const,
                calendarSettings: { layout: 'MONTH' as const },
            }
            const result = ProjectViewOptionsDefaultsSchema.parse(data)
            expect(result.calendarSettings).toEqual({ layout: 'MONTH' })
        })
    })

    describe('PlanLimitsSchema', () => {
        test('validates with known fields', () => {
            const data = { activeProjects: 80, filtersPerUser: 150 }
            expect(PlanLimitsSchema.parse(data)).toEqual(data)
        })

        test('validates empty object', () => {
            expect(PlanLimitsSchema.parse({})).toEqual({})
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { activeProjects: 80, newLimit: 999 }
            const result = PlanLimitsSchema.parse(withExtra)
            expect(result).toHaveProperty('newLimit', 999)
        })
    })

    describe('UserPlanLimitsSchema', () => {
        test('validates valid data', () => {
            const data = {
                current: { activeProjects: 80 },
                next: null,
            }
            expect(UserPlanLimitsSchema.parse(data)).toEqual(data)
        })

        test('validates with next plan', () => {
            const data = {
                current: { activeProjects: 80 },
                next: { activeProjects: 300 },
            }
            const result = UserPlanLimitsSchema.parse(data)
            expect(result.next).toEqual({ activeProjects: 300 })
        })

        test('throws on missing current', () => {
            expect(() => UserPlanLimitsSchema.parse({ next: null })).toThrow(ZodError)
        })
    })

    describe('LiveNotificationSchema', () => {
        const validNotification = {
            id: 'ln1',
            createdAt: '2024-01-01T00:00:00Z',
            fromUid: 'user1',
            notificationType: 'share_invitation_sent',
            isUnread: true,
        }

        test('validates valid data', () => {
            expect(LiveNotificationSchema.parse(validNotification)).toEqual({
                ...validNotification,
                createdAt: new Date('2024-01-01T00:00:00Z'),
            })
        })

        test('validates with optional fields', () => {
            const withOptional = {
                ...validNotification,
                projectId: 'proj1',
                invitationId: 'inv1',
                itemId: 'task1',
                itemContent: 'Buy milk',
            }
            const result = LiveNotificationSchema.parse(withOptional)
            expect(result.projectId).toBe('proj1')
            expect(result.itemContent).toBe('Buy milk')
        })

        test('throws on invalid data', () => {
            expect(() => LiveNotificationSchema.parse({ id: 'ln1' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validNotification, karmaAmount: 5 }
            const result = LiveNotificationSchema.parse(withExtra)
            expect(result).toHaveProperty('karmaAmount', 5)
        })
    })

    describe('SyncWorkspaceSchema', () => {
        const validWorkspace = {
            id: 'ws1',
            name: 'My Team',
            description: 'Team workspace',
            creatorId: 'user1',
            createdAt: '2024-01-01T00:00:00Z',
            isDeleted: false,
            isCollapsed: false,
            role: 'ADMIN' as const,
            plan: 'BUSINESS' as const,
            limits: {
                current: { maxProjects: 500 },
                next: null,
            },
            currentActiveProjects: 42,
            currentMemberCount: 10,
            currentTemplateCount: 3,
            adminSortingApplied: false,
        }

        test('validates valid data', () => {
            expect(SyncWorkspaceSchema.parse(validWorkspace)).toEqual({
                ...validWorkspace,
                createdAt: new Date('2024-01-01T00:00:00Z'),
            })
        })

        test('validates with optional fields', () => {
            const full = {
                ...validWorkspace,
                logoBig: 'https://example.com/logo.png',
                inviteCode: 'abc123',
                isLinkSharingEnabled: true,
                isGuestAllowed: true,
                pendingInvitations: ['user@example.com'],
                domainName: 'example.com',
                domainDiscovery: true,
                restrictEmailDomains: false,
                projectSortPreference: 'A_TO_Z',
                defaultCollaborators: {
                    predefinedGroupIds: ['group1'],
                    userIds: [123],
                },
                properties: { industry: 'information_technology' },
            }
            const result = SyncWorkspaceSchema.parse(full)
            expect(result.domainName).toBe('example.com')
            expect(result.defaultCollaborators).toEqual({
                predefinedGroupIds: ['group1'],
                userIds: ['123'],
            })
        })

        test('accepts null for nullable fields', () => {
            const withNulls = {
                ...validWorkspace,
                inviteCode: null,
                isLinkSharingEnabled: null,
                isGuestAllowed: null,
                currentActiveProjects: null,
                currentMemberCount: null,
                currentTemplateCount: null,
                domainName: null,
                logoBig: null,
                logoMedium: null,
                logoSmall: null,
                logoS640: null,
                projectSortPreference: null,
                domainDiscovery: null,
                restrictEmailDomains: null,
            }
            expect(SyncWorkspaceSchema.parse(withNulls).currentActiveProjects).toBeNull()
        })

        test('throws on invalid data', () => {
            expect(() => SyncWorkspaceSchema.parse({ id: 'ws1' })).toThrow(ZodError)
        })

        test('throws on invalid plan', () => {
            expect(() => SyncWorkspaceSchema.parse({ ...validWorkspace, plan: 'FREE' })).toThrow(
                ZodError,
            )
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validWorkspace, newFeatureFlag: true }
            const result = SyncWorkspaceSchema.parse(withExtra)
            expect(result).toHaveProperty('newFeatureFlag', true)
        })
    })

    describe('SyncUserSchema', () => {
        const validUser = {
            id: 'user1',
            email: 'test@example.com',
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
                beta: 0,
                hasPushReminders: true,
                dateistInlineDisabled: false,
            },
            hasMagicNumber: false,
            hasPassword: true,
            imageId: null,
            inboxProjectId: 'inbox1',
            isCelebrationsEnabled: true,
            isPremium: true,
            joinableWorkspace: null,
            joinedAt: '2020-01-01T00:00:00Z',
            gettingStartedGuideProjects: null,
            karma: 1000,
            karmaTrend: 'up',
            lang: 'en',
            mobileHost: null,
            mobileNumber: null,
            nextWeek: 1,
            premiumStatus: 'current_personal_plan' as const,
            premiumUntil: null,
            shareLimit: 25,
            sortOrder: 0,
            startDay: 1,
            startPage: 'today',
            themeId: '11',
            timeFormat: 0,
            token: 'abc123',
            tzInfo: {
                timezone: 'US/Eastern',
                hours: -5,
                minutes: 0,
                isDst: 0,
                gmtString: '-05:00',
            },
            uniquePrefix: 1,
            verificationStatus: 'verified',
            websocketUrl: 'wss://example.com',
            weekendStartDay: 6,
            weeklyGoal: 25,
        }

        test('validates valid data', () => {
            const result = SyncUserSchema.parse(validUser)
            // Numeric fields are transformed to descriptive strings
            expect(result.dateFormat).toBe('DD/MM/YYYY')
            expect(result.timeFormat).toBe('24h')
            expect(result.startDay).toBe('Monday')
            expect(result.nextWeek).toBe('Monday')
            // 0/1 fields are transformed to booleans
            expect(result.features.beta).toBe(false)
            expect(result.tzInfo.isDst).toBe(false)
            // Non-transformed fields pass through unchanged
            expect(result.id).toBe(validUser.id)
            expect(result.email).toBe(validUser.email)
            expect(result.fullName).toBe(validUser.fullName)
        })

        test('validates with optional onboarding fields', () => {
            const withOnboarding = {
                ...validUser,
                onboardingLevel: 'pro',
                onboardingRole: 'ic',
                onboardingPersona: 'tasks',
                onboardingCompleted: true,
                onboardingUseCases: ['solo', 'teamwork'],
            }
            const result = SyncUserSchema.parse(withOnboarding)
            expect(result.onboardingLevel).toBe('pro')
            expect(result.onboardingUseCases).toEqual(['solo', 'teamwork'])
        })

        test('parses when sync API omits dateistLang, mobileHost, mobileNumber, and token', () => {
            const {
                dateistLang: _dateistLang,
                mobileHost: _mobileHost,
                mobileNumber: _mobileNumber,
                token: _token,
                ...withoutOptionalFields
            } = validUser
            const result = SyncUserSchema.parse(withoutOptionalFields)
            expect(result.dateistLang).toBeUndefined()
            expect(result.mobileHost).toBeUndefined()
            expect(result.mobileNumber).toBeUndefined()
            expect(result.token).toBeUndefined()
        })

        test('throws on invalid data', () => {
            expect(() => SyncUserSchema.parse({ id: 'user1' })).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validUser, futureField: 'hello' }
            const result = SyncUserSchema.parse(withExtra)
            expect(result).toHaveProperty('futureField', 'hello')
        })
    })

    describe('UserSettingsSchema', () => {
        const validSettings = {
            completedSoundDesktop: true,
            completedSoundMobile: true,
            debugLogSendingEnabledUntil: null,
            legacyPricing: false,
            navigation: {
                countsShown: true,
                features: [
                    { name: 'inbox', shown: true },
                    { name: 'today', shown: true },
                ],
            },
            reminderDesktop: true,
            reminderEmail: true,
            reminderPush: true,
            resetRecurringSubtasks: false,
            aiEmailAssist: false,
            quickAdd: {
                labelsShown: true,
                features: [
                    { name: 'date', shown: true },
                    { name: 'priority', shown: true },
                ],
            },
        }

        test('validates valid data', () => {
            expect(UserSettingsSchema.parse(validSettings)).toEqual(validSettings)
        })

        test('validates with optional theme fields', () => {
            const withTheme = { ...validSettings, theme: 'dark', syncTheme: true }
            const result = UserSettingsSchema.parse(withTheme)
            expect(result.theme).toBe('dark')
        })

        test('parses when sync API omits debugLogSendingEnabledUntil', () => {
            const { debugLogSendingEnabledUntil: _omitted, ...withoutDebugLog } = validSettings
            const result = UserSettingsSchema.parse(withoutDebugLog)
            expect(result.debugLogSendingEnabledUntil).toBeUndefined()
        })

        test('coerces numeric legacyPricing to boolean', () => {
            const withIntPricing = { ...validSettings, legacyPricing: 0 }
            expect(UserSettingsSchema.parse(withIntPricing).legacyPricing).toBe(false)
            const withTruthyIntPricing = { ...validSettings, legacyPricing: 1 }
            expect(UserSettingsSchema.parse(withTruthyIntPricing).legacyPricing).toBe(true)
        })

        test('throws on invalid data', () => {
            expect(() => UserSettingsSchema.parse({ completedSoundDesktop: 'yes' })).toThrow(
                ZodError,
            )
        })

        test('preserves unknown fields via passthrough', () => {
            const withExtra = { ...validSettings, newSetting: true }
            const result = UserSettingsSchema.parse(withExtra)
            expect(result).toHaveProperty('newSetting', true)
        })
    })

    describe('SuggestionSchema', () => {
        test('validates template suggestions', () => {
            const data = {
                type: 'templates' as const,
                content: {
                    templates: [{ id: 't1', name: 'Getting Started', templateType: 'project' }],
                    locale: 'en',
                },
                isDeleted: false,
            }
            expect(SuggestionSchema.parse(data)).toEqual(data)
        })

        test('validates most_used_user_templates suggestions', () => {
            const data = {
                type: 'most_used_user_templates' as const,
                content: {
                    templates: [{ id: 't2', name: 'My Template', templateType: 'setup' }],
                    locale: 'en',
                },
                isDeleted: false,
            }
            expect(SuggestionSchema.parse(data)).toEqual(data)
        })

        test('validates workspace template suggestions', () => {
            const data = {
                type: 'most_used_workspace_templates' as const,
                content: {
                    templates: [
                        {
                            id: 't3',
                            name: 'Team Onboarding',
                            templateType: 'project',
                            workspaceId: 'ws1',
                        },
                    ],
                    locale: 'en',
                },
                isDeleted: false,
            }
            const result = SuggestionSchema.parse(data)
            expect(result.type).toBe('most_used_workspace_templates')
        })

        test('throws on invalid type', () => {
            expect(() =>
                SuggestionSchema.parse({
                    type: 'invalid',
                    content: { templates: [], locale: 'en' },
                    isDeleted: false,
                }),
            ).toThrow(ZodError)
        })

        test('preserves unknown fields via passthrough', () => {
            const data = {
                type: 'templates' as const,
                content: {
                    templates: [{ id: 't1', name: 'Test', templateType: 'project' }],
                    locale: 'en',
                },
                isDeleted: false,
                priority: 1,
            }
            const result = SuggestionSchema.parse(data)
            expect(result).toHaveProperty('priority', 1)
        })
    })
})
