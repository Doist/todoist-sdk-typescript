import type {
    CalendarSettings,
    GroupedBy,
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
}

export type ViewOptionsDeleteArgs = {
    viewType: ViewType
    objectId?: string
}
