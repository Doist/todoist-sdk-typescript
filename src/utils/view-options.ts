import type { ViewOptions, ViewType } from '../types/sync'

export interface FindViewOptionsArgs {
    /** View types that identify the logical view. */
    viewTypes: readonly ViewType[]
    /** Object ID for object-backed views. Omit for singleton views. */
    objectId?: string | null
}

/** Finds the active saved options for one logical view. */
export function findViewOptions(
    options: readonly ViewOptions[],
    args: FindViewOptionsArgs,
): ViewOptions | undefined {
    const targetObjectId = args.objectId ?? null

    return options.find(
        (entry) =>
            entry.isDeleted !== true &&
            (entry.objectId ?? null) === targetObjectId &&
            args.viewTypes.includes(entry.viewType),
    )
}
