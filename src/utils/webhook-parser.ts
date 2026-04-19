import { createHmac, timingSafeEqual } from 'node:crypto'
import { WebhookPayloadSchema, type WebhookPayload } from '../types/webhooks/types'
import { camelCaseKeys } from './case-conversion'

/**
 * Parses an incoming webhook request body into a typed payload.
 *
 * The backend sends snake_case keys (e.g. `event_name`, `user_id`, `added_at`);
 * this converts them to camelCase and validates against
 * {@link WebhookPayloadSchema}. Event-specific `eventData` is returned as
 * `unknown` for now and will be narrowed to per-resource types in follow-up
 * work.
 *
 * Pass the parsed JSON body (or any unknown value) — validation throws on
 * unexpected shape.
 */
export function parseWebhookPayload(raw: unknown): WebhookPayload {
    return WebhookPayloadSchema.parse(camelCaseKeys(raw))
}

/**
 * Arguments for {@link verifyWebhookSignature}.
 */
export type VerifyWebhookSignatureArgs = {
    /**
     * The raw (unparsed) request body exactly as received. Parsing and
     * re-serialising JSON before hashing will change whitespace and byte order
     * and cause verification to fail.
     */
    rawBody: string | Uint8Array
    /**
     * The value of the `X-Todoist-Hmac-SHA256` request header — a base64
     * encoded HMAC-SHA256 digest.
     */
    signature: string
    /**
     * The app's OAuth client secret, used as the HMAC key.
     */
    clientSecret: string
}

/**
 * Verifies a webhook request's HMAC signature.
 *
 * Todoist signs webhook deliveries with an HMAC-SHA256 of the raw request body
 * using the app's `client_secret` as the key, base64-encoded in the
 * `X-Todoist-Hmac-SHA256` header.
 *
 * @returns `true` when the signature is valid, `false` otherwise. Never throws
 * on malformed input.
 */
export function verifyWebhookSignature({
    rawBody,
    signature,
    clientSecret,
}: VerifyWebhookSignatureArgs): boolean {
    const expected = createHmac('sha256', clientSecret).update(rawBody).digest()

    let provided: Buffer
    try {
        provided = Buffer.from(signature, 'base64')
    } catch {
        return false
    }

    if (provided.length !== expected.length) {
        return false
    }

    return timingSafeEqual(provided, expected)
}
