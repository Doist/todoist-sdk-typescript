import { vi } from 'vitest'

// In production the transport uses undici's own `fetch` (paired with the
// dispatcher) so the request client and dispatcher stay on one undici version.
// MSW intercepts the *global* `fetch`, not that separate undici instance, so
// force the transport onto the global `fetch` for every test in the suite; MSW
// then intercepts requests as usual. The real undici transport is covered
// directly by `http-dispatcher.test.ts` and `fetch-with-retry.test.ts`, which
// opt out of this seam with `vi.unmock('./http-dispatcher')`.
//
// This lives in its own setup file (not `msw-setup.ts`) because a hoisted
// `vi.mock` in a module that also re-exports values corrupts those exports.
vi.mock('../transport/http-dispatcher', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../transport/http-dispatcher')>()
    return {
        ...actual,
        getDefaultTransport: vi.fn(async () => undefined),
    }
})
