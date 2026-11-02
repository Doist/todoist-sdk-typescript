import { z } from 'zod'

/**
 * Accepts any string, typed as one of the `Known` values or an unknown string: the API adds
 * values over time, and one this SDK version doesn't know yet is kept as sent rather than
 * failing the whole response.
 */
function openEnumSchema<Known extends string>(): z.ZodType<Known | (string & {})> {
    return z.string()
}

/** View types the SDK knows. */
export const VIEW_TYPES = [
    'TODAY',
    'UPCOMING',
    'PROJECT',
    'LABEL',
    'FILTER',
    'WORKSPACE_FILTER',
    'SEARCH',
    'TEMPLATE_PREVIEW',
    'TASK_DETAIL',
    'AUTOMATION',
    'ASSIGNED',
    'ASSIGNED_TO_ME',
    'OVERDUE',
    'WORKSPACE_OVERVIEW',
] as const
/** A view type the SDK knows. Write arguments accept only these. */
export type KnownViewType = (typeof VIEW_TYPES)[number]
/** Type of view in the Todoist UI: a known type, or a newer one kept as sent. */
export type ViewType = KnownViewType | (string & {})

export const ViewTypeSchema = openEnumSchema<KnownViewType>()

/** View modes the SDK knows. */
export const VIEW_MODES = ['LIST', 'BOARD', 'CALENDAR', 'TABLE'] as const
/** A view mode the SDK knows. Write arguments accept only these. */
export type KnownViewMode = (typeof VIEW_MODES)[number]
/** Display mode for a view: a known mode, or a newer one kept as sent. */
export type ViewMode = KnownViewMode | (string & {})

export const ViewModeSchema = openEnumSchema<KnownViewMode>()

/** Grouping options the SDK knows. */
export const GROUPED_BY_OPTIONS = [
    'ASSIGNEE',
    'ADDED_DATE',
    'DUE_DATE',
    'DEADLINE',
    'LABEL',
    'PRIORITY',
    'PROJECT',
    'WORKSPACE',
] as const
/** A grouping option the SDK knows. Write arguments accept only these. */
export type KnownGroupedBy = (typeof GROUPED_BY_OPTIONS)[number]
/** Field to group tasks by: a known field, or a newer one kept as sent. */
export type GroupedBy = KnownGroupedBy | (string & {})

export const GroupedBySchema = openEnumSchema<KnownGroupedBy>().nullable()

/** Sorting options the SDK knows. */
export const SORTED_BY_OPTIONS = [
    'MANUAL',
    'ALPHABETICALLY',
    'ASSIGNEE',
    'DUE_DATE',
    'DEADLINE',
    'ADDED_DATE',
    'LABEL',
    'PRIORITY',
    'PROJECT',
    'WORKSPACE',
] as const
/** A sorting option the SDK knows. Write arguments accept only these. */
export type KnownSortedBy = (typeof SORTED_BY_OPTIONS)[number]
/** Field to sort tasks by: a known field, or a newer one kept as sent. */
export type SortedBy = KnownSortedBy | (string & {})

export const SortedBySchema = openEnumSchema<KnownSortedBy>().nullable()

/** Sort directions the SDK knows. */
export const SORT_ORDERS = ['ASC', 'DESC'] as const
/** A sort direction the SDK knows. Write arguments accept only these. */
export type KnownSortOrder = (typeof SORT_ORDERS)[number]
/** Sort direction: a known direction, or a newer one kept as sent. */
export type SortOrder = KnownSortOrder | (string & {})

export const SortOrderSchema = openEnumSchema<KnownSortOrder>().nullable()

/** Calendar layout modes the SDK knows. */
export const CALENDAR_LAYOUTS = ['WEEK', 'MONTH'] as const
/** A calendar layout mode the SDK knows. Write arguments accept only these. */
export type KnownCalendarLayout = (typeof CALENDAR_LAYOUTS)[number]
/** Calendar layout mode: a known mode, or a newer one kept as sent. */
export type CalendarLayout = KnownCalendarLayout | (string & {})

/** Task color sources for calendar views the SDK knows. */
export const CALENDAR_COLORS = ['PRIORITY', 'LABEL', 'PROJECT'] as const
/** A calendar task color source the SDK knows. Write arguments accept only these. */
export type KnownCalendarColor = (typeof CALENDAR_COLORS)[number]
/** Task color source for a calendar view: a known source, or a newer one kept as sent. */
export type CalendarColor = KnownCalendarColor | (string & {})

export const CalendarSettingsSchema = z.looseObject({
    layout: openEnumSchema<KnownCalendarLayout>().nullable().optional(),
    visibleDayCount: z
        .union([z.literal(1), z.literal(3), z.literal(7)])
        .nullable()
        .optional(),
    color: openEnumSchema<KnownCalendarColor>().nullable().optional(),
})

export type CalendarSettings = z.infer<typeof CalendarSettingsSchema>

/** Calendar settings to save, limited to values the SDK knows. */
export type CalendarSettingsArgs = {
    layout?: KnownCalendarLayout | null
    visibleDayCount?: CalendarSettings['visibleDayCount']
    color?: KnownCalendarColor | null
}

/** How a view shows one task property. Attributes the SDK doesn't know are kept. */
export const PropertyAttributesSchema = z.looseObject({
    is_hidden: z.boolean().optional(),
    /** Width of the property's column, in CSS pixels. */
    width: z.number().int().optional(),
})

export type PropertyAttributes = z.infer<typeof PropertyAttributesSchema>

/**
 * How a view shows task properties, such as `due` or `labels`, holding only what the user
 * changed. Property IDs are opaque strings (`field:6Jf8VQXx`), so every key inside keeps its
 * API spelling rather than being camel-cased, and keys the SDK doesn't know are kept.
 */
export const PropertySettingsSchema = z.looseObject({
    /** Property IDs in display order. */
    order: z.array(z.string()).optional(),
    /** How each property shows, by property ID. */
    properties: z.record(z.string(), PropertyAttributesSchema).optional(),
})

export type PropertySettings = z.infer<typeof PropertySettingsSchema>

/** A change to one property's attributes, where `null` resets an attribute. */
export type PropertyAttributesPatch = {
    is_hidden?: boolean | null
    width?: number | null
    [attribute: string]: unknown
}

/**
 * A change to property settings, applied like a JSON merge patch: objects merge into the
 * saved settings, arrays such as `order` replace them, and `null` removes its path. Keys
 * keep their API spelling, as in {@link PropertySettings}.
 */
export type PropertySettingsPatch = {
    order?: string[] | null
    properties?: Record<string, PropertyAttributesPatch | null> | null
    [key: string]: unknown
}

export const ViewOptionsSchema = z.looseObject({
    viewType: ViewTypeSchema,
    objectId: z.string().nullable().optional(),
    groupedBy: GroupedBySchema.optional(),
    filteredBy: z.string().nullable().optional(),
    viewMode: ViewModeSchema.nullable().optional(),
    showCompletedTasks: z.boolean().optional(),
    sortedBy: SortedBySchema.optional(),
    sortOrder: SortOrderSchema.optional(),
    calendarSettings: CalendarSettingsSchema.nullable().optional(),
    propertySettings: PropertySettingsSchema.nullable().optional(),
    isDeleted: z.literal(false).optional(),
})

export type ViewOptions = z.infer<typeof ViewOptionsSchema>

// A tombstone keeps only what identifies the deleted row, and the API empties every option.
const TOMBSTONE_FIELDS = {
    isDeleted: z.literal(true),
    viewMode: z.literal('').optional(),
    groupedBy: z.literal('').optional(),
    sortedBy: z.literal('').optional(),
    sortOrder: z.literal('').optional(),
    filteredBy: z.literal('').optional(),
    showCompletedTasks: z.boolean().optional(),
    calendarSettings: z.null().optional(),
    propertySettings: z.null().optional(),
}

/** Deleted view options, as incremental syncs report them. */
export const ViewOptionsTombstoneSchema = z.looseObject({
    viewType: ViewTypeSchema,
    objectId: z.string().nullable().optional(),
    ...TOMBSTONE_FIELDS,
})

export type ViewOptionsTombstone = z.infer<typeof ViewOptionsTombstoneSchema>

export const ProjectViewOptionsDefaultsSchema = z.looseObject({
    projectId: z.string(),
    viewMode: ViewModeSchema.nullable().optional(),
    groupedBy: GroupedBySchema.optional(),
    sortedBy: SortedBySchema.optional(),
    sortOrder: SortOrderSchema.optional(),
    showCompletedTasks: z.boolean().optional(),
    filteredBy: z.string().nullable().optional(),
    calendarSettings: CalendarSettingsSchema.nullable().optional(),
    propertySettings: PropertySettingsSchema.nullable().optional(),
    isDeleted: z.literal(false).optional(),
})

export type ProjectViewOptionsDefaults = z.infer<typeof ProjectViewOptionsDefaultsSchema>

/** Deleted project view options defaults, as incremental syncs report them. */
export const ProjectViewOptionsDefaultsTombstoneSchema = z.looseObject({
    projectId: z.string(),
    ...TOMBSTONE_FIELDS,
})

export type ProjectViewOptionsDefaultsTombstone = z.infer<
    typeof ProjectViewOptionsDefaultsTombstoneSchema
>
