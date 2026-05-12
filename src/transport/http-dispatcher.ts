import type { Dispatcher } from 'undici'

// Use effectively-disabled keep-alive so short-lived CLI processes do not stay
// open waiting on idle sockets. Undici requires positive values, so we use 1ms.
const KEEP_ALIVE_OPTIONS = {
    keepAliveTimeout: 1,
    keepAliveMaxTimeout: 1,
}

let defaultDispatcherPromise: Promise<Dispatcher> | undefined

export function getDefaultDispatcher(): Promise<Dispatcher | undefined> {
    if (!isNodeEnvironment()) {
        return Promise.resolve(undefined)
    }

    if (!defaultDispatcherPromise) {
        defaultDispatcherPromise = createDefaultDispatcher().catch((error) => {
            defaultDispatcherPromise = undefined
            throw error
        })
    }

    return defaultDispatcherPromise
}

export async function resetDefaultDispatcherForTests(): Promise<void> {
    if (!defaultDispatcherPromise) {
        return
    }

    const dispatcherPromise = defaultDispatcherPromise
    defaultDispatcherPromise = undefined

    await dispatcherPromise.then(
        (dispatcher) => dispatcher.close(),
        () => undefined,
    )
}

async function createDefaultDispatcher(): Promise<Dispatcher> {
    // Dynamic import so non-Node consumers (browser, edge runtimes) don't pull
    // undici into their bundle. `getDefaultDispatcher` already short-circuits
    // outside Node, so this branch only runs when undici is safe to load.
    const { EnvHttpProxyAgent, interceptors } = await import('undici')

    // Compose the response-decompression interceptor so gzip/deflate/br/zstd
    // bodies are decoded before consumers parse them. Required on Node 24+:
    // attaching any custom dispatcher to the global `fetch` strips the
    // `content-encoding` header but does not actually decompress the body,
    // so callers receive raw gzipped bytes and `JSON.parse` fails.
    // See https://github.com/Doist/todoist-cli/issues/318.
    const decompress = suppressExperimentalWarningsSync(() => interceptors.decompress())

    return new EnvHttpProxyAgent(KEEP_ALIVE_OPTIONS).compose(decompress)
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
