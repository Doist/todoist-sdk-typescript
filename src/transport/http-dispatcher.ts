import type { Dispatcher } from 'undici'

// undici's own `fetch`, typed from the same package the dispatcher comes from.
type UndiciFetch = typeof import('undici').fetch

// Use effectively-disabled keep-alive so short-lived CLI processes do not stay
// open waiting on idle sockets. Undici requires positive values, so we use 1ms.
const KEEP_ALIVE_OPTIONS = {
    keepAliveTimeout: 1,
    keepAliveMaxTimeout: 1,
}

/**
 * A dispatcher and the `fetch` that must be used with it. `fetch` is undici's
 * own `fetch` on the full-undici Node path, or `undefined` (meaning: use the
 * global `fetch`) on the Bun path. The two are cached together so callers can
 * never observe a dispatcher paired with a mismatched `fetch` — see
 * {@link getDefaultFetch} for why the pairing matters.
 */
type DefaultTransport = { dispatcher: Dispatcher; fetch: UndiciFetch | undefined }

let defaultTransport: DefaultTransport | undefined
let defaultTransportPromise: Promise<DefaultTransport> | undefined

/**
 * The default dispatcher and its paired `fetch`, as a single value so the two
 * are always read consistently. Resolves to `undefined` outside Node (browser/
 * edge), where callers use the global `fetch` with no dispatcher.
 */
export function getDefaultTransport(): Promise<DefaultTransport | undefined> {
    if (!isNodeEnvironment()) {
        return Promise.resolve(undefined)
    }

    if (!defaultTransportPromise) {
        defaultTransportPromise = createDefaultTransport()
            .then((transport) => {
                defaultTransport = transport
                return transport
            })
            .catch((error) => {
                defaultTransport = undefined
                defaultTransportPromise = undefined
                throw error
            })
    }

    return defaultTransportPromise
}

export async function getDefaultDispatcher(): Promise<Dispatcher | undefined> {
    return (await getDefaultTransport())?.dispatcher
}

/**
 * The `fetch` implementation that must be used with the default dispatcher.
 * Returns undici's own `fetch` on the full-undici Node path, or `undefined`
 * (meaning: use the global `fetch`) in the browser/edge/Bun paths.
 *
 * Node's global `fetch` is backed by whatever undici version ships inside that
 * Node release (6.x on Node 22 … 8.x on Node 26). Our dispatcher — and its
 * `decompress` interceptor — comes from the npm `undici` package, which is a
 * different version. Handing an npm-undici dispatcher to a mismatched built-in
 * client makes gzip responses fail mid-stream with `terminated`. Sourcing
 * `fetch` from the same npm `undici` keeps the whole request path on one
 * version and removes the split.
 *
 * Only meaningful after {@link getDefaultTransport} has resolved, which is the
 * one place that populates it.
 */
export function getDefaultFetch(): UndiciFetch | undefined {
    return defaultTransport?.fetch
}

export async function resetDefaultDispatcherForTests(): Promise<void> {
    if (!defaultTransportPromise) {
        return
    }

    const transportPromise = defaultTransportPromise
    defaultTransport = undefined
    defaultTransportPromise = undefined

    await transportPromise.then(
        (transport) => transport.dispatcher.close(),
        () => undefined,
    )
}

async function createDefaultTransport(): Promise<DefaultTransport> {
    // Dynamic import so non-Node consumers (browser, edge runtimes) don't pull
    // undici into their bundle. `getDefaultTransport` already short-circuits
    // outside Node, so this branch only runs when undici is safe to load.
    const { EnvHttpProxyAgent, interceptors, fetch: undiciFetch } = await import('undici')

    const agent = new EnvHttpProxyAgent(KEEP_ALIVE_OPTIONS)

    // Some runtimes report `process.versions.node` (so `isNodeEnvironment()`
    // passes) but ship only a partial undici: `interceptors.decompress` is
    // absent and dispatchers have no `.compose`. Bun is the common case. There
    // the proxy agent alone is enough — Bun's `fetch` decompresses
    // gzip/deflate/br/zstd natively — so skip the interceptor instead of
    // crashing on the missing API.
    if (typeof interceptors.decompress !== 'function') {
        // Bun: pair the agent with the global `fetch` (undefined), which
        // decompresses natively.
        return { dispatcher: agent, fetch: undefined }
    }

    // Compose the response-decompression interceptor so gzip/deflate/br/zstd
    // bodies are decoded before consumers parse them. Required on Node 24+:
    // attaching any custom dispatcher to the global `fetch` strips the
    // `content-encoding` header but does not actually decompress the body,
    // so callers receive raw gzipped bytes and `JSON.parse` fails.
    // See https://github.com/Doist/todoist-cli/issues/318.
    const decompress = suppressExperimentalWarningsSync(() => interceptors.decompress())

    // Pair undici's own `fetch` with this dispatcher so the request client and
    // the dispatcher stay on one undici version (see `getDefaultFetch`). The
    // global `fetch` is backed by a different, Node-bundled undici; mixing the
    // two makes the decompress interceptor terminate gzip responses on some
    // Node versions.
    return { dispatcher: agent.compose(decompress), fetch: undiciFetch }
}

// undici emits an `ExperimentalWarning` the first time `interceptors.decompress()`
// runs. The interceptor is stable for our gzipped-JSON-over-HTTPS use case;
// silence the warning during dispatcher init only so it does not leak to every
// consumer's stderr on the first request.
//
// `fn` must be synchronous so the override covers a single critical section
// (microseconds) — no unrelated `ExperimentalWarning` from elsewhere can
// interleave and be lost. We suppress every `ExperimentalWarning` rather than
// pattern-matching the message text: the message wording is an undici
// implementation detail (not a stable API), and the suppression window is
// narrow enough that a coarse type filter is safe.
//
// Exported for direct unit testing — the integration path through
// `getDefaultDispatcher()` cannot reliably exercise the helper because both
// the dispatcher singleton and undici's internal `warningEmitted` flag are
// once-per-process.
export function suppressExperimentalWarningsSync<T>(fn: () => T): T {
    const originalEmit = process.emitWarning
    process.emitWarning = ((
        warning: string | Error,
        typeOrOptions?: string | { type?: string },
        ...rest: unknown[]
    ): void => {
        const type =
            typeof typeOrOptions === 'string'
                ? typeOrOptions
                : typeof typeOrOptions === 'object' && typeOrOptions !== null
                  ? typeOrOptions.type
                  : undefined
        if (type === 'ExperimentalWarning') return
        ;(originalEmit as (...args: unknown[]) => void).call(
            process,
            warning,
            typeOrOptions,
            ...rest,
        )
    }) as typeof process.emitWarning
    try {
        return fn()
    } finally {
        process.emitWarning = originalEmit
    }
}

function isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && Boolean(process.versions?.node)
}
