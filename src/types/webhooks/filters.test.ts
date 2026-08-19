import { envelope } from '../../test-utils/webhook-fixtures'
import { parseWebhookPayload } from '../../utils/webhook-parser'

function rawFilter(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'flt1',
        name: 'Priority 1',
        query: 'p1',
        color: 'berry_red',
        item_order: 0,
        is_deleted: false,
        is_favorite: false,
        is_frozen: false,
        ...overrides,
    }
}

describe('filter:* payloads', () => {
    test('filter:added narrows eventData to a Filter', () => {
        const payload = parseWebhookPayload(envelope('filter:added', rawFilter()))
        if (payload.eventName !== 'filter:added') throw new Error('expected filter:added')

        expect(payload.eventData.id).toBe('flt1')
        expect(payload.eventData.name).toBe('Priority 1')
        expect(payload.eventData.query).toBe('p1')
        expect(payload.eventData.color).toBe('berry_red')
        expect(payload.eventData.itemOrder).toBe(0)
        expect(payload.eventData.isFavorite).toBe(false)
    })

    test('filter:updated parses an updated filter', () => {
        const payload = parseWebhookPayload(
            envelope('filter:updated', rawFilter({ name: 'High priority', is_favorite: true })),
        )
        if (payload.eventName !== 'filter:updated') throw new Error('expected filter:updated')

        expect(payload.eventData.name).toBe('High priority')
        expect(payload.eventData.isFavorite).toBe(true)
    })

    test('filter:added carries a description when the filter has one', () => {
        const payload = parseWebhookPayload(
            envelope('filter:added', rawFilter({ description: 'Everything due this week' })),
        )
        if (payload.eventName !== 'filter:added') throw new Error('expected filter:added')

        expect(payload.eventData.description).toBe('Everything due this week')
    })

    test('a filter with no description parses whether the key is null or absent', () => {
        // The column is nullable and predates every existing filter, so both shapes
        // reach clients. Rejecting either would fail the whole payload.
        for (const raw of [rawFilter({ description: null }), rawFilter()]) {
            const payload = parseWebhookPayload(envelope('filter:added', raw))
            if (payload.eventName !== 'filter:added') throw new Error('expected filter:added')

            expect(payload.eventData.description ?? null).toBeNull()
        }
    })

    test('filter:deleted carries isDeleted=true', () => {
        const payload = parseWebhookPayload(
            envelope('filter:deleted', rawFilter({ is_deleted: true })),
        )
        if (payload.eventName !== 'filter:deleted') throw new Error('expected filter:deleted')

        expect(payload.eventData.isDeleted).toBe(true)
    })
})
