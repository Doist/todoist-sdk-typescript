export type SectionAddArgs = {
    projectId: string
    name: string
    sectionOrder?: number
    orderKey?: string
    addedAt?: string
}

export type SectionUpdateArgs = {
    id: string
    name?: string
    isCollapsed?: boolean
    orderKey?: string
}

export type SectionMoveArgs = {
    id: string
    projectId: string
}

/**
 * @deprecated Set `orderKey` via `section_update` instead.
 */
export type SectionReorderArgs = {
    sections: Array<{ id: string; sectionOrder: number }>
}

export type SectionArchiveArgs = {
    id: string
    archivedAt?: string
}

export type SectionUnarchiveArgs = {
    id: string
}

export type SectionDeleteArgs = {
    id: string
}
