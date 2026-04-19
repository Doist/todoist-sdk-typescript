import { createHmac } from 'node:crypto'
import { parseWebhookPayload, verifyWebhookSignature } from './webhook-parser'

const CLIENT_SECRET = 'test-client-secret'

function sign(body: string, secret = CLIENT_SECRET): string {
    return createHmac('sha256', secret).update(body).digest('base64')
}

/**
 * Snake_case task payload as the backend's v1 webhook serialiser emits it.
 * Mirrors `WebhookItemSyncView` fields.
 */
function rawTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: '6XR4GqQQCW6Gv9h4',
        user_id: '2671355',
        project_id: '6XR4H993xv8H5qCR',
        section_id: null,
        parent_id: null,
        added_by_uid: '2671355',
        assigned_by_uid: null,
        responsible_uid: null,
        labels: [],
        deadline: null,
        duration: null,
        is_collapsed: false,
        checked: false,
        is_deleted: false,
        added_at: '2025-02-10T10:33:38.000000Z',
        completed_at: null,
        completed_by_uid: null,
        updated_at: '2025-02-10T10:33:38.000000Z',
        due: null,
        priority: 1,
        child_order: 3,
        content: 'Buy Milk',
        description: '',
        note_count: 0,
        day_order: -1,
        goal_ids: [],
        url: 'https://app.todoist.com/app/task/6XR4GqQQCW6Gv9h4',
        ...overrides,
    }
}

function envelope(event: string, eventData: unknown, extra?: Record<string, unknown>) {
    return {
        version: '1',
        user_id: '2671355',
        initiator: {
            id: '2671355',
            full_name: 'Alice',
            email: 'alice@example.com',
            image_id: 'ad38375bdb094286af59f1eab36d8f20',
            is_premium: true,
        },
        event_name: event,
        event_data: eventData,
        triggered_at: '2025-02-10T10:39:38.000000Z',
        ...extra,
    }
}

const SAMPLE_BODY = JSON.stringify(envelope('item:added', rawTask()))

describe('verifyWebhookSignature', () => {
    test('accepts a correctly signed body', () => {
        const signature = sign(SAMPLE_BODY)
        expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).toBe(true)
    })

    test('accepts a Buffer body', () => {
        const body = Buffer.from(SAMPLE_BODY, 'utf8')
        const signature = sign(SAMPLE_BODY)
        expect(
            verifyWebhookSignature({
                rawBody: body,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).toBe(true)
    })

    test('rejects a tampered body', () => {
        const signature = sign(SAMPLE_BODY)
        const tampered = SAMPLE_BODY.replace('Alice', 'Mallory')
        expect(
            verifyWebhookSignature({
                rawBody: tampered,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).toBe(false)
    })

    test('rejects a signature generated with a different secret', () => {
        const signature = sign(SAMPLE_BODY, 'other-secret')
        expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).toBe(false)
    })

    test('rejects a signature of the wrong length', () => {
        expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature: Buffer.from('too-short').toString('base64'),
                clientSecret: CLIENT_SECRET,
            }),
        ).toBe(false)
    })

    test('rejects an empty signature', () => {
        expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature: '',
                clientSecret: CLIENT_SECRET,
            }),
        ).toBe(false)
    })
})

describe('parseWebhookPayload', () => {
    test('converts snake_case envelope fields to camelCase', () => {
        const payload = parseWebhookPayload(envelope('item:added', rawTask()))
        expect(payload.userId).toBe('2671355')
        expect(payload.version).toBe('1')
        expect(payload.initiator.fullName).toBe('Alice')
        expect(payload.initiator.isPremium).toBe(true)
        expect(payload.triggeredAt).toBeInstanceOf(Date)
    })

    test('rejects payloads with unknown event names', () => {
        expect(() => parseWebhookPayload(envelope('nope:nope', {}))).toThrow()
    })

    test('rejects payloads with unsupported versions', () => {
        const raw = envelope('label:added', {})
        raw.version = '9'
        expect(() => parseWebhookPayload(raw)).toThrow()
    })

    test('leaves eventData untyped for not-yet-narrowed events', () => {
        const payload = parseWebhookPayload(envelope('label:added', { id: 'lbl1', name: 'home' }))
        expect(payload.eventName).toBe('label:added')
        expect(payload.eventData).toEqual({ id: 'lbl1', name: 'home' })
    })
})

describe('item:* payloads', () => {
    test('item:added narrows eventData to a parsed Task', () => {
        const payload = parseWebhookPayload(envelope('item:added', rawTask()))
        if (payload.eventName !== 'item:added') throw new Error('expected item:added')

        expect(payload.eventData.id).toBe('6XR4GqQQCW6Gv9h4')
        expect(payload.eventData.content).toBe('Buy Milk')
        expect(payload.eventData.projectId).toBe('6XR4H993xv8H5qCR')
        expect(payload.eventData.isCollapsed).toBe(false)
        expect(payload.eventData.addedAt).toBeInstanceOf(Date)
        // TaskSchema transform derives these from id/content.
        expect(payload.eventData.url).toContain('6XR4GqQQCW6Gv9h4')
        expect(payload.eventData.isUncompletable).toBe(false)
    })

    test('item:added strips backend fields the SDK does not model', () => {
        const payload = parseWebhookPayload(envelope('item:added', rawTask()))
        if (payload.eventName !== 'item:added') throw new Error('expected item:added')

        expect(payload.eventData).not.toHaveProperty('noteCount')
        expect(payload.eventData).not.toHaveProperty('goalIds')
        expect(payload.eventData).not.toHaveProperty('completedByUid')
    })

    test('item:completed parses Task eventData', () => {
        const payload = parseWebhookPayload(
            envelope(
                'item:completed',
                rawTask({ checked: true, completed_at: '2025-02-11T09:00:00.000000Z' }),
            ),
        )
        if (payload.eventName !== 'item:completed') throw new Error('expected item:completed')

        expect(payload.eventData.checked).toBe(true)
        expect(payload.eventData.completedAt).toBeInstanceOf(Date)
    })

    test('item:deleted parses Task eventData', () => {
        const payload = parseWebhookPayload(envelope('item:deleted', rawTask({ is_deleted: true })))
        if (payload.eventName !== 'item:deleted') throw new Error('expected item:deleted')

        expect(payload.eventData.isDeleted).toBe(true)
    })

    test('item:uncompleted parses Task eventData', () => {
        const payload = parseWebhookPayload(envelope('item:uncompleted', rawTask()))
        if (payload.eventName !== 'item:uncompleted') throw new Error('expected item:uncompleted')

        expect(payload.eventData.checked).toBe(false)
    })

    test('item:updated without event_data_extra parses', () => {
        const payload = parseWebhookPayload(envelope('item:updated', rawTask()))
        if (payload.eventName !== 'item:updated') throw new Error('expected item:updated')

        expect(payload.eventData.id).toBe('6XR4GqQQCW6Gv9h4')
        expect(payload.eventDataExtra).toBeUndefined()
    })

    test('item:updated with event_data_extra typed as oldItem + updateIntent', () => {
        const raw = envelope('item:updated', rawTask({ content: 'Buy Milk (x2)' }), {
            event_data_extra: {
                old_item: rawTask(),
                update_intent: 'item_completed',
            },
        })
        const payload = parseWebhookPayload(raw)
        if (payload.eventName !== 'item:updated') throw new Error('expected item:updated')

        expect(payload.eventData.content).toBe('Buy Milk (x2)')
        expect(payload.eventDataExtra?.updateIntent).toBe('item_completed')
        expect(payload.eventDataExtra?.oldItem.content).toBe('Buy Milk')
    })

    test('item:updated rejects unknown updateIntent values', () => {
        const raw = envelope('item:updated', rawTask(), {
            event_data_extra: {
                old_item: rawTask(),
                update_intent: 'something_new',
            },
        })
        expect(() => parseWebhookPayload(raw)).toThrow()
    })
})
