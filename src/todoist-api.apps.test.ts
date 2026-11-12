import { vi } from 'vitest'
import {
    getApiRootBaseUri,
    ENDPOINT_REST_APPS,
    getAppEndpoint,
    getAppSecretsEndpoint,
    getAppClientSecretEndpoint,
    getAppTokensEndpoint,
    getAppTestTokenEndpoint,
    getAppDistributionTokenEndpoint,
    getAppVerificationTokenEndpoint,
    getAppByDistributionTokenEndpoint,
    getAppIconEndpoint,
} from './consts/endpoints'
import { server, http, HttpResponse, getLastRequest, mockApiResponse } from './test-utils/msw-setup'
import {
    DEFAULT_AUTH_TOKEN,
    DEFAULT_APP,
    DEFAULT_APP_ID,
    DEFAULT_APP_WITH_USER_COUNT,
    DEFAULT_APP_SECRETS,
    DEFAULT_APP_VERIFICATION_TOKEN,
    DEFAULT_APP_TEST_TOKEN,
    DEFAULT_APP_DISTRIBUTION_TOKEN,
    DEFAULT_DISTRIBUTION_TOKEN,
} from './test-utils/test-defaults'
import { TodoistApi } from './todoist-api'
import { uploadMultipartFile } from './utils/multipart-upload'

vi.mock('./utils/multipart-upload')
const mockedUploadMultipartFile = vi.mocked(uploadMultipartFile)

/**
 * The schema transforms `app_token_scopes` from `"a,b"` to `['a', 'b']`.
 * So when mocking the wire response we need to undo the array shape.
 */
const appWire = {
    ...DEFAULT_APP,
    appTokenScopes: DEFAULT_APP.appTokenScopes.join(','),
}
const appWithUserCountWire = {
    ...DEFAULT_APP_WITH_USER_COUNT,
    appTokenScopes: DEFAULT_APP_WITH_USER_COUNT.appTokenScopes.join(','),
}

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('TodoistApi app management endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getApps', () => {
        test('lists apps', async () => {
            server.use(
                http.get(`${getApiRootBaseUri()}${ENDPOINT_REST_APPS}`, () => {
                    return HttpResponse.json([appWire], { status: 200 })
                }),
            )
            const apps = await getTarget().getApps()
            expect(apps).toEqual([DEFAULT_APP])
        })
    })

    describe('getApp', () => {
        test('returns a single app with user count', async () => {
            server.use(
                http.get(`${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json(appWithUserCountWire, { status: 200 })
                }),
            )
            const app = await getTarget().getApp(DEFAULT_APP_ID)
            expect(app).toEqual(DEFAULT_APP_WITH_USER_COUNT)
        })
    })

    describe('addApp', () => {
        test('creates an app', async () => {
            server.use(
                http.post(`${getApiRootBaseUri()}${ENDPOINT_REST_APPS}`, () => {
                    return HttpResponse.json(appWire, { status: 200 })
                }),
            )
            const app = await getTarget().addApp({
                displayName: 'New App',
                serviceUrl: 'https://example.com',
            })
            expect(app).toEqual(DEFAULT_APP)
        })
    })

    describe('updateApp', () => {
        test('updates an app', async () => {
            server.use(
                http.post(`${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json(appWithUserCountWire, { status: 200 })
                }),
            )
            const app = await getTarget().updateApp(DEFAULT_APP_ID, {
                displayName: 'Renamed',
                appTokenScopes: ['data:read'],
            })
            expect(app).toEqual(DEFAULT_APP_WITH_USER_COUNT)
        })

        test('serializes appTokenScopes array to comma-separated string', async () => {
            let receivedBody: unknown
            server.use(
                http.post(
                    `${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`,
                    async ({ request }) => {
                        receivedBody = await request.json()
                        return HttpResponse.json(appWithUserCountWire, { status: 200 })
                    },
                ),
            )
            await getTarget().updateApp(DEFAULT_APP_ID, {
                appTokenScopes: ['data:read', 'task:add'],
            })
            expect(receivedBody).toEqual({ app_token_scopes: 'data:read,task:add' })
        })

        test('passes null appTokenScopes through', async () => {
            let receivedBody: unknown
            server.use(
                http.post(
                    `${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`,
                    async ({ request }) => {
                        receivedBody = await request.json()
                        return HttpResponse.json(appWithUserCountWire, { status: 200 })
                    },
                ),
            )
            await getTarget().updateApp(DEFAULT_APP_ID, { appTokenScopes: null })
            expect(receivedBody).toEqual({ app_token_scopes: null })
        })

        test('sends clientType as client_type and returns the new client type', async () => {
            mockApiResponse({
                endpoint: `${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`,
                data: { ...appWithUserCountWire, clientType: 'public' },
                options: { method: 'POST' },
            })
            const app = await getTarget().updateApp(DEFAULT_APP_ID, { clientType: 'public' })
            expect(getLastRequest()?.body).toEqual({ client_type: 'public' })
            expect(app.clientType).toBe('public')
        })

        // JSON drops `undefined`, so the second case sends an app without `client_type`.
        test.each([
            ['an unknown', 'secret'],
            ['a missing', undefined],
        ])('rejects a response with %s client type', async (_, clientType) => {
            mockApiResponse({
                endpoint: `${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`,
                data: { ...appWithUserCountWire, clientType },
                options: { method: 'POST' },
            })
            await expect(
                getTarget().updateApp(DEFAULT_APP_ID, { clientType: 'public' }),
            ).rejects.toThrow()
        })
    })

    describe('deleteApp', () => {
        test('returns true on success', async () => {
            server.use(
                http.delete(`${getApiRootBaseUri()}${getAppEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json({ message: 'ok' }, { status: 200 })
                }),
            )
            const result = await getTarget().deleteApp(DEFAULT_APP_ID)
            expect(result).toBe(true)
        })
    })

    describe('getAppSecrets', () => {
        test('returns client credentials', async () => {
            server.use(
                http.get(`${getApiRootBaseUri()}${getAppSecretsEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json(
                        {
                            client_id: DEFAULT_APP_SECRETS.clientId,
                            client_secret: DEFAULT_APP_SECRETS.clientSecret,
                        },
                        { status: 200 },
                    )
                }),
            )
            const secrets = await getTarget().getAppSecrets(DEFAULT_APP_ID)
            expect(secrets).toEqual(DEFAULT_APP_SECRETS)
        })
    })

    describe('resetAppClientSecret', () => {
        test('rotates the client secret', async () => {
            server.use(
                http.delete(
                    `${getApiRootBaseUri()}${getAppClientSecretEndpoint(DEFAULT_APP_ID)}`,
                    () => {
                        return HttpResponse.json(appWithUserCountWire, { status: 200 })
                    },
                ),
            )
            const app = await getTarget().resetAppClientSecret(DEFAULT_APP_ID)
            expect(app).toEqual(DEFAULT_APP_WITH_USER_COUNT)
        })
    })

    describe('revokeAppTokens', () => {
        test('revokes all tokens for the app', async () => {
            server.use(
                http.delete(`${getApiRootBaseUri()}${getAppTokensEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json(appWithUserCountWire, { status: 200 })
                }),
            )
            const app = await getTarget().revokeAppTokens(DEFAULT_APP_ID)
            expect(app).toEqual(DEFAULT_APP_WITH_USER_COUNT)
        })
    })

    describe('uploadAppIcon', () => {
        beforeEach(() => {
            mockedUploadMultipartFile.mockResolvedValue(appWithUserCountWire)
        })

        test('uploads a medium icon by default', async () => {
            const result = await getTarget().uploadAppIcon({
                appId: DEFAULT_APP_ID,
                file: '/path/to/icon.png',
                fileName: 'icon.png',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith({
                baseUrl: getApiRootBaseUri(),
                authToken: DEFAULT_AUTH_TOKEN,
                endpoint: getAppIconEndpoint(DEFAULT_APP_ID, 'medium'),
                file: '/path/to/icon.png',
                fileName: 'icon.png',
                additionalFields: { file_name: 'icon.png' },
                requestId: undefined,
                customFetch: undefined,
            })
            expect(result).toEqual(DEFAULT_APP_WITH_USER_COUNT)
        })

        test('uploads a small icon when requested', async () => {
            await getTarget().uploadAppIcon({
                appId: DEFAULT_APP_ID,
                file: Buffer.from('data'),
                fileName: 'icon.png',
                size: 'small',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: getAppIconEndpoint(DEFAULT_APP_ID, 'small'),
                }),
            )
        })

        test('uploads a large icon when requested', async () => {
            await getTarget().uploadAppIcon({
                appId: DEFAULT_APP_ID,
                file: Buffer.from('data'),
                fileName: 'icon.png',
                size: 'large',
            })

            expect(mockedUploadMultipartFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: getAppIconEndpoint(DEFAULT_APP_ID, 'large'),
                }),
            )
        })

        test('throws on empty buffer', async () => {
            await expect(
                getTarget().uploadAppIcon({
                    appId: DEFAULT_APP_ID,
                    file: Buffer.alloc(0),
                    fileName: 'icon.png',
                }),
            ).rejects.toThrow('Cannot upload empty image file')
        })
    })

    describe('app test token', () => {
        test('getAppTestToken', async () => {
            server.use(
                http.get(`${getApiRootBaseUri()}${getAppTestTokenEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json(
                        { access_token: DEFAULT_APP_TEST_TOKEN.accessToken },
                        { status: 200 },
                    )
                }),
            )
            const token = await getTarget().getAppTestToken(DEFAULT_APP_ID)
            expect(token).toEqual(DEFAULT_APP_TEST_TOKEN)
        })

        test('createAppTestToken issues PUT', async () => {
            let receivedMethod: string | undefined
            server.use(
                http.put(
                    `${getApiRootBaseUri()}${getAppTestTokenEndpoint(DEFAULT_APP_ID)}`,
                    ({ request }) => {
                        receivedMethod = request.method
                        return HttpResponse.json(
                            { access_token: DEFAULT_APP_TEST_TOKEN.accessToken },
                            { status: 200 },
                        )
                    },
                ),
            )
            const token = await getTarget().createAppTestToken(DEFAULT_APP_ID)
            expect(token).toEqual(DEFAULT_APP_TEST_TOKEN)
            expect(receivedMethod).toBe('PUT')
        })

        test('getAppTestToken handles null access_token', async () => {
            server.use(
                http.get(`${getApiRootBaseUri()}${getAppTestTokenEndpoint(DEFAULT_APP_ID)}`, () => {
                    return HttpResponse.json({ access_token: null }, { status: 200 })
                }),
            )
            const token = await getTarget().getAppTestToken(DEFAULT_APP_ID)
            expect(token).toEqual({ accessToken: null })
        })
    })

    describe('getAppDistributionToken', () => {
        test('returns the distribution token', async () => {
            server.use(
                http.get(
                    `${getApiRootBaseUri()}${getAppDistributionTokenEndpoint(DEFAULT_APP_ID)}`,
                    () => {
                        return HttpResponse.json(
                            {
                                distribution_token:
                                    DEFAULT_APP_DISTRIBUTION_TOKEN.distributionToken,
                            },
                            { status: 200 },
                        )
                    },
                ),
            )
            const result = await getTarget().getAppDistributionToken(DEFAULT_APP_ID)
            expect(result).toEqual(DEFAULT_APP_DISTRIBUTION_TOKEN)
        })
    })

    describe('app verification token', () => {
        test('getAppVerificationToken', async () => {
            server.use(
                http.get(
                    `${getApiRootBaseUri()}${getAppVerificationTokenEndpoint(DEFAULT_APP_ID)}`,
                    () => {
                        return HttpResponse.json(
                            {
                                verification_token:
                                    DEFAULT_APP_VERIFICATION_TOKEN.verificationToken,
                            },
                            { status: 200 },
                        )
                    },
                ),
            )
            const token = await getTarget().getAppVerificationToken(DEFAULT_APP_ID)
            expect(token).toEqual(DEFAULT_APP_VERIFICATION_TOKEN)
        })

        test('resetAppVerificationToken', async () => {
            server.use(
                http.delete(
                    `${getApiRootBaseUri()}${getAppVerificationTokenEndpoint(DEFAULT_APP_ID)}`,
                    () => {
                        return HttpResponse.json(
                            {
                                verification_token:
                                    DEFAULT_APP_VERIFICATION_TOKEN.verificationToken,
                            },
                            { status: 200 },
                        )
                    },
                ),
            )
            const token = await getTarget().resetAppVerificationToken(DEFAULT_APP_ID)
            expect(token).toEqual(DEFAULT_APP_VERIFICATION_TOKEN)
        })
    })

    describe('getAppByDistributionToken', () => {
        test('resolves an app by distribution token', async () => {
            server.use(
                http.get(
                    `${getApiRootBaseUri()}${getAppByDistributionTokenEndpoint(
                        DEFAULT_DISTRIBUTION_TOKEN,
                    )}`,
                    () => {
                        return HttpResponse.json(
                            {
                                id: DEFAULT_APP_ID,
                                display_name: 'Sample App',
                                description: 'A sample app',
                                icon_md: 'https://example.com/icon-md.png',
                                app_token_scopes: 'data:read,task:add',
                                ui_extensions: [
                                    {
                                        name: 'Ext',
                                        description: 'desc',
                                        icon: null,
                                        extension_type: 'context-menu',
                                    },
                                ],
                            },
                            { status: 200 },
                        )
                    },
                ),
            )
            const app = await getTarget().getAppByDistributionToken(DEFAULT_DISTRIBUTION_TOKEN)
            expect(app).toEqual({
                id: DEFAULT_APP_ID,
                displayName: 'Sample App',
                description: 'A sample app',
                iconMd: 'https://example.com/icon-md.png',
                appTokenScopes: ['data:read', 'task:add'],
                uiExtensions: [
                    {
                        name: 'Ext',
                        description: 'desc',
                        icon: null,
                        extensionType: 'context-menu',
                    },
                ],
            })
        })
    })
})
