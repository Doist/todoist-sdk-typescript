import { z } from 'zod'

/** Available goal owner types. */
export const GOAL_OWNER_TYPES = ['USER', 'WORKSPACE'] as const
/** Goal owner type. */
export type GoalOwnerType = (typeof GOAL_OWNER_TYPES)[number]

/**
 * Progress of a {@link Goal}.
 *
 * The REST API returns these counts under `total_item_count` / `completed_item_count`,
 * reflecting the backend's generic "item" terminology. The SDK normalizes them to
 * `totalTaskCount` / `completedTaskCount` so the public surface consistently speaks
 * in "tasks" (matching the rest of the SDK). The `preprocess` step below performs
 * that rename after the transport layer's snake_case → camelCase conversion — do not
 * remove it without also changing the downstream field names.
 */
export const GoalProgressSchema = z.preprocess(
    (raw) => {
        if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
            return raw
        }
        const { totalItemCount, completedItemCount, totalTaskCount, completedTaskCount, ...rest } =
            raw as Record<string, unknown>
        return {
            ...rest,
            totalTaskCount: totalTaskCount ?? totalItemCount,
            completedTaskCount: completedTaskCount ?? completedItemCount,
        }
    },
    z.looseObject({
        totalTaskCount: z.number().int(),
        completedTaskCount: z.number().int(),
        percentage: z.number(),
    }),
)

export type GoalProgress = z.infer<typeof GoalProgressSchema>

export const GoalSchema = z.looseObject({
    id: z.string(),
    ownerType: z.enum(GOAL_OWNER_TYPES),
    ownerId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    deadline: z.string().nullable(),
    parentGoalId: z.string().nullable(),
    childOrder: z.number().int(),
    isCompleted: z.boolean(),
    completedAt: z.coerce.date().nullable(),
    responsibleUid: z.string().nullable(),
    isDeleted: z.boolean(),
    progress: GoalProgressSchema.optional(),
    creatorUid: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

/**
 * Represents a goal in Todoist.
 * Goals support dual ownership: personal (ownerType=USER) and workspace (ownerType=WORKSPACE).
 */
export type Goal = z.infer<typeof GoalSchema>
