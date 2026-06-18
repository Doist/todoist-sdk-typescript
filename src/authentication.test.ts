import {
    getAuthorizationUrl,
    getAuthToken,
    refreshAuthToken,
    revokeToken,
    migratePersonalToken,
    registerClient,
    Permission,
} from './authentication'
import { getAuthBaseUri, getSyncBaseUri } from './consts/endpoints'
import { assertInstance } from './test-utils/asserts'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { TodoistRequestError } from './types'

describe('authentication', () => {
    describe('getAuthorizationUrl', () => {
        const authUrlTheories = [
            [
                'SomeId',
                'SomeState',
                ['data:read_write'] as Permission[],
                undefined,
                'https://todoist.com/oauth/authorize?client_id=SomeId&scope=data:read_write&state=SomeState',
            ],
            [
                'SomeId',
                'SomeState',
                ['data:read', 'project:delete'] as Permission[],
                undefined,
                'https://todoist.com/oauth/authorize?client_id=SomeId&scope=data:read,project:delete&state=SomeState',
            ],
            [
                'SomeId',
                'SomeState',
                ['data:read_write'] as Permission[],
                'https://staging.todoist.com',
                'https://staging.todoist.com/oauth/authorize?client_id=SomeId&scope=data:read_write&state=SomeState',
            ],
            [
                'SomeId',
                'SomeState',
                ['data:read', 'project:delete'] as Permission[],
                'https://staging.todoist.com',
                'https://staging.todoist.com/oauth/authorize?client_id=SomeId&scope=data:read,project:delete&state=SomeState',
            ],
        ] as const

        test.each(authUrlTheories)(
            'Formatting %p with arguments %p returns %p',
            (clientId, state, permissions, baseUrl, expected) => {
                const url = getAuthorizationUrl({ clientId, permissions, state, baseUrl })
                expect(url).toEqual(expected)
            },
        )

        test('throws error if no permissions requested', () => {
            expect.assertions(1)

            try {
                getAuthorizationUrl({ clientId: 'SomeId', permissions: [], state: 'SomeState' })
            } catch (e: unknown) {
                assertInstance(e, Error)
                expect(e.message).toEqual(
                    'At least one scope value should be passed for permissions.',
                )
            }
        })
    })

    describe('getAuthToken', () => {
        const defaultAuthRequest = {
            clientId: 'SomeId',
            clientSecret: 'ASecret',
            code: 'TheCode',
        }

        const successfulTokenResponse = {
            accessToken: 'AToken',
            tokenType: 'Bearer',
        }

        test('returns values from successful request', async () => {
            server.use(
                http.post('https://todoist.com/oauth/access_token', () => {
                    return HttpResponse.json(successfulTokenResponse, { status: 200 })
                }),
            )

            const tokenResponse = await getAuthToken(defaultAuthRequest)

            expect(tokenResponse).toEqual(successfulTokenResponse)
        })

        test('throws error if non 200 response', async () => {
            const failureStatus = 400
            server.use(
                http.post('https://todoist.com/oauth/access_token', () => {
                    return HttpResponse.json(undefined, { status: failureStatus })
                }),
            )

            expect.assertions(3)

            try {
                await getAuthToken(defaultAuthRequest)
            } catch (e: unknown) {
                assertInstance(e, TodoistRequestError)
                expect(e.message).toEqual('Authentication token exchange failed.')
                expect(e.httpStatusCode).toEqual(failureStatus)
                expect(e.responseData).toBeUndefined()
            }
        })

        test('throws error if token not present in response', async () => {
            const missingTokenResponse = {
                accessToken: undefined,
                tokenType: undefined,
            }

            server.use(
                http.post('https://todoist.com/oauth/access_token', () => {
                    return HttpResponse.json(missingTokenResponse, { status: 200 })
                }),
            )

            expect.assertions(2)

            try {
                await getAuthToken(defaultAuthRequest)
            } catch (e: unknown) {
                assertInstance(e, TodoistRequestError)
                expect(e.message).toEqual('Authentication token exchange failed.')
                expect(e.responseData).toEqual(missingTokenResponse)
            }
        })
    })

    describe('refreshAuthToken', () => {
        const defaultRefreshRequest = {
            clientId: 'SomeId',
            clientSecret: 'ASecret',
            refreshToken: 'ARefreshToken',
        }

        test('exchanges a refresh token for a new access token', async () => {
            let capturedBody: unknown = null

            server.use(
                http.post('https://todoist.com/oauth/access_token', async ({ request }) => {
                    capturedBody = await request.json()
                    return HttpResponse.json(
                        {
                            accessToken: 'ANewToken',
                            tokenType: 'Bearer',
                            refreshToken: 'ANewRefreshToken',
                            expiresIn: 3600,
                        },
                        { status: 200 },
                    )
                }),
            )

            const tokenResponse = await refreshAuthToken(defaultRefreshRequest)

            expect(capturedBody).toEqual({
                client_id: 'SomeId',
                client_secret: 'ASecret',
                refresh_token: 'ARefreshToken',
                grant_type: 'refresh_token',
            })
            expect(tokenResponse).toEqual({
                accessToken: 'ANewToken',
                tokenType: 'Bearer',
                refreshToken: 'ANewRefreshToken',
                expiresIn: 3600,
            })
        })

        test('uses custom base URL when provided', async () => {
            server.use(
                http.post('https://staging.todoist.com/oauth/access_token', () => {
                    return HttpResponse.json(
                        { accessToken: 'ANewToken', tokenType: 'Bearer' },
                        { status: 200 },
                    )
                }),
            )

            const tokenResponse = await refreshAuthToken(defaultRefreshRequest, {
                baseUrl: 'https://staging.todoist.com',
            })

            expect(tokenResponse.accessToken).toEqual('ANewToken')
        })

        test('throws error if non 200 response', async () => {
            const failureStatus = 400
            server.use(
                http.post('https://todoist.com/oauth/access_token', () => {
                    return HttpResponse.json(undefined, { status: failureStatus })
                }),
            )

            expect.assertions(2)

            try {
                await refreshAuthToken(defaultRefreshRequest)
            } catch (e: unknown) {
                assertInstance(e, TodoistRequestError)
                expect(e.message).toEqual('Authentication token refresh failed.')
                expect(e.httpStatusCode).toEqual(failureStatus)
            }
        })
    })

    describe('revokeToken', () => {
        const revokeTokenRequest = {
            clientId: 'SomeId',
            clientSecret: 'ASecret',
            token: 'AToken',
        }

        test('calls request with RFC 7009 compliant parameters', async () => {
            let capturedHeaders: Record<string, string> = {}
            let capturedBody: unknown = null

            server.use(
                http.post(`${getSyncBaseUri()}revoke`, async ({ request }) => {
                    // Capture headers
                    const headers: Record<string, string> = {}
                    request.headers.forEach((value, key) => {
                        headers[key] = value
                    })
                    capturedHeaders = headers

                    // Capture body
                    capturedBody = await request.json()

                    return HttpResponse.json(undefined, { status: 200 })
                }),
            )

            const isSuccess = await revokeToken(revokeTokenRequest)

            // Verify request body contains only token and token_type_hint
            expect(capturedBody).toEqual({
                token: 'AToken',
                token_type_hint: 'access_token',
            })

            // Verify Basic Auth header is present
            expect(capturedHeaders).toBeDefined()
            expect(capturedHeaders.authorization).toMatch(/^Basic /)

            // Verify Basic Auth is correctly encoded (base64 of "SomeId:ASecret")
            const expectedAuth = Buffer.from('SomeId:ASecret').toString('base64')
            expect(capturedHeaders.authorization).toEqual(`Basic ${expectedAuth}`)

            expect(isSuccess).toEqual(true)
        })

        test('returns true when revocation succeeds', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}revoke`, () => {
                    return HttpResponse.json(undefined, { status: 200 })
                }),
            )

            const result = await revokeToken(revokeTokenRequest)

            expect(result).toBe(true)
        })
    })

    describe('registerClient', () => {
        const defaultRegistrationRequest = {
            redirectUris: ['https://example.com/callback'],
            clientName: 'Test App',
            scope: ['data:read_write', 'task:add'] as const,
        }

        const successfulRegistrationResponse = {
            client_id: 'tdd_abc123',
            client_secret: 'secret123',
            client_name: 'Test App',
            redirect_uris: ['https://example.com/callback'],
            scope: 'data:read_write task:add',
            grant_types: ['authorization_code'],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_post',
            client_id_issued_at: 1704067200,
            client_secret_expires_at: 0,
        }

        test('returns values from successful registration', async () => {
            server.use(
                http.post(`${getAuthBaseUri()}register`, () => {
                    return HttpResponse.json(successfulRegistrationResponse, { status: 200 })
                }),
            )

            const result = await registerClient(defaultRegistrationRequest)

            expect(result).toEqual({
                clientId: 'tdd_abc123',
                clientSecret: 'secret123',
                clientName: 'Test App',
                redirectUris: ['https://example.com/callback'],
                scope: ['data:read_write', 'task:add'],
                grantTypes: ['authorization_code'],
                responseTypes: ['code'],
                tokenEndpointAuthMethod: 'client_secret_post',
                clientIdIssuedAt: new Date(1704067200 * 1000),
                clientSecretExpiresAt: null,
            })
        })

        test('throws error if non 200 response', async () => {
            server.use(
                http.post(`${getAuthBaseUri()}register`, () => {
                    return HttpResponse.json({ error: 'invalid_client_metadata' }, { status: 400 })
                }),
            )

            expect.assertions(3)

            try {
                await registerClient(defaultRegistrationRequest)
            } catch (e: unknown) {
                assertInstance(e, TodoistRequestError)
                expect(e.message).toEqual('Dynamic client registration failed.')
                expect(e.httpStatusCode).toEqual(400)
                expect(e.responseData).toEqual({ error: 'invalid_client_metadata' })
            }
        })

        test('throws error if clientId not present in response', async () => {
            server.use(
                http.post(`${getAuthBaseUri()}register`, () => {
                    return HttpResponse.json(
                        { ...successfulRegistrationResponse, client_id: undefined },
                        { status: 200 },
                    )
                }),
            )

            expect.assertions(2)

            try {
                await registerClient(defaultRegistrationRequest)
            } catch (e: unknown) {
                assertInstance(e, TodoistRequestError)
                expect(e.message).toEqual('Dynamic client registration failed.')
                expect(e.responseData).toBeDefined()
            }
        })

        test('works with custom baseUrl', async () => {
            server.use(
                http.post('https://staging.todoist.com/oauth/register', () => {
                    return HttpResponse.json(successfulRegistrationResponse, { status: 200 })
                }),
            )

            const result = await registerClient(defaultRegistrationRequest, {
                baseUrl: 'https://staging.todoist.com',
            })

            expect(result.clientId).toEqual('tdd_abc123')
        })

        test('accepts 201 Created response per RFC 7591', async () => {
            server.use(
                http.post(`${getAuthBaseUri()}register`, () => {
                    return HttpResponse.json(successfulRegistrationResponse, { status: 201 })
                }),
            )

            const result = await registerClient(defaultRegistrationRequest)

            expect(result.clientId).toEqual('tdd_abc123')
        })
    })

    describe('migratePersonalToken', () => {
        const migrateArgs = {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            personalToken: 'personal-api-token',
            scope: ['data:read_write', 'data:delete'] as const,
        }

        test('returns new OAuth token on success', async () => {
            const mockResponse = {
                access_token: 'new-oauth-token',
                token_type: 'Bearer',
                expires_in: 3600,
            }
            server.use(
                http.post(`${getSyncBaseUri()}access_tokens/migrate_personal_token`, () => {
                    return HttpResponse.json(mockResponse, { status: 200 })
                }),
            )

            const result = await migratePersonalToken(migrateArgs)

            expect(result).toMatchObject({
                accessToken: 'new-oauth-token',
                tokenType: 'Bearer',
                expiresIn: 3600,
            })
        })

        test('throws TodoistRequestError on failure', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}access_tokens/migrate_personal_token`, () => {
                    return HttpResponse.json({ error: 'invalid_token' }, { status: 400 })
                }),
            )

            await expect(migratePersonalToken(migrateArgs)).rejects.toThrow(
                'Personal token migration failed.',
            )
        })
    })
})
