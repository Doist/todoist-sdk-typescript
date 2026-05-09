import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { gzipSync } from 'node:zlib'
import { http, passthrough } from 'msw'
import { server } from '../test-utils/msw-setup'
import { getDefaultDispatcher, resetDefaultDispatcherForTests } from './http-dispatcher'

describe('http-dispatcher', () => {
    afterEach(async () => {
        await resetDefaultDispatcherForTests()
    })

    test('returns an EnvHttpProxyAgent in Node', async () => {
        const dispatcher = await getDefaultDispatcher()
        const { EnvHttpProxyAgent } = await import('undici')

        expect(dispatcher).toBeDefined()
        expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent)
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

    test('does not emit ExperimentalWarning for decompress interceptor', async () => {
        const warnings: Array<{ name: string; message: string }> = []
        function listener(warning: Error): void {
            warnings.push({ name: warning.name, message: warning.message })
        }
        process.on('warning', listener)
        try {
            await getDefaultDispatcher()
        } finally {
            process.off('warning', listener)
        }

        const decompressWarnings = warnings.filter(
            (w) => w.name === 'ExperimentalWarning' && w.message.includes('DecompressInterceptor'),
        )
        expect(decompressWarnings).toEqual([])
    })
})
