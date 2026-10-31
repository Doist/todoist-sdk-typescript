import { z } from 'zod'

export const FolderSchema = z.looseObject({
    id: z.string(),
    name: z.string(),
    workspaceId: z.string(),
    isDeleted: z.boolean(),
    defaultOrder: z.number().int(),
    defaultOrderKey: z.string().nullable().optional(),
    childOrder: z.number().int(),
})

export type Folder = z.infer<typeof FolderSchema>
