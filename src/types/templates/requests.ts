import type { Comment } from '../comments/types'
import type { PersonalProject, WorkspaceProject } from '../projects/types'
import type { Section } from '../sections/types'
import type { Task } from '../tasks/types'

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
 * Arguments for creating a project from a CSV template file.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/create_project_from_csv_api_v1_projects_import_post
 */
export type CreateProjectFromCSVArgs = {
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
 * Response from creating a project from a CSV template file.
 */
export type CreateProjectFromCSVResponse = {
    status: string
    projectId: string
    templateType: string
    projects: (PersonalProject | WorkspaceProject)[]
    sections: Section[]
    tasks: Task[]
    comments: Comment[]
}

/**
 * Arguments for importing a CSV template file into an existing project.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/import_project_csv_api_v1_projects__project_id__import_post
 */
export type ImportCSVIntoProjectArgs = {
    /** The project ID to import into. */
    projectId: string
    /** The template file content. */
    file: Buffer | NodeJS.ReadableStream | string | Blob
    /** Optional file name (required for Buffer/Stream). */
    fileName?: string
}

/**
 * Arguments for importing a template by ID into an existing project.
 * @see https://developer.todoist.com/api/v1/#tag/Projects/operation/import_project_template_api_v1_projects__project_id__import_template_post
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
