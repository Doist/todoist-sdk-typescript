import { TodoistArgumentError } from '../types/errors'

/**
 * Encodes a caller-supplied value (an ID, a name) for use as one URL path segment.
 *
 * Without this, a value such as `../projects/123` would be joined into the path
 * as-is and the URL would resolve to a different endpoint. `encodeURIComponent`
 * escapes `/`, `?`, `#` and `%`, but leaves `.` alone, so the dot segments `.`
 * and `..` (and the empty segment) are rejected outright. `,` is kept literal,
 * as it is a valid path character and joins lists of IDs.
 *
 * @param segment The value to encode.
 * @returns The encoded segment.
 * @throws {TodoistArgumentError} When the value is empty, `.` or `..`.
 */
export function encodePathSegment(segment: string): string {
    if (segment === '' || segment === '.' || segment === '..') {
        throw new TodoistArgumentError(`Invalid path segment: "${segment}"`)
    }
    return encodeURIComponent(segment).replace(/%2C/gi, ',')
}

/**
 * Joins an endpoint with path segments using `/` separator.
 *
 * The endpoint is used as-is (it may contain `/`); every following segment is
 * encoded with {@link encodePathSegment}, so an ID can never address another
 * resource.
 *
 * @param endpoint The base endpoint, e.g. `tasks`.
 * @param segments Path segments to append, e.g. an ID and an action.
 * @returns A joined path.
 */
export function generatePath(endpoint: string, ...segments: string[]): string {
    return [endpoint, ...segments.map(encodePathSegment)].join('/')
}

/**
 * Returns `fn(value)` spread into an object if `value` is defined, otherwise an empty object.
 *
 * Used to conditionally include a property on a payload object without
 * resorting to mutation or ternary-built object literals.
 */
export function spreadIfDefined<T, V extends Record<string, unknown>>(
    value: T | undefined,
    fn: (v: T) => V,
): V | Record<string, never> {
    return value !== undefined ? fn(value) : {}
}
