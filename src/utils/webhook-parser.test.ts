import { createHmac } from 'node:crypto'
import { parseWebhookPayload, verifyWebhookSignature } from './webhook-parser'

const CLIENT_SECRET = 'test-client-secret'

function sign(body: string, secret = CLIENT_SECRET): string {
    return createHmac('sha256', secret).update(body).digest('base64')
}

const SAMPLE_BODY = JSON.stringify({
    version: '1',
    user_id: '2671355',
    initiator: {
        id: '2671355',
        full_name: 'Alice',
        email: 'alice@example.com',
        image_id: 'ad38375bdb094286af59f1eab36d8f20',
        is_premium: true,
    },
    event_name: 'item:added',
    event_data: { id: '6XR4GqQQCW6Gv9h4' },
    triggered_at: '2025-02-10T10:39:38.000000Z',
})

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
    test('converts snake_case keys to camelCase and validates the envelope', () => {
        const payload = parseWebhookPayload(JSON.parse(SAMPLE_BODY))
        expect(payload.eventName).toBe('item:added')
        expect(payload.userId).toBe('2671355')
        expect(payload.version).toBe('1')
        expect(payload.initiator.fullName).toBe('Alice')
        expect(payload.initiator.isPremium).toBe(true)
        expect(payload.triggeredAt).toBeInstanceOf(Date)
    })

    test('rejects payloads with unknown event names', () => {
        const raw = { ...JSON.parse(SAMPLE_BODY), event_name: 'nope:nope' }
        expect(() => parseWebhookPayload(raw)).toThrow()
    })

    test('rejects payloads with unsupported versions', () => {
        const raw = { ...JSON.parse(SAMPLE_BODY), version: '9' }
        expect(() => parseWebhookPayload(raw)).toThrow()
    })

    test('preserves eventData as unknown', () => {
        const payload = parseWebhookPayload(JSON.parse(SAMPLE_BODY))
        // Envelope-only for now; per-event variants narrow this in follow-up work.
        expect(payload.eventData).toEqual({ id: '6XR4GqQQCW6Gv9h4' })
    })
})
