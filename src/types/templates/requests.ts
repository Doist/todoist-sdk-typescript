import type { Comment } from '../comments/types'
import type { PersonalProject, WorkspaceProject } from '../projects/types'
import type { Section } from '../sections/types'
import type { Task } from '../tasks/types'
import type { Template, TemplateCategory, TemplateSourceFilter, TemplateTypeFilter } from './types'

/**
 * Arguments for exporting a project as a template file.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/export_as_file_api_v1_templates_file_get
 */
export type ExportTemplateFileArgs = {
    /** The project ID to export. */
    projectId: string
    /** Whether to use relative dates in the export. */
    useRelativeDates?: boolean
}

/**
 * Arguments for exporting a project as a template URL.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/export_as_url_api_v1_templates_url_get
 */
export type ExportTemplateUrlArgs = {
    /** The project ID to export. */
    projectId: string
    /** Whether to use relative dates in the export. */
    useRelativeDates?: boolean
}

/**
 * Response from exporting a project as a template URL.
 */
export type ExportTemplateUrlResponse = {
    fileName: string
    fileUrl: string
}

/**
 * Arguments for creating a project from a template file.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/create_project_from_file_api_v1_templates_create_project_from_file_post
 */
export type CreateProjectFromTemplateArgs = {
    /** Name for the new project. */
    name: string
    /** The template file content. */
    file: Buffer | NodeJS.ReadableStream | string | Blob
    /** Optional file name (required for Buffer/Stream). */
    fileName?: string
    /** Optional workspace ID. */
    workspaceId?: string | null
}

/**
 * Response from creating a project from a template.
 */
export type CreateProjectFromTemplateResponse = {
    status: string
    projectId: string
    templateType: string
    projects: (PersonalProject | WorkspaceProject)[]
    sections: Section[]
    tasks: Task[]
    comments: Comment[]
}

/**
 * Arguments for importing a template file into an existing project.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/import_into_project_from_file_api_v1_templates_import_into_project_from_file_post
 */
export type ImportTemplateIntoProjectArgs = {
    /** The project ID to import into. */
    projectId: string
    /** The template file content. */
    file: Buffer | NodeJS.ReadableStream | string | Blob
    /** Optional file name (required for Buffer/Stream). */
    fileName?: string
}

/**
 * Arguments for importing a template by ID into an existing project.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/import_into_project_from_template_id_api_v1_templates_import_into_project_from_template_id_post
 */
export type ImportTemplateFromIdArgs = {
    /** The project ID to import into. */
    projectId: string
    /** The template ID to import. */
    templateId: string
    /** Locale for the import (default: 'en'). */
    locale?: string
}

/**
 * Response from importing a template into a project.
 */
export type ImportTemplateResponse = {
    status: string
    templateType: string
    projects: (PersonalProject | WorkspaceProject)[]
    sections: Section[]
    tasks: Task[]
    comments: Comment[]
}

/**
 * Arguments for listing templates from the gallery.
 * @see Undocumented; lives at `GET /api/v1/templates/list`.
 */
export type GetTemplatesArgs = {
    /** Filter by template type (default `project`). */
    templateType?: TemplateTypeFilter
    /** Filter by template source (default `doist`). `user`/`workspace`/`all` require auth. */
    templateSource?: TemplateSourceFilter
    /** ISO locale used to resolve Contentful content (default `en`). */
    locale?: string
    /** Page size, 1..100 (default 100). */
    limit?: number
    /** Opaque cursor returned in `nextCursor` from a previous page. */
    cursor?: string | null
    /** Free-text search across template name/description. */
    query?: string
    /** Restrict to a single Contentful category. */
    categoryId?: string
}

/**
 * Response from listing templates.
 */
export type GetTemplatesResponse = {
    templates: Template[]
    count: number
    hasMore: boolean
    nextCursor?: string
}

/**
 * Arguments for listing template categories.
 * @see Undocumented; lives at `GET /api/v1/templates/categories`.
 */
export type GetTemplateCategoriesArgs = {
    /** Filter by template type (default `project`). */
    templateType?: TemplateTypeFilter
    /** ISO locale (default `en`). */
    locale?: string
}

/**
 * Response from listing template categories.
 */
export type GetTemplateCategoriesResponse = {
    categories: TemplateCategory[]
}

/**
 * Arguments for fetching one or more templates by ID.
 * @see Undocumented; lives at `GET /api/v1/templates/get`.
 */
export type GetTemplatesByIdsArgs = {
    /** 1..100 template IDs. Mixing Contentful and user IDs forces auth. */
    templateIds: string[]
    /** ISO locale (default `en`). */
    locale?: string
}

/**
 * Response from fetching templates by ID. Unknown IDs are silently omitted.
 */
export type GetTemplatesByIdsResponse = {
    templates: Record<string, Template>
}
