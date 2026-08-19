import { z } from 'zod'

export const FilterSchema = z.looseObject({
    id: z.string(),
    name: z.string(),
    query: z.string(),
    description: z.string().nullish(),
    color: z.string(),
    isDeleted: z.boolean(),
    isFavorite: z.boolean(),
    isFrozen: z.boolean(),
    itemOrder: z.number().int(),
})

export type Filter = z.infer<typeof FilterSchema>
