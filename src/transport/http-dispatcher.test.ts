import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { gzipSync } from 'node:zlib'
import { http, passthrough } from 'msw'
import { server } from '../test-utils/msw-setup'
import {
    getDefaultDispatcher,
    resetDefaultDispatcherForTests,
    suppressExperimentalWarningsSync,
} from './http-dispatcher'

describe('http-dispatcher', () => {
    afterEach(async () => {
        await resetDefaultDispatcherForTests()
    })

    test('returns a dispatcher in Node', async () => {
        const dispatcher = await getDefaultDispatcher()

        expect(dispatcher).toBeDefined()
        expect(typeof dispatcher?.dispatch).toBe('function')
    })

    test('caches the dispatcher instance', async () => {
        const firstDispatcher = await getDefaultDispatcher()
        const secondDispatcher = await getDefaultDispatcher()

        expect(secondDispatcher).toBe(firstDispatcher)
    })

    test('reset creates a new dispatcher', async () => {
        const firstDispatcher = await getDefaultDispatcher()

        await resetDefaultDispatcherForTests()

        const secondDispatcher = await getDefaultDispatcher()

        expect(secondDispatcher).toBeDefined()
        expect(secondDispatcher).not.toBe(firstDispatcher)
    })

    test('decompresses gzip-encoded response bodies', async () => {
        const payload = { hello: 'world', nested: { value: 42 } }
        const compressed = gzipSync(Buffer.from(JSON.stringify(payload)))

        const httpServer: Server = await new Promise((resolve) => {
            const s = createServer((_req, res) => {
                res.writeHead(200, {
                    'content-type': 'application/json',
                    'content-encoding': 'gzip',
                    'content-length': String(compressed.length),
                })
                res.end(compressed)
            })
            s.listen(0, '127.0.0.1', () => resolve(s))
        })

        const { port } = httpServer.address() as AddressInfo
        const url = `http://127.0.0.1:${port}/`
        // Bypass msw for this localhost endpoint so the real bytes (with the
        // real `content-encoding` header) reach the dispatcher under test.
        server.use(http.get(url, () => passthrough()))

        try {
            const dispatcher = await getDefaultDispatcher()
            const response = await fetch(url, {
                // @ts-expect-error - dispatcher is a valid Node fetch option not in TS lib types
                dispatcher,
            })
            const body = await response.text()

            expect(response.status).toBe(200)
            expect(body).toBe(JSON.stringify(payload))
            expect(JSON.parse(body)).toEqual(payload)
        } finally {
            await new Promise<void>((resolve) => httpServer.close(() => resolve()))
        }
    })

    test('skips the decompress interceptor when the runtime undici lacks it (e.g. Bun)', async () => {
        // Bun reports `process.versions.node` but ships a partial undici whose
        // `interceptors.decompress` is absent and whose dispatchers have no
        // `.compose`. Building the dispatcher must not throw there.
        vi.resetModules()
        vi.doMock('undici', () => ({
            EnvHttpProxyAgent: class {
                dispatch() {}
                async close() {}
            },
            interceptors: {},
        }))

        try {
            const { getDefaultDispatcher: getDispatcher } = await import('./http-dispatcher')
            const dispatcher = await getDispatcher()

            expect(dispatcher).toBeDefined()
            expect(typeof dispatcher?.dispatch).toBe('function')
        } finally {
            vi.doUnmock('undici')
            vi.resetModules()
        }
    })
})

describe('suppressExperimentalWarningsSync', () => {
    test('swallows ExperimentalWarning emissions during the synchronous call', () => {
        const calls: unknown[][] = []
        const originalEmit = process.emitWarning
        process.emitWarning = ((...args: unknown[]) => {
            calls.push(args)
        }) as typeof process.emitWarning

        try {
            suppressExperimentalWarningsSync(() => {
                process.emitWarning('experimental-string-form', 'ExperimentalWarning')
                process.emitWarning('experimental-options-form', {
                    type: 'ExperimentalWarning',
                })
                process.emitWarning('deprecation', 'DeprecationWarning')
            })
        } finally {
            process.emitWarning = originalEmit
        }

        expect(calls).toHaveLength(1)
        expect(calls[0]?.[0]).toBe('deprecation')
    })

    test('restores the original emitWarning even if the callback throws', () => {
        const originalEmit = process.emitWarning
        const placeholder = (() => {}) as typeof process.emitWarning
        process.emitWarning = placeholder

        try {
            expect(() =>
                suppressExperimentalWarningsSync(() => {
                    throw new Error('boom')
                }),
            ).toThrow('boom')
            expect(process.emitWarning).toBe(placeholder)
        } finally {
            process.emitWarning = originalEmit
        }
    })

    test('returns the callback result', () => {
        const result = suppressExperimentalWarningsSync(() => 42)
        expect(result).toBe(42)
    })
})
