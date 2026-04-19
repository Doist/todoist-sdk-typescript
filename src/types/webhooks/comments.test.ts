import { envelope, rawTask } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

function rawItemComment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'cmt1',
        item_id: '6XR4GqQQCW6Gv9h4',
        content: 'Nice task',
        posted_at: '2025-02-10T10:40:00.000000Z',
        posted_uid: '2671355',
        file_attachment: null,
        uids_to_notify: null,
        reactions: null,
        is_deleted: false,
        url: 'https://app.todoist.com/app/task/6XR4GqQQCW6Gv9h4',
        item: rawTask(),
        ...overrides,
    }
}

function rawProjectComment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'cmt2',
        project_id: '6XR4H993xv8H5qCR',
        content: 'Kickoff notes',
        posted_at: '2025-02-10T10:40:00.000000Z',
        posted_uid: '2671355',
        file_attachment: null,
        uids_to_notify: null,
        reactions: null,
        is_deleted: false,
        ...overrides,
    }
}

describe('note:* payloads', () => {
    test('note:added narrows eventData to an item comment with embedded Task', () => {
        const payload = parseWebhookPayload(envelope('note:added', rawItemComment()))
        if (payload.eventName !== 'note:added') throw new Error('expected note:added')
        if (!('taskId' in payload.eventData)) throw new Error('expected item comment')

        expect(payload.eventData.taskId).toBe('6XR4GqQQCW6Gv9h4')
        expect(payload.eventData.content).toBe('Nice task')
        expect(payload.eventData.postedAt).toBeInstanceOf(Date)
        expect(payload.eventData.url).toContain('6XR4GqQQCW6Gv9h4')
        expect(payload.eventData.item.content).toBe('Buy Milk')
        expect(payload.eventData.item.projectId).toBe('6XR4H993xv8H5qCR')
    })

    test('note:added narrows eventData to a project comment', () => {
        const payload = parseWebhookPayload(envelope('note:added', rawProjectComment()))
        if (payload.eventName !== 'note:added') throw new Error('expected note:added')
        if (!('projectId' in payload.eventData)) throw new Error('expected project comment')

        expect(payload.eventData.projectId).toBe('6XR4H993xv8H5qCR')
        expect(payload.eventData.content).toBe('Kickoff notes')
        expect(payload.eventData).not.toHaveProperty('taskId')
        expect(payload.eventData).not.toHaveProperty('item')
    })

    test('note:updated parses a comment', () => {
        const payload = parseWebhookPayload(
            envelope('note:updated', rawItemComment({ content: 'Edited' })),
        )
        if (payload.eventName !== 'note:updated') throw new Error('expected note:updated')
        if (!('taskId' in payload.eventData)) throw new Error('expected item comment')

        expect(payload.eventData.content).toBe('Edited')
    })

    test('note:deleted parses a tombstone with nullable posted fields', () => {
        const payload = parseWebhookPayload(
            envelope(
                'note:deleted',
                rawItemComment({ is_deleted: true, posted_uid: null, posted_at: null }),
            ),
        )
        if (payload.eventName !== 'note:deleted') throw new Error('expected note:deleted')
        if (!('taskId' in payload.eventData)) throw new Error('expected item comment')

        expect(payload.eventData.isDeleted).toBe(true)
        expect(payload.eventData.postedUid).toBeNull()
        expect(payload.eventData.postedAt).toBeNull()
    })

    test('rejects a note payload missing both itemId and projectId', () => {
        const broken = rawItemComment()
        delete broken.item_id
        delete broken.item
        delete broken.url
        expect(() => parseWebhookPayload(envelope('note:added', broken))).toThrow()
    })
})
