import { z } from 'zod'
import { type WebhookEvent } from '../apps/types'
import { ProjectSchema } from '../projects/types'
import { BaseWebhookEnvelopeShape } from './envelope'

/**
 * Enum-like object of project (`project:*`) webhook event names. Single
 * source of truth for the discriminator values — `PROJECT_WEBHOOK_EVENTS`
 * and every `z.literal()` below derive from it.
 */
export const ProjectWebhookEventEnum = {
    Added: 'project:added',
    Updated: 'project:updated',
    Deleted: 'project:deleted',
    Archived: 'project:archived',
    Unarchived: 'project:unarchived',
} as const

/** Webhook events that carry a project as their `eventData`. */
export const PROJECT_WEBHOOK_EVENTS = [
    ProjectWebhookEventEnum.Added,
    ProjectWebhookEventEnum.Updated,
    ProjectWebhookEventEnum.Deleted,
    ProjectWebhookEventEnum.Archived,
    ProjectWebhookEventEnum.Unarchived,
] as const satisfies readonly WebhookEvent[]

/**
 * Webhook project payloads match the shape of the shared {@link Project}
 * resource — either a personal or a workspace project. No webhook-specific
 * schema is needed; `ProjectSchema` already dispatches on `workspaceId`.
 */
export const ProjectAddedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(ProjectWebhookEventEnum.Added),
    eventData: ProjectSchema,
})
export type ProjectAddedPayload = z.infer<typeof ProjectAddedPayloadSchema>

export const ProjectUpdatedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(ProjectWebhookEventEnum.Updated),
    eventData: ProjectSchema,
})
export type ProjectUpdatedPayload = z.infer<typeof ProjectUpdatedPayloadSchema>

export const ProjectDeletedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(ProjectWebhookEventEnum.Deleted),
    eventData: ProjectSchema,
})
export type ProjectDeletedPayload = z.infer<typeof ProjectDeletedPayloadSchema>

export const ProjectArchivedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(ProjectWebhookEventEnum.Archived),
    eventData: ProjectSchema,
})
export type ProjectArchivedPayload = z.infer<typeof ProjectArchivedPayloadSchema>

export const ProjectUnarchivedPayloadSchema = z.object({
    ...BaseWebhookEnvelopeShape,
    eventName: z.literal(ProjectWebhookEventEnum.Unarchived),
    eventData: ProjectSchema,
})
export type ProjectUnarchivedPayload = z.infer<typeof ProjectUnarchivedPayloadSchema>
