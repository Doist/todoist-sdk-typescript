import { z } from 'zod'

import { LabelSchema } from '../../labels/types'

/** A label returned by the Sync API. */
export const SyncLabelSchema = LabelSchema.extend({
    order: z.number().int().nullable().optional(),
    isDeleted: z.boolean().optional(),
})

/** Represents a label returned by the Sync API. */
export type SyncLabel = z.infer<typeof SyncLabelSchema>
