import { z } from 'zod'
import { PROJECT_VIEW_STYLES } from '../projects/types'
import { TEMPLATE_TYPES } from '../sync/resources/suggestions'

/** Template source values returned on template objects. */
export const TEMPLATE_SOURCES = ['doist', 'user'] as const
/** Whether a template is curated by Doist or saved by a user. */
export type TemplateSource = (typeof TEMPLATE_SOURCES)[number]

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
    templateSource: z.enum(TEMPLATE_SOURCES),
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
