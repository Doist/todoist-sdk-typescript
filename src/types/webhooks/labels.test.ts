import { envelope } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

function rawLabel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'lbl1',
        name: 'home',
        color: 'berry_red',
        item_order: 3,
        is_favorite: false,
        is_deleted: false,
        ...overrides,
    }
}

describe('label:* payloads', () => {
    test('label:added narrows eventData and renames item_order to order', () => {
        const payload = parseWebhookPayload(envelope('label:added', rawLabel()))
        if (payload.eventName !== 'label:added') throw new Error('expected label:added')

        expect(payload.eventData.id).toBe('lbl1')
        expect(payload.eventData.name).toBe('home')
        expect(payload.eventData.color).toBe('berry_red')
        expect(payload.eventData.order).toBe(3)
        expect(payload.eventData.isFavorite).toBe(false)
        expect(payload.eventData.isDeleted).toBe(false)
        // item_order is renamed, not preserved.
        expect(payload.eventData).not.toHaveProperty('itemOrder')
    })

    test('label:updated parses an updated label', () => {
        const payload = parseWebhookPayload(
            envelope('label:updated', rawLabel({ name: 'work', is_favorite: true })),
        )
        if (payload.eventName !== 'label:updated') throw new Error('expected label:updated')

        expect(payload.eventData.name).toBe('work')
        expect(payload.eventData.isFavorite).toBe(true)
    })

    test('label:deleted carries isDeleted=true', () => {
        const payload = parseWebhookPayload(
            envelope('label:deleted', rawLabel({ is_deleted: true })),
        )
        if (payload.eventName !== 'label:deleted') throw new Error('expected label:deleted')

        expect(payload.eventData.isDeleted).toBe(true)
    })

    test('rejects a label payload missing item_order', () => {
        const broken = rawLabel()
        delete broken.item_order
        expect(() => parseWebhookPayload(envelope('label:added', broken))).toThrow()
    })
})
