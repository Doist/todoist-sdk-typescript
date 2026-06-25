import { z } from 'zod'
import { WorkspaceRoleSchema } from '../../workspaces/types'

export const CollaboratorSchema = z.looseObject({
    id: z.string(),
    email: z.string().nullable(),
    fullName: z.string(),
    timezone: z.string(),
    imageId: z.string().nullable(),
})

export type Collaborator = z.infer<typeof CollaboratorSchema>

/** Available collaborator statuses. */
export const COLLABORATOR_STATUSES = ['active', 'invited'] as const
/** Status of a project collaborator. */
export type CollaboratorStatus = (typeof COLLABORATOR_STATUSES)[number]

export const CollaboratorStateSchema = z.looseObject({
    userId: z.string(),
    projectId: z.string(),
    state: z.enum(COLLABORATOR_STATUSES),
    isDeleted: z.boolean(),
    workspaceRole: WorkspaceRoleSchema.optional(),
})

export type CollaboratorState = z.infer<typeof CollaboratorStateSchema>
