/** Separators that start a status suffix. Spaces are required so hyphenated names stay intact. */
const STATUS_SEPARATOR = /\s+[|–—-]\s+/
/** A trailing parenthesised note or a standalone `OOO`. */
const STATUS_SUFFIX = /\s+(?:\([^()]*\)|OOO)$/i
const LETTER = /\p{L}/u

let graphemeSegmenter: Intl.Segmenter | null | undefined

/**
 * Created on first use rather than at import time, so a runtime without
 * `Intl.Segmenter` can still load the SDK and falls back to code points.
 */
function getGraphemeSegmenter(): Intl.Segmenter | null {
    if (graphemeSegmenter === undefined) {
        graphemeSegmenter =
            typeof Intl.Segmenter === 'function'
                ? new Intl.Segmenter('en', { granularity: 'grapheme' })
                : null
    }
    return graphemeSegmenter
}

/**
 * The first grapheme of `text`, so an initial keeps combining accents and
 * never splits an emoji into a lone surrogate.
 */
function firstGrapheme(text: string): string {
    const segmenter = getGraphemeSegmenter()
    if (segmenter) {
        return segmenter.segment(text)[Symbol.iterator]().next().value?.segment ?? ''
    }
    // String iteration steps by code point, which at least keeps surrogate pairs whole.
    for (const character of text) return character
    return ''
}

/**
 * Abbreviates a user's display name to their first name and the initial of
 * their second name, matching how the Todoist clients shorten names.
 *
 * Status text people put in their display name is removed first, so it is
 * never mistaken for a surname: anything after a spaced `|`, `-`, `–` or `—`,
 * trailing parenthesised text, and a trailing standalone `OOO`. When the
 * second name does not start with a letter, only the first name is returned.
 *
 * @example
 * formatUserShortName('Ada Lovelace') // 'Ada L.'
 * formatUserShortName('Ada Lovelace (Back 7 Sept)') // 'Ada L.'
 * formatUserShortName('Ada Lovelace - OOO back Tue') // 'Ada L.'
 * formatUserShortName('Ada | 🌴') // 'Ada'
 * formatUserShortName('Anne-Marie Smith-Jones') // 'Anne-Marie S.'
 *
 * @param fullName The user's full display name.
 * @returns The abbreviated name, or an empty string for a blank name.
 */
export function formatUserShortName(fullName: string): string {
    let name = fullName.trim().split(STATUS_SEPARATOR)[0]
    // Mixed suffixes can appear in any order, so keep stripping until none remain.
    while (STATUS_SUFFIX.test(name)) {
        name = name.replace(STATUS_SUFFIX, '').trimEnd()
    }

    const [firstName, secondName] = name.split(/\s+/)
    if (!secondName) return firstName

    const initial = firstGrapheme(secondName)
    return LETTER.test(initial) ? `${firstName} ${initial}.` : firstName
}
