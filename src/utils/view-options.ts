import type { ViewOptions, ViewType } from '../types/sync'

export type FindViewOptionsArgs = {
    /** View types that identify the logical view. */
    viewTypes: readonly ViewType[]
    /** Object ID for object-backed views. Omit for singleton views. */
    objectId?: string | null
}

/** Returns whether saved view options are active rather than a deletion tombstone. */
export function isActiveViewOption(options: ViewOptions): boolean {
    return options.isDeleted !== true
}

/** Finds the active saved options for one logical view. */
export function findViewOptions(
    options: readonly ViewOptions[],
    args: FindViewOptionsArgs,
): ViewOptions | undefined {
    const targetObjectId = args.objectId ?? null

    return options.find(
        (entry) =>
            isActiveViewOption(entry) &&
            (entry.objectId ?? null) === targetObjectId &&
            args.viewTypes.includes(entry.viewType),
    )
}
