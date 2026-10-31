import { z } from 'zod'

export const PlanLimitsSchema = z.looseObject({
    activeProjects: z.number().int().optional(),
    activityLog: z.number().int().optional(),
    collaboratorsPerProject: z.number().int().optional(),
    commentsPerTask: z.number().int().optional(),
    fileUploadsPerComment: z.number().int().optional(),
    filtersPerUser: z.number().int().optional(),
    labelsPerTask: z.number().int().optional(),
    /** How many active personal projects the plan allows, not counting the Inbox. */
    maxProjects: z.number().int().optional(),
    remindersPerUser: z.number().int().optional(),
    sectionsPerProject: z.number().int().optional(),
    tasksPerProject: z.number().int().optional(),
})

export type PlanLimits = z.infer<typeof PlanLimitsSchema>

export const UserPlanLimitsSchema = z.looseObject({
    current: PlanLimitsSchema,
    next: PlanLimitsSchema.nullable(),
})

export type UserPlanLimits = z.infer<typeof UserPlanLimitsSchema>
