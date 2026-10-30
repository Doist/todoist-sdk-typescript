import {
    getFirstName as sharedGetFirstName,
    getLastName as sharedGetLastName,
    getShortName as sharedGetShortName,
} from '@doist/sdk-kmp/shared-universe-all'

/**
 * Returns the first word of a person's name, or an empty string if the name is blank.
 *
 * Status text people add to their display name isn't part of the name. Anything after a `|`, `@`
 * or dash with spaces around it is left out, as is a trailing `OOO` or note in parentheses, so
 * `Ada Lovelace (OOO Friday)` and `Ada Lovelace @ Paternity Leave` both read as `Ada Lovelace`.
 *
 * @param fullName - The person's full name, such as a user's `name` or `fullName`
 * @returns The first name, or an empty string for a blank name
 */
export function getFirstName(fullName: string): string {
    return sharedGetFirstName(fullName)
}

/**
 * Returns the last word of a person's name, or an empty string if the name is blank. A one-word
 * name is its own last name.
 *
 * Status text is left out as it is for {@link getFirstName}, so `Ada Lovelace (OOO Friday)` gives
 * `Lovelace`. A trailing emoji still counts as a word here, so `Ana Silva 🌴` gives `🌴`, while
 * {@link getShortName} skips it when picking the initial.
 *
 * @param fullName - The person's full name, such as a user's `name` or `fullName`
 * @returns The last name, or an empty string for a blank name
 */
export function getLastName(fullName: string): string {
    return sharedGetLastName(fullName)
}

/**
 * Returns a person's first name and the initial of their last name, such as `Richard A.` for
 * `Richard Dean Anderson`.
 *
 * - Status text is left out as it is for {@link getFirstName}, so `Ada Lovelace (OOO Friday)`
 *   gives `Ada L.`, not `Ada F.`.
 * - The initial comes from the last word rather than the second, because in a name of three or
 *   more words the last one is usually the family name.
 * - The initial is a whole character as the reader sees it, so an accent or an Indic conjunct
 *   stays with its letter: `Shreya श्रीवास्तव` gives `Shreya श्री.`.
 * - A word that doesn't start with a letter, such as a trailing emoji, is skipped, so
 *   `Ana Silva 🌴` gives `Ana S.`. When no word after the first starts with a letter, as in
 *   `Robot 🤖` or a one-word name, the first name is returned alone.
 *
 * @param fullName - The person's full name, such as a user's `name` or `fullName`
 * @returns The first name and last initial, the first name alone when there's no initial, or an
 * empty string for a blank name
 */
export function getShortName(fullName: string): string {
    return sharedGetShortName(fullName)
}

/**
 * Returns a person's first name and the initial of their last name.
 *
 * @deprecated Use {@link getShortName} instead, which this calls. It used to take the initial
 * from the second word, which no longer matches the Todoist apps.
 *
 * @param fullName - The person's full name, such as a user's `name` or `fullName`
 * @returns The same as {@link getShortName}
 */
export function formatUserShortName(fullName: string): string {
    return getShortName(fullName)
}
