import { z } from 'zod'

export const WorkspaceFilterSchema = z.looseObject({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    query: z.string(),
    description: z.string().nullish(),
    color: z.string(),
    itemOrder: z.number().int(),
    isDeleted: z.boolean(),
    isFavorite: z.boolean(),
    isFrozen: z.boolean(),
    creatorUid: z.string(),
    updaterUid: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export type WorkspaceFilter = z.infer<typeof WorkspaceFilterSchema>
