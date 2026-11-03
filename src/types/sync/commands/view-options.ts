import type {
    CalendarSettingsArgs,
    GroupedBy,
    SortedBy,
    SortOrder,
    ViewMode,
    ViewType,
    PropertySettingsPatch,
} from '../resources/view-options'

export type ViewOptionsSetArgs = {
    viewType: ViewType
    objectId?: string
    groupedBy?: GroupedBy | null
    filteredBy?: string | null
    viewMode?: ViewMode
    showCompletedTasks?: boolean
    sortedBy?: SortedBy | null
    sortOrder?: SortOrder | null
    calendarSettings?: CalendarSettingsArgs | null
    /** Merged into the saved property settings; `null` clears them all. */
    propertySettings?: PropertySettingsPatch | null
}

export type ViewOptionsDeleteArgs = {
    viewType: ViewType
    objectId?: string
}
