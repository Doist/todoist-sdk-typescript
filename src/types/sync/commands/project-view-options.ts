import type {
    CalendarSettingsArgs,
    ViewMode,
    GroupedBy,
    SortedBy,
    SortOrder,
    PropertySettingsPatch,
} from '../resources/view-options'

export type ProjectViewOptionsDefaultsSetArgs = {
    projectId: string
    viewMode?: ViewMode | null
    groupedBy?: GroupedBy | null
    sortedBy?: SortedBy | null
    sortOrder?: SortOrder | null
    showCompletedTasks?: boolean
    filteredBy?: string | null
    calendarSettings?: CalendarSettingsArgs | null
    /** Merged into the saved property settings; `null` clears them all. */
    propertySettings?: PropertySettingsPatch | null
}
