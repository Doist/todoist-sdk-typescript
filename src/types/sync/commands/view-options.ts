import type {
    CalendarSettingsArgs,
    KnownGroupedBy,
    KnownSortedBy,
    KnownSortOrder,
    KnownViewMode,
    KnownViewType,
    PropertySettingsPatch,
} from '../resources/view-options'

export type ViewOptionsSetArgs = {
    viewType: KnownViewType
    objectId?: string
    groupedBy?: KnownGroupedBy | null
    filteredBy?: string | null
    viewMode?: KnownViewMode
    showCompletedTasks?: boolean
    sortedBy?: KnownSortedBy | null
    sortOrder?: KnownSortOrder | null
    calendarSettings?: CalendarSettingsArgs | null
    /** Merged into the saved property settings; `null` clears them all. */
    propertySettings?: PropertySettingsPatch | null
}

export type ViewOptionsDeleteArgs = {
    viewType: KnownViewType
    objectId?: string
}
