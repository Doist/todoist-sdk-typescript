import { z } from 'zod'
import { CommentSchema } from '../comments/types'
import { PROJECT_VIEW_STYLES, ProjectSchema } from '../projects/types'
import { SectionSchema } from '../sections/types'
import { TEMPLATE_TYPES } from '../sync/resources/suggestions'
import { DurationSchema, TaskSchema } from '../tasks/types'

/** Template source values returned on template objects. */
export const TEMPLATE_SOURCES = ['todoist', 'user'] as const
/** Whether a template is curated by Doist (`'todoist'`) or saved by a user (`'user'`). */
export type TemplateSource = (typeof TEMPLATE_SOURCES)[number]

// Template discovery reports curated templates as `todoist`, but the user template
// routes document `doist` for the same thing. Accept both and keep one spelling.
const TemplateSourceSchema = z
    .enum([...TEMPLATE_SOURCES, 'doist'])
    .transform((source): TemplateSource => (source === 'doist' ? 'todoist' : source))

export const TemplatePersonSchema = z.object({
    userId: z.string().nullable().optional(),
    name: z.string(),
    position: z.string(),
    avatar: z.string(),
})
/** The creator or last editor of a template. */
export type TemplatePerson = z.infer<typeof TemplatePersonSchema>

export const TemplateSeoSchema = z.object({
    title: z.string(),
    description: z.string().nullable(),
})
/** SEO metadata attached to a curated template. */
export type TemplateSeo = z.infer<typeof TemplateSeoSchema>

export const TemplateResourceSchema = z.object({
    title: z.string(),
    url: z.string(),
})
/** A "more resources" link surfaced alongside a template. */
export type TemplateResource = z.infer<typeof TemplateResourceSchema>

export const TemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    templateType: z.enum(TEMPLATE_TYPES),
    templateSource: TemplateSourceSchema,
    shortDescription: z.string(),
    longDescription: z.string(),
    instructions: z.string().nullable(),
    importUrl: z.string().nullable().optional(),
    viewType: z.enum(PROJECT_VIEW_STYLES).nullable().optional(),
    thumbnailImage: z.string().nullable(),
    thumbnailImageDark: z.string().nullable(),
    coverImage: z.string().nullable(),
    previewImage: z.string().nullable(),
    templateColor: z.string().nullable(),
    backgroundColor: z.string().nullable(),
    backgroundColorDark: z.string().nullable(),
    creator: TemplatePersonSchema.nullable(),
    seo: TemplateSeoSchema.nullable(),
    moreResources: z.array(TemplateResourceSchema),
    categoryIds: z.array(z.string()),
    projectCount: z.number().nullable().optional(),
    labelCount: z.number().nullable().optional(),
    filterCount: z.number().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    videoPreviewImageUrl: z.string().nullable().optional(),
    videoThumbnailImage: z.string().nullable().optional(),
    workspaceId: z.string().nullable().optional(),
    sharedWithWorkspaceMembers: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    lastEditedBy: TemplatePersonSchema.nullable().optional(),
    lastEditedAt: z.string().nullable().optional(),
})
/**
 * A Todoist template, either curated by Doist or saved by a user.
 * @see https://developer.todoist.com/api/v1/#tag/Templates
 */
export type Template = z.infer<typeof TemplateSchema>

export const TemplateCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    seo: TemplateSeoSchema,
})
/** A curated category used to group templates in the Todoist gallery. */
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>

export const TemplateFromCSVPreviewSchema = z
    .object({
        uploadedFileName: z.string(),
        templateType: z.enum(TEMPLATE_TYPES),
        projects: z.array(ProjectSchema),
        sections: z.array(SectionSchema),
        items: z.array(TaskSchema),
        notes: z.array(CommentSchema),
        projectNotes: z.array(CommentSchema),
    })
    // The API uses sync names for tasks and comments; rename them to match the rest of the SDK.
    .transform(({ items, notes, projectNotes, ...rest }) => ({
        ...rest,
        tasks: items,
        comments: notes,
        projectComments: projectNotes,
    }))
/**
 * A staged CSV file and the template content it would create.
 * Pass `uploadedFileName` to `createTemplateFromCSV` to save it without uploading again.
 */
export type TemplateFromCSVPreview = z.infer<typeof TemplateFromCSVPreviewSchema>

export const TemplateContentDateSchema = z
    .looseObject({
        date: z.string().optional(),
        string: z.string().optional(),
        lang: z.string().nullable().optional(),
        isRecurring: z.boolean().optional(),
        timezone: z.string().nullable().optional(),
    })
    .refine((value) => value.date !== undefined || value.string !== undefined, {
        message: 'A template date needs a `date` or a `string`.',
    })
/**
 * A due date or deadline in template content: either a complete date object (`date`, with
 * `string`, `isRecurring` and `timezone` for dues), as `getTemplateContent` returns it, or just the
 * text, e.g. `{ string: "every monday" }`. Fields the SDK doesn't know are kept, so content read
 * with `getTemplateContent` can be sent back without losing them.
 */
export type TemplateContentDate = z.infer<typeof TemplateContentDateSchema>

export const TemplateContentProjectSchema = z.object({
    viewStyle: z.enum(PROJECT_VIEW_STYLES),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
})
/** The project-level settings a template creates projects with. */
export type TemplateContentProject = z.infer<typeof TemplateContentProjectSchema>

export const TemplateContentSectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
})
/** A section in template content. `id` is only a reference within the content. */
export type TemplateContentSection = z.infer<typeof TemplateContentSectionSchema>

export const TemplateContentTaskSchema = z.object({
    id: z.string(),
    parentId: z.string().nullable().optional(),
    sectionId: z.string().nullable().optional(),
    content: z.string(),
    description: z.string().nullable().optional(),
    priority: z.number().optional(),
    labels: z.array(z.string()).optional(),
    due: TemplateContentDateSchema.nullable().optional(),
    deadline: TemplateContentDateSchema.nullable().optional(),
    duration: DurationSchema.nullable().optional(),
    responsibleUid: z.string().nullable().optional(),
    assignedByUid: z.string().nullable().optional(),
})
/**
 * A task in template content. `id`, `parentId` and `sectionId` are only references within the
 * content, so new tasks can use any ID that is unique in it.
 */
export type TemplateContentTask = z.infer<typeof TemplateContentTaskSchema>

const TemplateContentCommentFields = {
    content: z.string(),
    postedUid: z.string().nullable().optional(),
    postedAt: z.string().nullable().optional(),
    fileAttachment: z.looseObject({}).nullable().optional(),
}

export const TemplateContentCommentSchema = z.object({
    taskId: z.string(),
    ...TemplateContentCommentFields,
})
/** A comment on a task in template content. `taskId` refers to a task's `id` in the same content. */
export type TemplateContentComment = z.infer<typeof TemplateContentCommentSchema>

export const TemplateContentProjectCommentSchema = z.object(TemplateContentCommentFields)
/** A comment on the project in template content. */
export type TemplateContentProjectComment = z.infer<typeof TemplateContentProjectCommentSchema>

export const TemplateContentSchema = z.object({
    projects: z.array(TemplateContentProjectSchema),
    sections: z.array(TemplateContentSectionSchema),
    tasks: z.array(TemplateContentTaskSchema),
    comments: z.array(TemplateContentCommentSchema),
    projectComments: z.array(TemplateContentProjectCommentSchema),
    projectViewOptionsDefaults: z.array(z.looseObject({})),
})
/**
 * The full content of a project template, in the shape `updateTemplate` accepts back.
 * Tasks keep the order they appear in.
 */
export type TemplateContent = z.infer<typeof TemplateContentSchema>

export const TemplateContentResponseSchema = z
    .object({
        templateType: z.enum(TEMPLATE_TYPES),
        workspaceId: z.string().nullable().optional(),
        projects: z.array(TemplateContentProjectSchema),
        sections: z.array(TemplateContentSectionSchema),
        items: z.array(TemplateContentTaskSchema),
        notes: z.array(z.object({ itemId: z.string(), ...TemplateContentCommentFields })),
        projectNotes: z.array(TemplateContentProjectCommentSchema),
        projectViewOptionsDefaults: z.array(z.looseObject({})).optional(),
    })
    // The API uses sync names for tasks and comments; rename them to match the rest of the SDK.
    .transform(({ templateType, workspaceId, items, notes, projectNotes, ...rest }) => ({
        templateType,
        workspaceId: workspaceId ?? null,
        content: {
            projects: rest.projects,
            sections: rest.sections,
            tasks: items,
            comments: notes.map(({ itemId, ...comment }) => ({ taskId: itemId, ...comment })),
            projectComments: projectNotes,
            projectViewOptionsDefaults: rest.projectViewOptionsDefaults ?? [],
        },
    }))
/** A template's type, workspace and full content, as returned by `getTemplateContent`. */
export type TemplateContentResponse = z.infer<typeof TemplateContentResponseSchema>
