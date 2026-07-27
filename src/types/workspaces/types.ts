import { z } from 'zod'
import { StringOrNumberSchema } from '../common'
import { DueDateSchema, DeadlineSchema } from '../tasks/types'

/** Available project collaborator roles. */
export const COLLABORATOR_ROLES = [
    'CREATOR',
    'ADMIN',
    'READ_WRITE',
    'EDIT_ONLY',
    'COMPLETE_ONLY',
] as const
/** Role of a collaborator in a project. */
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number]

/**
 * Available workspace roles.
 */
export const WORKSPACE_ROLES = ['ADMIN', 'MEMBER', 'GUEST'] as const

/**
 * Role of a user within a workspace.
 */
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const WorkspaceRoleSchema = z.enum(WORKSPACE_ROLES)

export const WorkspaceUserSchema = z.object({
    userId: z.string(),
    workspaceId: z.string(),
    userEmail: z.string(),
    fullName: z.string(),
    timezone: z.string(),
    role: WorkspaceRoleSchema,
    imageId: z.string().nullable(),
    isDeleted: z.boolean().default(false),
})

/**
 * Represents a user within a workspace (MemberView from API).
 */
export type WorkspaceUser = z.infer<typeof WorkspaceUserSchema>

export const WorkspaceInvitationSchema = z.object({
    id: z.string().default('0'),
    inviterId: z.string(),
    userEmail: z.string(),
    workspaceId: z.string(),
    role: WorkspaceRoleSchema,
})

/**
 * Represents a workspace invitation.
 */
export type WorkspaceInvitation = z.infer<typeof WorkspaceInvitationSchema>

export const PlanPriceSchema = z.object({
    currency: z.string(),
    amount: z.union([z.number(), z.string()]),
    interval: z.string().optional(),
})

/**
 * Plan pricing information.
 */
export type PlanPrice = z.infer<typeof PlanPriceSchema>

export const FormattedPriceListingSchema = z.object({
    currency: z.string().optional(),
    amount: z.number().optional(),
    interval: z.string().optional(),
    formatted: z.string().optional(),
})

/**
 * Formatted price listing for workspace plans.
 */
export type FormattedPriceListing = z.infer<typeof FormattedPriceListingSchema>

/** Available workspace plan names. */
export const WORKSPACE_CURRENT_PLANS = ['Business', 'Starter'] as const
/** Display name of a workspace plan. */
export type WorkspaceCurrentPlan = (typeof WORKSPACE_CURRENT_PLANS)[number]

/** Available workspace plan statuses. */
export const WORKSPACE_PLAN_STATUSES = [
    'Active',
    'Downgraded',
    'Cancelled',
    'NeverSubscribed',
] as const
/** Subscription status of a workspace plan. */
export type WorkspacePlanStatus = (typeof WORKSPACE_PLAN_STATUSES)[number]

export const WorkspacePlanDetailsSchema = z.object({
    currentMemberCount: z.number(),
    currentPlan: z.enum(WORKSPACE_CURRENT_PLANS),
    currentPlanStatus: z.enum(WORKSPACE_PLAN_STATUSES),
    downgradeAt: z.string().nullable(),
    currentActiveProjects: z.number(),
    maximumActiveProjects: z.number(),
    priceList: z.array(FormattedPriceListingSchema),
    workspaceId: StringOrNumberSchema,
    isTrialing: z.boolean(),
    trialEndsAt: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    hasTrialed: z.boolean(),
    planPrice: PlanPriceSchema.nullable(),
    hasBillingPortal: z.boolean(),
    hasBillingPortalSwitchToAnnual: z.boolean(),
})

/**
 * Represents workspace plan and billing details.
 */
export type WorkspacePlanDetails = z.infer<typeof WorkspacePlanDetailsSchema>

export const JoinWorkspaceResultSchema = z.object({
    customSortingApplied: z.boolean(),
    projectSortPreference: z.string(),
    role: WorkspaceRoleSchema,
    userId: z.string(),
    workspaceId: z.string(),
})

/**
 * Result returned when successfully joining a workspace.
 */
export type JoinWorkspaceResult = z.infer<typeof JoinWorkspaceResultSchema>

/**
 * Available workspace plans.
 */
export const WORKSPACE_PLANS = ['STARTER', 'BUSINESS'] as const

/**
 * Workspace plan type.
 */
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number]

export const WorkspacePlanSchema = z.enum(WORKSPACE_PLANS)

/**
 * Workspace resource limits.
 */
export const WorkspaceLimitsSchema = z
    .object({
        current: z.record(z.string(), z.any()).nullable(),
        next: z.record(z.string(), z.any()).nullable(),
    })
    .catchall(z.any())

export type WorkspaceLimits = z.infer<typeof WorkspaceLimitsSchema>

/**
 * Workspace properties (flexible object for unknown fields).
 */
export const WorkspacePropertiesSchema = z.record(z.string(), z.unknown())
export type WorkspaceProperties = z.infer<typeof WorkspacePropertiesSchema>

/**
 * Represents a workspace in Todoist.
 */
export const WorkspaceSchema = z
    .object({
        id: StringOrNumberSchema,
        name: z.string(),
        plan: WorkspacePlanSchema,
        role: WorkspaceRoleSchema.optional(),
        inviteCode: z.string(),
        isLinkSharingEnabled: z.boolean(),
        isGuestAllowed: z.boolean(),
        limits: WorkspaceLimitsSchema.optional(),
        logoBig: z.string().nullish(),
        logoMedium: z.string().nullish(),
        logoSmall: z.string().nullish(),
        logoS640: z.string().nullish(),
        createdAt: z.coerce.date().optional(),
        dateCreated: z.coerce.date().optional(),
        creatorId: StringOrNumberSchema,
        properties: WorkspacePropertiesSchema,
    })
    .transform(({ dateCreated, createdAt, ...rest }) => ({
        ...rest,
        createdAt: createdAt ?? dateCreated,
    }))

export type Workspace = z.infer<typeof WorkspaceSchema>

export const MemberActivityInfoSchema = z.object({
    userId: z.string(),
    tasksAssigned: z.number().int(),
    tasksOverdue: z.number().int(),
})
/**
 * Represents activity information for a workspace member.
 */
export type MemberActivityInfo = z.infer<typeof MemberActivityInfoSchema>

export const WorkspaceUserTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    responsibleUid: z.string().nullable(),
    due: DueDateSchema.nullable(),
    deadline: DeadlineSchema.nullable(),
    labels: z.array(z.string()),
    notesCount: z.number().int(),
    projectId: z.string(),
    projectName: z.string(),
    priority: z.number().int(),
    description: z.string(),
    isOverdue: z.boolean(),
})
/**
 * Represents a task assigned to a workspace user.
 */
export type WorkspaceUserTask = z.infer<typeof WorkspaceUserTaskSchema>
