import type {
    CalendarSettings,
    ViewMode,
    GroupedBy,
    SortedBy,
    SortOrder,
} from '../resources/view-options'

export type ProjectViewOptionsDefaultsSetArgs = {
    projectId: string
    viewMode?: ViewMode | null
    groupedBy?: GroupedBy | null
    sortedBy?: SortedBy | null
    sortOrder?: SortOrder | null
    showCompletedTasks?: boolean
    filteredBy?: string | null
    calendarSettings?: CalendarSettings | null
}
