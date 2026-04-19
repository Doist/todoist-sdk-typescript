import { envelope } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

function rawPersonalProject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: '6XR4H993xv8H5qCR',
        can_assign_tasks: true,
        child_order: 2,
        color: 'berry_red',
        created_at: '2025-02-10T10:00:00.000000Z',
        updated_at: '2025-02-10T10:00:00.000000Z',
        is_archived: false,
        is_deleted: false,
        is_favorite: false,
        is_frozen: false,
        is_collapsed: false,
        is_shared: false,
        name: 'Shopping',
        view_style: 'list',
        default_order: 1,
        description: '',
        parent_id: null,
        inbox_project: false,
        ...overrides,
    }
}

function rawWorkspaceProject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'ws_proj_1',
        can_assign_tasks: true,
        child_order: 0,
        color: 'berry_red',
        created_at: '2025-02-10T10:00:00.000000Z',
        updated_at: '2025-02-10T10:00:00.000000Z',
        is_archived: false,
        is_deleted: false,
        is_favorite: false,
        is_frozen: false,
        is_collapsed: false,
        is_shared: true,
        name: 'Team Backlog',
        view_style: 'board',
        default_order: 0,
        description: 'Planning board',
        collaborator_role_default: 'READ_WRITE',
        folder_id: null,
        is_invite_only: false,
        is_link_sharing_enabled: true,
        role: 'ADMIN',
        status: 'ACTIVE',
        workspace_id: 'ws_123',
        ...overrides,
    }
}

describe('project:* payloads', () => {
    test('project:added narrows eventData to a PersonalProject', () => {
        const payload = parseWebhookPayload(envelope('project:added', rawPersonalProject()))
        if (payload.eventName !== 'project:added') throw new Error('expected project:added')
        if ('workspaceId' in payload.eventData) throw new Error('expected personal project')

        expect(payload.eventData.id).toBe('6XR4H993xv8H5qCR')
        expect(payload.eventData.name).toBe('Shopping')
        expect(payload.eventData.inboxProject).toBe(false)
        expect(payload.eventData.parentId).toBeNull()
        expect(payload.eventData.url).toContain('6XR4H993xv8H5qCR')
    })

    test('project:added narrows eventData to a WorkspaceProject', () => {
        const payload = parseWebhookPayload(envelope('project:added', rawWorkspaceProject()))
        if (payload.eventName !== 'project:added') throw new Error('expected project:added')
        if (!('workspaceId' in payload.eventData)) throw new Error('expected workspace project')

        expect(payload.eventData.workspaceId).toBe('ws_123')
        expect(payload.eventData.collaboratorRoleDefault).toBe('READ_WRITE')
        expect(payload.eventData.role).toBe('ADMIN')
        expect(payload.eventData.url).toContain('ws_proj_1')
    })

    test('project:updated parses a project', () => {
        const payload = parseWebhookPayload(
            envelope('project:updated', rawPersonalProject({ name: 'Renamed' })),
        )
        if (payload.eventName !== 'project:updated') throw new Error('expected project:updated')

        expect(payload.eventData.name).toBe('Renamed')
    })

    test('project:archived carries isArchived=true', () => {
        const payload = parseWebhookPayload(
            envelope('project:archived', rawPersonalProject({ is_archived: true })),
        )
        if (payload.eventName !== 'project:archived') throw new Error('expected project:archived')

        expect(payload.eventData.isArchived).toBe(true)
    })

    test('project:unarchived carries isArchived=false', () => {
        const payload = parseWebhookPayload(
            envelope('project:unarchived', rawPersonalProject({ is_archived: false })),
        )
        if (payload.eventName !== 'project:unarchived')
            throw new Error('expected project:unarchived')

        expect(payload.eventData.isArchived).toBe(false)
    })

    test('project:deleted carries isDeleted=true', () => {
        const payload = parseWebhookPayload(
            envelope('project:deleted', rawPersonalProject({ is_deleted: true })),
        )
        if (payload.eventName !== 'project:deleted') throw new Error('expected project:deleted')

        expect(payload.eventData.isDeleted).toBe(true)
    })
})
