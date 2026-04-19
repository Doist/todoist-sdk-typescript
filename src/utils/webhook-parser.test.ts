import { CLIENT_SECRET, envelope, rawTask, sign } from '../test-utils/webhook-fixtures'
import { parseWebhookPayload, verifyWebhookSignature } from './webhook-parser'

const SAMPLE_BODY = JSON.stringify(envelope('item:added', rawTask()))

describe('verifyWebhookSignature', () => {
    test('accepts a correctly signed body', async () => {
        const signature = sign(SAMPLE_BODY)
        await expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).resolves.toBe(true)
    })

    test('accepts a Uint8Array body', async () => {
        const body = new TextEncoder().encode(SAMPLE_BODY)
        const signature = sign(SAMPLE_BODY)
        await expect(
            verifyWebhookSignature({
                rawBody: body,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).resolves.toBe(true)
    })

    test('rejects a tampered body', async () => {
        const signature = sign(SAMPLE_BODY)
        const tampered = SAMPLE_BODY.replace('Alice', 'Mallory')
        await expect(
            verifyWebhookSignature({
                rawBody: tampered,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).resolves.toBe(false)
    })

    test('rejects a signature generated with a different secret', async () => {
        const signature = sign(SAMPLE_BODY, 'other-secret')
        await expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature,
                clientSecret: CLIENT_SECRET,
            }),
        ).resolves.toBe(false)
    })

    test('rejects a signature of the wrong length', async () => {
        await expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature: Buffer.from('too-short').toString('base64'),
                clientSecret: CLIENT_SECRET,
            }),
        ).resolves.toBe(false)
    })

    test('rejects an empty signature', async () => {
        await expect(
            verifyWebhookSignature({
                rawBody: SAMPLE_BODY,
                signature: '',
                clientSecret: CLIENT_SECRET,
            }),
        ).resolves.toBe(false)
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
        const raw = envelope('filter:added', {})
        raw.version = '9'
        expect(() => parseWebhookPayload(raw)).toThrow()
    })

    test('leaves eventData untyped for not-yet-narrowed events', () => {
        const payload = parseWebhookPayload(envelope('filter:added', { id: 'lbl1', name: 'home' }))
        expect(payload.eventName).toBe('filter:added')
        expect(payload.eventData).toEqual({ id: 'lbl1', name: 'home' })
    })
})
