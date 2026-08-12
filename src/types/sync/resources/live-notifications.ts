import { z } from 'zod'

import { StringOrNumberSchema } from '../../common'

/**
 * Live notification resource from the Sync API.
 *
 * Uses a loose object schema with commonly-present fields for forward
 * compatibility. The Sync API returns 20+ notification variants; fully typing
 * each is too fragile for a library, so we validate the common shape and
 * preserve all extra fields.
 */
export const LiveNotificationSchema = z.looseObject({
    id: z.string(),
    createdAt: z.coerce.date(),
    fromUid: z.string().optional(),
    notificationType: z.string(),
    isUnread: z.boolean(),
    // Commonly present optional fields
    projectId: z.string().optional(),
    invitationId: z.string().optional(),
    itemId: z.string().optional(),
    itemContent: z.string().optional(),
    responsibleUid: z.string().nullable().optional(),
    assignedByUid: z.string().nullable().optional(),
    fromUser: z
        .object({
            email: z.string(),
            fullName: z.string(),
            id: StringOrNumberSchema,
            imageId: z.string().nullable(),
        })
        .optional(),
    projectName: z.string().optional(),
    isDeleted: z.boolean().optional(),
    invitationSecret: z.string().optional(),
})

export type LiveNotification = z.infer<typeof LiveNotificationSchema>
