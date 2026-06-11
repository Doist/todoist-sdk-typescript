import { TodoistApi } from '.'
import {
    getSyncBaseUri,
    ENDPOINT_REST_SECTIONS,
    ENDPOINT_REST_SECTIONS_SEARCH,
    SECTION_ARCHIVE,
    SECTION_UNARCHIVE,
} from './consts/endpoints'
import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN, DEFAULT_SECTION } from './test-utils/test-defaults'
import type { UpdateSectionArgs } from './types/sections/requests'
import { getSectionUrl } from './utils/url-helpers'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

describe('UpdateSectionArgs type contract', () => {
    test('rejects empty / all-undefined updates while allowing a name or null clear', () => {
        // @ts-expect-error an empty update would serialize to an empty body
        const empty: UpdateSectionArgs = {}
        // @ts-expect-error an all-undefined update would serialize to an empty body
        const allUndefined: UpdateSectionArgs = { name: undefined }
        const nameOnly: UpdateSectionArgs = { name: 'Renamed' }
        const clear: UpdateSectionArgs = { description: null }
        // Reference each so the @ts-expect-error lines are the only contract here.
        const cases = [empty, allUndefined, nameOnly, clear]
        expect(cases).toHaveLength(4)
    })
})

describe('TodoistApi section endpoints', () => {
    describe('getSection', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}/123`, () => {
                    return HttpResponse.json(DEFAULT_SECTION, { status: 200 })
                }),
            )
            const api = getTarget()

            const section = await api.getSection('123')

            expect(section).toEqual(DEFAULT_SECTION)
            expect(section.url).toBe(getSectionUrl(section.id, section.name))
        })
    })

    describe('getSections', () => {
        test('returns result from rest client', async () => {
            const sections = [DEFAULT_SECTION]
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}`, () => {
                    return HttpResponse.json(
                        { results: sections, nextCursor: '123' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.getSections({ projectId: '123' })

            expect(results).toEqual(sections)
            expect(nextCursor).toBe('123')
        })
    })

    describe('searchSections', () => {
        test('returns result from rest client', async () => {
            const sections = [DEFAULT_SECTION]
            server.use(
                http.get(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS_SEARCH}`, () => {
                    return HttpResponse.json(
                        { results: sections, nextCursor: '123' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const { results, nextCursor } = await api.searchSections({ query: 'Work' })

            expect(results).toEqual(sections)
            expect(nextCursor).toBe('123')
        })
    })

    describe('addSection', () => {
        const DEFAULT_ADD_SECTION_ARGS = {
            name: 'This is a section',
            projectId: '123',
        }

        test('returns result from rest client', async () => {
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}`, () => {
                    return HttpResponse.json(DEFAULT_SECTION, { status: 200 })
                }),
            )
            const api = getTarget()

            const section = await api.addSection(DEFAULT_ADD_SECTION_ARGS)

            expect(section).toEqual(DEFAULT_SECTION)
        })

        test('forwards description in the request body', async () => {
            let capturedBody: unknown
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}`, async ({ request }) => {
                    capturedBody = await request.json()
                    return HttpResponse.json(
                        { ...DEFAULT_SECTION, description: 'Bugs to verify' },
                        { status: 200 },
                    )
                }),
            )
            const api = getTarget()

            const section = await api.addSection({
                ...DEFAULT_ADD_SECTION_ARGS,
                description: 'Bugs to verify',
            })

            expect(capturedBody).toMatchObject({ description: 'Bugs to verify' })
            expect(section.description).toBe('Bugs to verify')
        })
    })

    describe('updateSection', () => {
        const DEFAULT_UPDATE_SECTION_ARGS = { name: 'a new name' }

        test('returns success result from rest client', async () => {
            const returnedSection = {
                ...DEFAULT_SECTION,
                ...DEFAULT_UPDATE_SECTION_ARGS,
                id: '123',
                url: getSectionUrl('123', 'a new name'),
            }
            server.use(
                http.post(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}/123`, () => {
                    return HttpResponse.json(returnedSection, { status: 200 })
                }),
            )
            const api = getTarget()

            const response = await api.updateSection('123', DEFAULT_UPDATE_SECTION_ARGS)

            expect(response).toEqual(returnedSection)
        })

        test('forwards a description-only update and a null clear (no name sent)', async () => {
            const capturedBodies: unknown[] = []
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}/123`,
                    async ({ request }) => {
                        capturedBodies.push(await request.json())
                        return HttpResponse.json({ ...DEFAULT_SECTION, id: '123' }, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            await api.updateSection('123', { description: 'Sprint backlog' })
            await api.updateSection('123', { description: null })

            expect(capturedBodies[0]).toEqual({ description: 'Sprint backlog' })
            expect(capturedBodies[1]).toEqual({ description: null })
        })
    })

    describe('deleteSection', () => {
        test('returns success result from rest client', async () => {
            server.use(
                http.delete(`${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}/123`, () => {
                    return HttpResponse.json(undefined, { status: 204 })
                }),
            )
            const api = getTarget()

            const response = await api.deleteSection('123')

            expect(response).toEqual(true)
        })
    })

    describe('archiveSection', () => {
        test('returns result from rest client', async () => {
            const archivedSection = {
                ...DEFAULT_SECTION,
                isArchived: true,
                archivedAt: '2025-03-28T14:01:23.334881Z',
            }
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}/123/${SECTION_ARCHIVE}`,
                    () => {
                        return HttpResponse.json(archivedSection, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const section = await api.archiveSection('123')

            expect(section).toEqual({
                ...archivedSection,
                archivedAt: new Date('2025-03-28T14:01:23.334881Z'),
            })
        })
    })

    describe('unarchiveSection', () => {
        test('returns result from rest client', async () => {
            server.use(
                http.post(
                    `${getSyncBaseUri()}${ENDPOINT_REST_SECTIONS}/123/${SECTION_UNARCHIVE}`,
                    () => {
                        return HttpResponse.json(DEFAULT_SECTION, { status: 200 })
                    },
                ),
            )
            const api = getTarget()

            const section = await api.unarchiveSection('123')

            expect(section).toEqual(DEFAULT_SECTION)
        })
    })
})
