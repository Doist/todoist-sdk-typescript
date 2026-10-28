import { TodoistApi } from '.'
import { ENDPOINT_SYNC, getSyncBaseUri } from './consts/endpoints'
import { getLastRequest, mockApiResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN } from './test-utils/test-defaults'
import { TodoistArgumentError } from './types'
import type { UserUpdateArgs } from './types/sync'
import { createCommand } from './utils/sync-helpers'

async function sendUserUpdate(args: UserUpdateArgs) {
    mockApiResponse({
        endpoint: `${getSyncBaseUri()}${ENDPOINT_SYNC}`,
        data: { sync_status: {} },
        options: { method: 'POST' },
    })
    const api = new TodoistApi(DEFAULT_AUTH_TOKEN)
    await api.sync({
        commands: [createCommand('user_update', args)],
    })
    const body = getLastRequest()?.body as { commands: { args: Record<string, unknown> }[] }
    return body.commands[0].args
}

describe('user_update status serialization', () => {
    test('sends a Date activeUntil as an ISO string', async () => {
        const args = await sendUserUpdate({
            status: {
                message: 'Deep work',
                emoji: '🎧',
                activeUntil: new Date('2026-10-20T17:00:00.000Z'),
            },
        })

        expect(args).toEqual({
            status: {
                message: 'Deep work',
                emoji: '🎧',
                active_until: '2026-10-20T17:00:00.000Z',
            },
        })
    })

    test('passes a string activeUntil through and snake_cases effects', async () => {
        const args = await sendUserUpdate({
            status: {
                message: 'Heads down',
                activeUntil: '2026-10-20T17:00:00Z',
                effects: {
                    pauseNotifications: { scope: { mode: 'all' } },
                    pauseActivity: { scope: { mode: 'all' } },
                },
            },
        })

        expect(args).toEqual({
            status: {
                message: 'Heads down',
                active_until: '2026-10-20T17:00:00Z',
                effects: {
                    pause_notifications: { scope: { mode: 'all' } },
                    pause_activity: { scope: { mode: 'all' } },
                },
            },
        })
    })

    test.each([
        {
            status: { emoji: null, activeUntil: null },
            expected: { emoji: null, active_until: null },
        },
        {
            status: { effects: { pauseNotifications: null, pauseActivity: {} } },
            expected: { effects: { pause_notifications: null, pause_activity: {} } },
        },
        {
            status: { effects: { pauseNotifications: {}, pauseActivity: null } },
            expected: { effects: { pause_notifications: {}, pause_activity: null } },
        },
        { status: { effects: null }, expected: { effects: null } },
        {
            status: { effects: { pauseNotifications: { scope: {} } } },
            expected: { effects: { pause_notifications: { scope: {} } } },
        },
    ])('preserves partial-update values on the wire: $status', async ({ status, expected }) => {
        const args = await sendUserUpdate({ status })

        expect(args).toEqual({ status: expected })
    })

    test('sends status: null to clear', async () => {
        const args = await sendUserUpdate({ status: null })

        expect(args).toEqual({ status: null })
    })

    test('omits status when not provided', async () => {
        const args = await sendUserUpdate({ fullName: 'Ada' })

        expect(args).toEqual({ full_name: 'Ada' })
    })

    test('omits emoji and active_until when a status sets only a message', async () => {
        const args = await sendUserUpdate({ status: { message: 'Away' } })

        expect(args).toEqual({ status: { message: 'Away' } })
    })

    test('rejects an invalid Date instead of sending it as a null expiry', async () => {
        const api = new TodoistApi(DEFAULT_AUTH_TOKEN)

        await expect(
            api.sync({
                commands: [
                    createCommand('user_update', {
                        status: { message: 'Away', activeUntil: new Date('nope') },
                    }),
                ],
            }),
        ).rejects.toBeInstanceOf(TodoistArgumentError)
    })
})
