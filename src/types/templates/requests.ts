import type { ColorKey } from '../../utils/colors'
import type { Comment } from '../comments/types'
import type { PersonalProject, WorkspaceProject } from '../projects/types'
import type { Section } from '../sections/types'
import type { Task } from '../tasks/types'
import type { UploadFileArgs } from '../uploads/requests'
import type { TemplateSourceFilter, TemplateTypeFilter } from './types'

/** Shared file-upload surface for endpoints that accept a template CSV. */
type TemplateFileUpload = Pick<UploadFileArgs, 'file' | 'fileName'>

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
export type CreateProjectFromTemplateArgs = TemplateFileUpload & {
    /** Name for the new project. */
    name: string
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
export type ImportTemplateIntoProjectArgs = TemplateFileUpload & {
    /** The project ID to import into. */
    projectId: string
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
 * Arguments for creating a new user template from an existing project.
 * @see Undocumented; lives at `POST /api/v1/templates/user`.
 */
export type CreateUserTemplateArgs = {
    /** Template type. Only `project` is currently supported by the API. */
    templateType: 'project'
    /** Display name for the template (max 255 chars). */
    name: string
    /** Long description (max 1000 chars). */
    description: string
    /** ID of the project to capture as a template. */
    projectId: string
    /** Todoist color key (e.g. `lime_green`) or its numeric ID. */
    color: ColorKey | number
    /** If true, save into the workspace gallery instead of the user's personal gallery. */
    forWorkspace?: boolean
}

/**
 * Arguments for updating an existing user template. Only supplied fields are changed.
 * @see Undocumented; lives at `PUT /api/v1/templates/user/{template_id}`.
 */
export type UpdateUserTemplateArgs = {
    /** New display name (max 255 chars). */
    name?: string
    /** New long description (max 1000 chars). */
    description?: string
    /** Replace the source project used to build the template. */
    projectId?: string
    /** New Todoist color key or numeric ID. */
    color?: ColorKey | number
    /** Move the template into a specific workspace gallery. */
    workspaceId?: string | null
    /** Toggle workspace-member visibility. */
    sharedWithWorkspaceMembers?: boolean
}

/**
 * Arguments for previewing a CSV template file before importing it as a user template.
 * @see Undocumented; lives at `POST /api/v1/templates/user/preview_from_file`.
 */
export type PreviewUserTemplateFromFileArgs = TemplateFileUpload

/**
 * Arguments for creating a new user template by uploading a CSV file.
 *
 * Provide either `file` (the SDK uploads it) or `uploadedFileName` (server reuses a
 * previously uploaded file from {@link PreviewUserTemplateFromFileArgs}). One of the
 * two is required.
 *
 * @see Undocumented; lives at `POST /api/v1/templates/user/import`.
 */
export type CreateUserTemplateFromFileArgs = Partial<TemplateFileUpload> & {
    /** Template type. Only `project` is currently supported by the API. */
    templateType: 'project'
    /** Display name for the template (max 255 chars). */
    name: string
    /** Long description (max 1000 chars). */
    description: string
    /** Todoist color key (e.g. `lime_green`) or its numeric ID. */
    color: ColorKey | number
    /**
     * If the file has already been uploaded via `previewUserTemplateFromFile`, pass the
     * returned `uploadedFileName` to skip re-uploading. Required when `file` is omitted.
     */
    uploadedFileName?: string
}
