import { envelope } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

function rawRelativeReminder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'rmd1',
        item_id: '6XR4GqQQCW6Gv9h4',
        notify_uid: '2671355',
        is_deleted: false,
        is_urgent: false,
        type: 'relative',
        minute_offset: 30,
        due: {
            is_recurring: false,
            string: 'every day at 9am',
            date: '2025-02-10',
            datetime: '2025-02-10T09:00:00Z',
            timezone: 'UTC',
            lang: 'en',
        },
        ...overrides,
    }
}

function rawAbsoluteReminder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'rmd2',
        item_id: '6XR4GqQQCW6Gv9h4',
        notify_uid: '2671355',
        is_deleted: false,
        is_urgent: true,
        type: 'absolute',
        minute_offset: null,
        due: {
            is_recurring: false,
            string: 'at 3pm',
            date: '2025-02-10',
            datetime: '2025-02-10T15:00:00Z',
            timezone: 'UTC',
            lang: 'en',
        },
        ...overrides,
    }
}

describe('reminder:fired payloads', () => {
    test('narrows eventData for a relative reminder', () => {
        const payload = parseWebhookPayload(envelope('reminder:fired', rawRelativeReminder()))
        if (payload.eventName !== 'reminder:fired') throw new Error('expected reminder:fired')

        expect(payload.eventData.id).toBe('rmd1')
        expect(payload.eventData.itemId).toBe('6XR4GqQQCW6Gv9h4')
        expect(payload.eventData.notifyUid).toBe('2671355')
        expect(payload.eventData.type).toBe('relative')
        expect(payload.eventData.minuteOffset).toBe(30)
        expect(payload.eventData.isUrgent).toBe(false)
        expect(payload.eventData.due?.isRecurring).toBe(false)
    })

    test('narrows eventData for an absolute reminder with null minuteOffset', () => {
        const payload = parseWebhookPayload(envelope('reminder:fired', rawAbsoluteReminder()))
        if (payload.eventName !== 'reminder:fired') throw new Error('expected reminder:fired')

        expect(payload.eventData.type).toBe('absolute')
        expect(payload.eventData.minuteOffset).toBeNull()
        expect(payload.eventData.isUrgent).toBe(true)
    })

    test('tolerates a null due', () => {
        const payload = parseWebhookPayload(
            envelope('reminder:fired', rawRelativeReminder({ due: null })),
        )
        if (payload.eventName !== 'reminder:fired') throw new Error('expected reminder:fired')

        expect(payload.eventData.due).toBeNull()
    })

    test('rejects an unknown reminder type', () => {
        const raw = rawRelativeReminder({ type: 'something_else' })
        expect(() => parseWebhookPayload(envelope('reminder:fired', raw))).toThrow()
    })
})
