import { z } from 'zod'

export const DayActivitySchema = z.object({
    // Kept as string: this is a calendar-day bucket (e.g. '2025-01-13'), not a timestamp.
    // Coercing to Date would create UTC midnight, causing day-shift for non-UTC consumers.
    date: z.string(),
    totalCount: z.number().int(),
})
/** Daily activity count for a specific date. */
export type DayActivity = z.infer<typeof DayActivitySchema>

export const WeekRollupSchema = z.object({
    fromDate: z.string(),
    toDate: z.string(),
    totalCount: z.number().int(),
})
/** Weekly rollup of activity data. */
export type WeekRollup = z.infer<typeof WeekRollupSchema>

export const ProjectActivityStatsSchema = z.object({
    dayItems: z.array(DayActivitySchema),
    weekItems: z.array(WeekRollupSchema).nullable(),
})
/** Project activity statistics with daily and optional weekly rollups. */
export type ProjectActivityStats = z.infer<typeof ProjectActivityStatsSchema>

/** Available project health statuses. */
export const HEALTH_STATUSES = [
    'UNKNOWN',
    'ON_TRACK',
    'AT_RISK',
    'CRITICAL',
    'EXCELLENT',
    'ERROR',
] as const
/** Health status of a project. */
export type HealthStatus = (typeof HEALTH_STATUSES)[number]

export const TaskRecommendationSchema = z.object({
    taskId: z.string(),
    recommendation: z.string(),
})
/** A recommendation for a specific task. */
export type TaskRecommendation = z.infer<typeof TaskRecommendationSchema>

export const ProjectHealthSchema = z.object({
    status: z.enum(HEALTH_STATUSES),
    description: z.string().nullable().optional(),
    descriptionSummary: z.string().nullable().optional(),
    taskRecommendations: z.array(TaskRecommendationSchema).nullable().optional(),
    projectId: z.string().nullable().optional(),
    updatedAt: z.coerce.date().nullable().optional(),
    isStale: z.boolean().default(false),
    updateInProgress: z.boolean().default(false),
})
/** Project health status and recommendations. */
export type ProjectHealth = z.infer<typeof ProjectHealthSchema>

export const ProjectMetricsSchema = z.object({
    totalTasks: z.number().int(),
    completedTasks: z.number().int(),
    overdueTasks: z.number().int(),
    tasksCreatedThisWeek: z.number().int(),
    tasksCompletedThisWeek: z.number().int(),
    averageCompletionTime: z.number().nullable(),
})
/** Project metrics summary. */
export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>

export const TaskContextSchema = z.object({
    id: z.string(),
    content: z.string(),
    due: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    priority: z.string(),
    isCompleted: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    completedAt: z.coerce.date().nullable(),
    completedByUid: z.string().nullable(),
    labels: z.array(z.string()),
})
/** Task context used in health analysis. */
export type TaskContext = z.infer<typeof TaskContextSchema>

export const ProjectHealthContextSchema = z.object({
    projectId: z.string(),
    projectName: z.string(),
    projectDescription: z.string().nullable(),
    projectMetrics: ProjectMetricsSchema,
    tasks: z.array(TaskContextSchema),
    language: z.string().nullable().optional(),
})
/** Full project context for health analysis. */
export type ProjectHealthContext = z.infer<typeof ProjectHealthContextSchema>

export const ProjectProgressSchema = z.object({
    projectId: z.string(),
    completedCount: z.number().int(),
    activeCount: z.number().int(),
    progressPercent: z.number().int(),
})
/** Project progress with completion counts and percentage. */
export type ProjectProgress = z.infer<typeof ProjectProgressSchema>

export const ProjectInsightSchema = z.object({
    projectId: z.string(),
    health: ProjectHealthSchema.nullable(),
    progress: ProjectProgressSchema.nullable(),
})
/** Insight data for a single project within a workspace. */
export type ProjectInsight = z.infer<typeof ProjectInsightSchema>

export const WorkspaceInsightsSchema = z.object({
    folderId: z.string().nullable().optional(),
    projectInsights: z.array(ProjectInsightSchema),
})
/** Workspace insights grouped by folder. */
export type WorkspaceInsights = z.infer<typeof WorkspaceInsightsSchema>
