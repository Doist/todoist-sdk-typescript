import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import { http, passthrough } from 'msw'
import { server } from '../test-utils/msw-setup'
import { uploadMultipartFile } from './multipart-upload'

// Drive the real transport: undici's own `fetch` paired with the SDK's
// dispatcher, against a real local server.
//
// The rest of the upload tests run under the suite-wide transport seam, which
// resolves `getDefaultTransport` to `undefined` and so sends everything through
// the global `fetch`. That matters here: the global `fetch` encodes a global
// `FormData` perfectly well, so those tests cannot tell a hand-encoded
// multipart body from a `FormData` one. Only undici's `fetch` rejects a global
// `FormData` — stringifying it to "[object FormData]" — which is the bug this
// file exists to keep out.
vi.unmock('../transport/http-dispatcher')

type ReceivedRequest = { contentType: string; body: string }

let httpServer: Server
let url: string
let received: ReceivedRequest | undefined

beforeAll(async () => {
    httpServer = await new Promise<Server>((resolve) => {
        const s = createServer((request, response) => {
            const chunks: Buffer[] = []
            request.on('data', (chunk: Buffer) => chunks.push(chunk))
            request.on('end', () => {
                received = {
                    contentType: request.headers['content-type'] ?? '',
                    body: Buffer.concat(chunks).toString('latin1'),
                }
                response.writeHead(200, { 'content-type': 'application/json' })
                response.end(JSON.stringify({ file_url: 'https://example.com/file.png' }))
            })
        })
        s.listen(0, '127.0.0.1', () => resolve(s))
    })

    const { port } = httpServer.address() as AddressInfo
    url = `http://127.0.0.1:${port}/`
    // Let the real bytes through to the server rather than answering from msw.
    server.use(http.post(url, () => passthrough()))
})

afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
})

beforeEach(() => {
    received = undefined
})

async function upload(file: Blob | Buffer | NodeJS.ReadableStream, fileName: string) {
    return uploadMultipartFile({
        baseUrl: url,
        authToken: 'test-token',
        endpoint: '',
        file,
        fileName,
        additionalFields: { project_id: '123' },
    })
}

function expectRealMultipart(expectedContents: string) {
    expect(received).toBeDefined()

    const boundary = /boundary=(.+)$/.exec(received?.contentType ?? '')?.[1]
    expect(boundary).toBeDefined()

    const body = received?.body ?? ''
    // The failure this guards against: undici's `fetch` does not recognise a
    // global `FormData`, so a regression sends the class name and no file.
    expect(body).not.toContain('[object FormData]')
    expect(body).toContain(`--${boundary}`)
    expect(body).toContain(expectedContents)
    expect(body).toContain('name="project_id"')
    expect(body).toContain(`--${boundary}--`)
}

describe('uploadMultipartFile over the real transport', () => {
    test('encodes a Blob into a body undici’s fetch can send', async () => {
        const result = await upload(new Blob(['blob-contents'], { type: 'image/png' }), 'shot.png')

        expect(result).toEqual({ fileUrl: 'https://example.com/file.png' })
        expectRealMultipart('blob-contents')
        expect(received?.body).toContain('filename="shot.png"')
    })

    test('encodes a Buffer into a body undici’s fetch can send', async () => {
        await upload(Buffer.from('buffer-contents'), 'shot.png')

        expectRealMultipart('buffer-contents')
    })

    test('streams a readable into a body undici’s fetch can send', async () => {
        await upload(Readable.from([Buffer.from('streamed-'), Buffer.from('contents')]), 'shot.png')

        expectRealMultipart('streamed-contents')
    })

    test('percent-encodes quotes and line breaks in the file name', async () => {
        // A raw CR or LF would end the header early and let a crafted file name
        // forge one of its own; a raw quote would end the parameter early.
        await upload(new Blob(['contents']), 'we"ird\r\nname.png')

        expect(received?.body).toContain('filename="we%22ird%0D%0Aname.png"')
        // Exactly one part header for the file, so nothing was injected.
        expect(received?.body.match(/Content-Disposition: form-data; name="file"/g)).toHaveLength(1)
    })
})
