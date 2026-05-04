import { WebhookPayloadSchema, type WebhookPayload } from '../types/webhooks/types'
import { camelCaseKeys } from './case-conversion'

/**
 * Parses an incoming webhook request body into a typed payload.
 *
 * The backend sends snake_case keys (e.g. `event_name`, `user_id`, `added_at`);
 * this converts them to camelCase and validates against
 * {@link WebhookPayloadSchema}. Event-specific `eventData` is returned as
 * `unknown` for events that are not yet narrowed per-resource.
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

const encoder = new TextEncoder()

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

/**
 * Verifies a webhook request's HMAC signature.
 *
 * Todoist signs webhook deliveries with an HMAC-SHA256 of the raw request body
 * using the app's `client_secret` as the key, base64-encoded in the
 * `X-Todoist-Hmac-SHA256` header.
 *
 * Uses the Web Crypto API (`crypto.subtle`), which is available in Node ≥ 20,
 * modern browsers, React Native (with polyfills), and edge runtimes. The
 * comparison is constant-time.
 *
 * @returns `true` when the signature is valid, `false` otherwise. Never throws
 * on malformed input.
 */
export async function verifyWebhookSignature({
    rawBody,
    signature,
    clientSecret,
}: VerifyWebhookSignatureArgs): Promise<boolean> {
    let provided: Uint8Array
    try {
        provided = base64ToBytes(signature)
    } catch {
        return false
    }

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(clientSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
    )

    const body = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody

    try {
        return await crypto.subtle.verify(
            'HMAC',
            key,
            provided as BufferSource,
            body as BufferSource,
        )
    } catch {
        return false
    }
}
