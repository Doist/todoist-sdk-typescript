import type { ColorKey } from '../../utils/colors'
import type { Comment } from '../comments/types'
import type { PersonalProject, WorkspaceProject } from '../projects/types'
import type { Section } from '../sections/types'
import type { TemplateType } from '../sync/resources/suggestions'
import type { Task } from '../tasks/types'
import type { UploadFileArgs } from '../uploads/requests'
import type { Template, TemplateContent } from './types'

/** The template file to upload, for routes that accept a template CSV. */
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
 * Arguments for saving a project as a user template.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/create_user_template_api_v1_templates_user_post
 */
export type SaveProjectAsTemplateArgs = {
    /** The project to save as a template. */
    projectId: string
    /** Name of the template. */
    name: string
    /** Description shown with the template. */
    description: string
    /** Color of the template: a color key (e.g. `'lime_green'`) or its numeric ID (30-49). */
    color: ColorKey | number
    /** Template type (default: `'project'`). */
    templateType?: TemplateType
    /** Save the template to the project's workspace instead of the user's personal templates. */
    forWorkspace?: boolean
    /**
     * Save this content instead of the project's current content, e.g. a draft from
     * `previewProjectAsTemplate` with edits. `projectId` is still required.
     */
    content?: TemplateContent
}

/**
 * Arguments for creating a new project from a template ID.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/create_project_from_template_api_v1_projects_from_template_post
 */
export type CreateProjectFromTemplateIdArgs = {
    /** The template to create the project from. Setup templates are not supported. */
    templateId: string
    /** Name for the new project. Defaults to the template's localized name. */
    name?: string
    /** Locale for the template content (default: `'en'`). */
    locale?: string
    /** Workspace to create the project in. Workspace templates can only be used in their own workspace. */
    workspaceId?: string | null
    /** Folder to create the project in. */
    folderId?: string | null
}

/**
 * Response from creating a new project from a template ID.
 */
export type CreateProjectFromTemplateIdResponse = {
    status: string
    projectId: string
}

/** Template type values accepted when listing templates. */
export const TEMPLATE_TYPE_FILTERS = ['project', 'setup', 'all'] as const
/** Template type to list, or `'all'` for both. */
export type TemplateTypeFilter = (typeof TEMPLATE_TYPE_FILTERS)[number]

/** Template source values accepted when listing templates. */
export const TEMPLATE_SOURCE_FILTERS = ['todoist', 'user', 'workspace', 'all'] as const
/**
 * Where to list templates from: curated by Doist (`'todoist'`), saved by the user (`'user'`),
 * saved to the user's workspaces (`'workspace'`), or all of them (`'all'`).
 */
export type TemplateSourceFilter = (typeof TEMPLATE_SOURCE_FILTERS)[number]

/**
 * Arguments for discovering templates.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/discover_templates_api_v1_templates_get
 */
export type GetTemplatesArgs = {
    /** Template type to list (default: `'project'`). */
    templateType?: TemplateTypeFilter
    /** Where to list templates from (default: `'todoist'`, curated templates only). */
    templateSource?: TemplateSourceFilter
    /** Search template text and, without `categoryId`, matching curated categories. */
    query?: string | null
    /** Curated category slug, as returned by `getTemplateCategories`. */
    categoryId?: string | null
    /** Content locale (default: `'en'`). Unsupported locales fall back to English. */
    locale?: string
    /** Pass the previous page's `nextCursor`, with the same filters, to continue. */
    cursor?: string | null
    /** Page size, up to 200 (default: 50). */
    limit?: number
}

/**
 * Arguments for looking up templates by ID.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/discover_templates_api_v1_templates_get
 */
export type GetTemplatesByIdsArgs = {
    /** Up to 100 curated slugs or `UT_` template IDs. Missing or invisible IDs are omitted. */
    ids: string[]
    /** Content locale (default: `'en'`). Unsupported locales fall back to English. */
    locale?: string
    /** Pass the previous page's `nextCursor`, with the same IDs, to continue. */
    cursor?: string | null
    /** Page size, up to 200 (default: 50). */
    limit?: number
}

/**
 * Response from discovering or looking up templates.
 */
export type GetTemplatesResponse = {
    results: Template[]
    nextCursor: string | null
}

/**
 * Arguments for getting a single template.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/discover_template_api_v1_templates__template_id__get
 */
export type GetTemplateArgs = {
    /** Content locale (default: `'en'`). Unsupported locales fall back to English. */
    locale?: string
}

/**
 * Arguments for listing curated template categories.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/categories_api_v1_templates_categories_get
 */
export type GetTemplateCategoriesArgs = {
    /** Template type to categorize (default: `'project'`). */
    templateType?: TemplateTypeFilter
    /** Locale for category names and descriptions (default: `'en'`). */
    locale?: string
}

/**
 * Arguments for updating a user template. Omitted fields stay unchanged.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/update_user_template_api_v1_templates_user__template_id__put
 */
export type UpdateUserTemplateArgs = {
    /** New name, up to 255 characters. */
    name?: string
    /** New description, up to 1,000 characters. */
    description?: string
    /** Replace the template's content with this project's current content. */
    projectId?: string
    /** New color: a color key (e.g. `'lime_green'`) or its numeric ID (30-49). */
    color?: ColorKey | number
    /** Move a personal template into this workspace, keeping its ID. Workspace templates cannot move again. */
    workspaceId?: string
    /** Share the template with workspace members, or stop sharing it. Only the author can change this. */
    sharedWithWorkspaceMembers?: boolean
}

/**
 * Arguments for staging a CSV template to preview it before saving.
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/preview_user_template_api_v1_templates_user_preview_post
 */
export type PreviewUserTemplateFromFileArgs = TemplateFileUpload

/**
 * Arguments for saving a CSV template as a personal user template.
 *
 * Provide either `file`, or the `uploadedFileName` returned by `previewUserTemplateFromFile`
 * to save a staged file without uploading it again.
 *
 * @see https://developer.todoist.com/api/v1/#tag/Templates/operation/import_user_template_from_file_api_v1_templates_user_import_post
 */
export type CreateUserTemplateFromFileArgs = Partial<TemplateFileUpload> & {
    /** Name of the template, up to 255 characters. */
    name: string
    /** Description shown with the template, up to 1,000 characters. */
    description: string
    /** Color of the template: a color key (e.g. `'lime_green'`) or its numeric ID (30-49). */
    color: ColorKey | number
    /** A staged file from `previewUserTemplateFromFile`. Used when `file` is omitted. */
    uploadedFileName?: string
}
