import { createHmac } from 'node:crypto'

export const CLIENT_SECRET = 'test-client-secret'

/** HMAC-SHA256 signs a raw body with the test client secret (or an override). */
export function sign(body: string, secret = CLIENT_SECRET): string {
    return createHmac('sha256', secret).update(body).digest('base64')
}

/**
 * Snake_case task payload matching the v1 webhook wire shape.
 */
export function rawTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

/**
 * Wraps an event's `event_data` in the snake_case envelope the backend sends
 * (initiator, version, timestamps, etc). `extra` passes extra top-level keys
 * like `event_data_extra`.
 */
export function envelope(
    event: string,
    eventData: unknown,
    extra?: Record<string, unknown>,
): Record<string, unknown> {
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
