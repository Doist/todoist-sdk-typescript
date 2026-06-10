import { z } from 'zod'

type SearchArgs = {
    query: string
    cursor?: string | null
    limit?: number
}

/**
 * Requires at least one of the keys in `Keys` to be present *with a defined
 * value*, while keeping the rest optional. Used for update-args types where
 * every field is individually optional but an empty `{}` update — or one that
 * only carries `undefined` values (which serialize to an empty body) — should
 * not type-check. `null` is preserved where the field type allows it (e.g. a
 * `description?: string | null` clear).
 */
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> &
    {
        [K in Keys]-?: { [P in K]-?: Exclude<T[P], undefined> } & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]

/**
 * Zod schema that accepts both string and number values and coerces to string.
 * The REST API returns numeric IDs while the Sync API returns string IDs.
 */
const StringOrNumberSchema = z.union([z.string(), z.number()]).transform((val) => String(val))

export { StringOrNumberSchema }
export type { RequireAtLeastOne, SearchArgs }
