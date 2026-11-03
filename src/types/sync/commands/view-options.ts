import type {
    CalendarSettings,
    GroupedBy,
    PropertySettingsPatch,
    SortedBy,
    SortOrder,
    ViewMode,
    ViewType,
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
    calendarSettings?: CalendarSettings | null
    /** Merged into the saved property settings; `null` clears them all. */
    propertySettings?: PropertySettingsPatch | null
}

export type ViewOptionsDeleteArgs = {
    viewType: ViewType
    objectId?: string
}
