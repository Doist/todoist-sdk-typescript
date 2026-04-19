import { envelope } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

function rawSection(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'sec1',
        user_id: '2671355',
        project_id: '6XR4H993xv8H5qCR',
        added_at: '2025-02-10T10:00:00.000000Z',
        updated_at: '2025-02-10T10:00:00.000000Z',
        archived_at: null,
        name: 'To Do',
        section_order: 1,
        is_archived: false,
        is_deleted: false,
        is_collapsed: false,
        ...overrides,
    }
}

describe('section:* payloads', () => {
    test('section:added narrows eventData to a Section', () => {
        const payload = parseWebhookPayload(envelope('section:added', rawSection()))
        if (payload.eventName !== 'section:added') throw new Error('expected section:added')

        expect(payload.eventData.id).toBe('sec1')
        expect(payload.eventData.name).toBe('To Do')
        expect(payload.eventData.projectId).toBe('6XR4H993xv8H5qCR')
        expect(payload.eventData.sectionOrder).toBe(1)
        expect(payload.eventData.addedAt).toBeInstanceOf(Date)
        expect(payload.eventData.updatedAt).toBeInstanceOf(Date)
        expect(payload.eventData.url).toContain('sec1')
    })

    test('section:updated parses a section', () => {
        const payload = parseWebhookPayload(
            envelope('section:updated', rawSection({ name: 'Renamed' })),
        )
        if (payload.eventName !== 'section:updated') throw new Error('expected section:updated')

        expect(payload.eventData.name).toBe('Renamed')
    })

    test('section:deleted tolerates a null updatedAt', () => {
        const payload = parseWebhookPayload(
            envelope(
                'section:deleted',
                rawSection({ is_deleted: true, updated_at: null, name: '' }),
            ),
        )
        if (payload.eventName !== 'section:deleted') throw new Error('expected section:deleted')

        expect(payload.eventData.isDeleted).toBe(true)
        expect(payload.eventData.updatedAt).toBeNull()
    })

    test('section:archived carries isArchived=true', () => {
        const payload = parseWebhookPayload(
            envelope(
                'section:archived',
                rawSection({ is_archived: true, archived_at: '2025-02-11T10:00:00.000000Z' }),
            ),
        )
        if (payload.eventName !== 'section:archived') throw new Error('expected section:archived')

        expect(payload.eventData.isArchived).toBe(true)
        expect(payload.eventData.archivedAt).toBeInstanceOf(Date)
    })

    test('section:unarchived carries isArchived=false', () => {
        const payload = parseWebhookPayload(
            envelope('section:unarchived', rawSection({ is_archived: false, archived_at: null })),
        )
        if (payload.eventName !== 'section:unarchived')
            throw new Error('expected section:unarchived')

        expect(payload.eventData.isArchived).toBe(false)
        expect(payload.eventData.archivedAt).toBeNull()
    })
})
