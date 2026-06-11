import type { RequireAtLeastOne } from 'type-fest'
import type { SearchArgs } from '../common'
import type { Section } from './types'

/**
 * Arguments for retrieving sections.
 * @see https://developer.todoist.com/api/v1/#tag/Sections/operation/get_sections_api_v1_sections_get
 */
export type GetSectionsArgs = {
    projectId?: string | null
    cursor?: string | null
    limit?: number
}

/**
 * Arguments for searching sections.
 */
export type SearchSectionsArgs = SearchArgs & { projectId?: string | null }

/**
 * Response from retrieving sections.
 * @see https://developer.todoist.com/api/v1/#tag/Sections/operation/get_sections_api_v1_sections_get
 */
export type GetSectionsResponse = {
    results: Section[]
    nextCursor: string | null
}

/**
 * Arguments for creating a new section.
 * @see https://developer.todoist.com/api/v1/#tag/Sections/operation/create_section_api_v1_sections_post
 */
export type AddSectionArgs = {
    name: string
    projectId: string
    order?: number | null
    /** Optional description for the section (Markdown). */
    description?: string
}

/**
 * Arguments for updating a section. At least one field must be provided.
 * @see https://developer.todoist.com/api/v1/#tag/Sections/operation/update_section_api_v1_sections__section_id__post
 */
export type UpdateSectionArgs = RequireAtLeastOne<{
    name: string
    /**
     * Updated section description (Markdown). Pass `null` to clear it. Omit the
     * field to keep it unchanged.
     */
    description: string | null
}>
