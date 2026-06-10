import { z } from 'zod'

type SearchArgs = {
    query: string
    cursor?: string | null
    limit?: number
}

/**
 * Zod schema that accepts both string and number values and coerces to string.
 * The REST API returns numeric IDs while the Sync API returns string IDs.
 */
const StringOrNumberSchema = z.union([z.string(), z.number()]).transform((val) => String(val))

export { StringOrNumberSchema }
export type { SearchArgs }
