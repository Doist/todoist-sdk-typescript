import { z } from 'zod'

/** Template type values returned on Template objects. */
export const TEMPLATE_TYPE_VALUES = ['setup', 'project'] as const
/** Template type as it appears on a Template object. */
export type TemplateTypeValue = (typeof TEMPLATE_TYPE_VALUES)[number]

/** Template type values accepted as a query filter (adds `all` meta value). */
export const TEMPLATE_TYPE_FILTERS = [...TEMPLATE_TYPE_VALUES, 'all'] as const
/** Template type accepted as a query filter. */
export type TemplateTypeFilter = (typeof TEMPLATE_TYPE_FILTERS)[number]

/** Template source values returned on Template objects. */
export const TEMPLATE_SOURCE_VALUES = ['doist', 'user'] as const
/** Template source as it appears on a Template object. */
export type TemplateSourceValue = (typeof TEMPLATE_SOURCE_VALUES)[number]

/** Template source values accepted as a query filter (adds `workspace` and `all`). */
export const TEMPLATE_SOURCE_FILTERS = [...TEMPLATE_SOURCE_VALUES, 'workspace', 'all'] as const
/** Template source accepted as a query filter. */
export type TemplateSourceFilter = (typeof TEMPLATE_SOURCE_FILTERS)[number]

/** Default view types a template can suggest for an imported project. */
export const TEMPLATE_VIEW_TYPES = ['list', 'board', 'calendar'] as const
/** Default view type a template can suggest. */
export type TemplateViewType = (typeof TEMPLATE_VIEW_TYPES)[number]

export const TemplateCreatorSchema = z.object({
    userId: z.string().nullable().optional(),
    name: z.string(),
    position: z.string(),
    avatar: z.string(),
})
/** Information about the creator of a template (Doist or user). */
export type TemplateCreator = z.infer<typeof TemplateCreatorSchema>

export const TemplateSeoSchema = z.object({
    title: z.string(),
    description: z.string().nullable(),
})
/** SEO metadata attached to a template or category. */
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
    templateType: z.enum(TEMPLATE_TYPE_VALUES),
    templateSource: z.enum(TEMPLATE_SOURCE_VALUES),
    shortDescription: z.string(),
    longDescription: z.string(),
    instructions: z.string().nullable(),
    importUrl: z.string().nullable(),
    viewType: z.enum(TEMPLATE_VIEW_TYPES).optional(),
    thumbnailImage: z.string().nullable(),
    thumbnailImageDark: z.string().nullable(),
    coverImage: z.string().nullable(),
    previewImage: z.string().nullable(),
    templateColor: z.string().nullable(),
    backgroundColor: z.string().nullable(),
    backgroundColorDark: z.string().nullable(),
    creator: TemplateCreatorSchema,
    seo: TemplateSeoSchema.nullable(),
    moreResources: z.array(TemplateResourceSchema),
    categoryIds: z.array(z.string()),
    projectCount: z.number().optional(),
    labelCount: z.number().optional(),
    filterCount: z.number().optional(),
    videoUrl: z.string().nullable().optional(),
    videoPreviewImageUrl: z.string().nullable().optional(),
    videoThumbnailImage: z.string().nullable().optional(),
    workspaceId: z.string().nullable().optional(),
    sharedWithWorkspaceMembers: z.boolean().optional(),
    canEdit: z.boolean().optional(),
})
/**
 * A template that can be browsed in the Todoist gallery or imported into a project.
 * @see https://developer.todoist.com/api/v1/#tag/Templates
 */
export type Template = z.infer<typeof TemplateSchema>

export const TemplateCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    seo: TemplateSeoSchema,
})
/** A Contentful-backed category used to group templates in the gallery. */
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>
