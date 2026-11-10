import { colorForDisplay } from '@todoist/sdk-kmp/shared-todoist-all'
import type { Color } from '../types/productivity/types'

export const berryRed = {
    key: 'berry_red',
    displayName: 'Berry Red',
    hexValue: '#b8255f',
} as const
export const red = {
    key: 'red',
    displayName: 'Red',
    hexValue: '#db4035',
} as const
export const orange = {
    key: 'orange',
    displayName: 'Orange',
    hexValue: '#ff9933',
} as const
export const yellow = {
    key: 'yellow',
    displayName: 'Yellow',
    hexValue: '#fad000',
} as const
export const oliveGreen = {
    key: 'olive_green',
    displayName: 'Olive Green',
    hexValue: '#afb83b',
} as const
export const limeGreen = {
    key: 'lime_green',
    displayName: 'Lime Green',
    hexValue: '#7ecc49',
} as const
export const green = {
    key: 'green',
    displayName: 'Green',
    hexValue: '#299438',
} as const
export const mintGreen = {
    key: 'mint_green',
    displayName: 'Mint Green',
    hexValue: '#6accbc',
} as const
export const teal = {
    key: 'teal',
    displayName: 'Teal',
    hexValue: '#158fad',
} as const
export const skyBlue = {
    key: 'sky_blue',
    displayName: 'Sky Blue',
    hexValue: '#14aaf5',
} as const
export const lightBlue = {
    key: 'light_blue',
    displayName: 'Light Blue',
    hexValue: '#96c3eb',
} as const
export const blue = {
    key: 'blue',
    displayName: 'Blue',
    hexValue: '#4073ff',
} as const
export const grape = {
    key: 'grape',
    displayName: 'Grape',
    hexValue: '#884dff',
} as const
export const violet = {
    key: 'violet',
    displayName: 'Violet',
    hexValue: '#af38eb',
} as const
export const lavender = {
    key: 'lavender',
    displayName: 'Lavender',
    hexValue: '#eb96eb',
} as const
export const magenta = {
    key: 'magenta',
    displayName: 'Magenta',
    hexValue: '#e05194',
} as const
export const salmon = {
    key: 'salmon',
    displayName: 'Salmon',
    hexValue: '#ff8d85',
} as const
export const charcoal = {
    key: 'charcoal',
    displayName: 'Charcoal',
    hexValue: '#808080',
} as const
export const grey = {
    key: 'grey',
    displayName: 'Grey',
    hexValue: '#b8b8b8',
} as const
export const taupe = {
    key: 'taupe',
    displayName: 'Taupe',
    hexValue: '#ccac93',
} as const

/**
 * Every color, in the order the apps show them. The keys mirror `TodoistColor` from
 * `@todoist/sdk-kmp/shared-todoist-all`; the display names and hex values are the SDK's own.
 */
export const colors = [
    berryRed,
    red,
    orange,
    yellow,
    oliveGreen,
    limeGreen,
    green,
    mintGreen,
    teal,
    skyBlue,
    lightBlue,
    blue,
    grape,
    violet,
    lavender,
    magenta,
    salmon,
    charcoal,
    grey,
    taupe,
] as const

export type ColorKey = (typeof colors)[number]['key']

export const defaultColor: Color = charcoal

/**
 * Retrieves a {@link Color} object by its key identifier.
 *
 * @param colorKey - The unique key identifier of the color to find (e.g., 'berry_red', 'sky_blue')
 * @returns The matching Color object if found, otherwise returns the default color (charcoal)
 *
 * @example
 * ```typescript
 * const color = getColorByKey('berry_red');
 * console.log(color.hexValue); // '#b8255f'
 * ```
 */
export function getColorByKey(colorKey: string): Color {
    const { key } = colorForDisplay(colorKey)
    return colors.find((color) => color.key === key) ?? defaultColor
}
