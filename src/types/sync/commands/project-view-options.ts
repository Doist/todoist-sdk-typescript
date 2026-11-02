import type {
    CalendarSettingsArgs,
    KnownViewMode,
    KnownGroupedBy,
    KnownSortedBy,
    KnownSortOrder,
    PropertySettingsPatch,
} from '../resources/view-options'

export type ProjectViewOptionsDefaultsSetArgs = {
    projectId: string
    viewMode?: KnownViewMode | null
    groupedBy?: KnownGroupedBy | null
    sortedBy?: KnownSortedBy | null
    sortOrder?: KnownSortOrder | null
    showCompletedTasks?: boolean
    filteredBy?: string | null
    calendarSettings?: CalendarSettingsArgs | null
    /** Merged into the saved property settings; `null` clears them all. */
    propertySettings?: PropertySettingsPatch | null
}
