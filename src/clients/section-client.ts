import {
    ENDPOINT_REST_SECTIONS,
    ENDPOINT_REST_SECTIONS_SEARCH,
    SECTION_ARCHIVE,
    SECTION_UNARCHIVE,
} from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddSectionArgs,
    GetSectionsArgs,
    GetSectionsResponse,
    SearchSectionsArgs,
    Section,
    UpdateSectionArgs,
} from '../types/sections'
import { generatePath } from '../utils/request-helpers'
import { IdSchema, validateSection, validateSectionArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all section-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public section method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class SectionClient extends BaseClient {
    async getSections(args?: GetSectionsArgs): Promise<GetSectionsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetSectionsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_SECTIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateSectionArray(results),
            nextCursor,
        }
    }

    async searchSections(args: SearchSectionsArgs): Promise<GetSectionsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetSectionsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_SECTIONS_SEARCH,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateSectionArray(results),
            nextCursor,
        }
    }

    async getSection(id: string): Promise<Section> {
        IdSchema.parse(id)
        const response = await request<Section>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_SECTIONS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateSection(response.data)
    }

    async addSection(args: AddSectionArgs, requestId?: string): Promise<Section> {
        const response = await request<Section>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_SECTIONS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })

        return validateSection(response.data)
    }

    async updateSection(id: string, args: UpdateSectionArgs, requestId?: string): Promise<Section> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_SECTIONS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateSection(response.data)
    }

    async deleteSection(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_SECTIONS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }

    async archiveSection(id: string, requestId?: string): Promise<Section> {
        IdSchema.parse(id)
        const response = await request<Section>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_SECTIONS, id, SECTION_ARCHIVE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateSection(response.data)
    }

    async unarchiveSection(id: string, requestId?: string): Promise<Section> {
        IdSchema.parse(id)
        const response = await request<Section>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_SECTIONS, id, SECTION_UNARCHIVE),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateSection(response.data)
    }
}
