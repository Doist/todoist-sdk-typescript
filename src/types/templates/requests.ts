import type { ColorKey } from '../../utils/colors'
import type { Comment } from '../comments/types'
import type { PersonalProject, WorkspaceProject } from '../projects/types'
import type { Section } from '../sections/types'
import type { TemplateType } from '../sync/resources/suggestions'
import type { Task } from '../tasks/types'
import type { UploadFileArgs } from '../uploads/requests'
import type { TemplateContent } from './types'

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
