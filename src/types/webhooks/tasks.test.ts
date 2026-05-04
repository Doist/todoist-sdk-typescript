import { envelope, rawTask } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

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

    test('item:updated falls back to item_updated for unknown intents', () => {
        const raw = envelope('item:updated', rawTask(), {
            event_data_extra: {
                old_item: rawTask(),
                update_intent: 'something_new',
            },
        })
        const payload = parseWebhookPayload(raw)
        if (payload.eventName !== 'item:updated') throw new Error('expected item:updated')

        expect(payload.eventDataExtra?.updateIntent).toBe('item_updated')
    })
})
