// `isWellFormed` is newer than this package's `lib` setting. Node 24 has it.
/// <reference lib="es2024.string" />
import { formatUserShortName } from '../index'
import { getFirstName, getLastName, getShortName } from './person-names'

describe('person names', () => {
    // Full name, first name, last name, short name.
    test.each([
        // Status text isn't part of the name, whether it's in parentheses or after an `@`.
        ['Ada Lovelace (OOO Friday)', 'Ada', 'Lovelace', 'Ada L.'],
        ['Ada Lovelace @ Paternity Leave', 'Ada', 'Lovelace', 'Ada L.'],
        // The initial is a whole character: a combining accent or an Indic conjunct stays with
        // its letter, and a letter outside the Basic Multilingual Plane isn't cut in half.
        ['Ana Śliwińska', 'Ana', 'Śliwińska', 'Ana Ś.'],
        ['Shreya श्रीवास्तव', 'Shreya', 'श्रीवास्तव', 'Shreya श्री.'],
        ['Taro 𠮷野', 'Taro', '𠮷野', 'Taro 𠮷.'],
        // A trailing emoji is skipped for the initial, but it's still the last word.
        ['Ana Silva 🌴', 'Ana', '🌴', 'Ana S.'],
        ['Robot 🤖', 'Robot', '🤖', 'Robot'],
        ['', '', '', ''],
        ['   ', '', '', ''],
        ['MacGyver', 'MacGyver', 'MacGyver', 'MacGyver'],
        // The initial comes from the last word, not the second.
        ['Richard Dean Anderson', 'Richard', 'Anderson', 'Richard A.'],
    ])('reads %j', (fullName, firstName, lastName, shortName) => {
        const names = [getFirstName(fullName), getLastName(fullName), getShortName(fullName)]

        expect(names).toEqual([firstName, lastName, shortName])
        for (const name of names) {
            expect(name.isWellFormed()).toBe(true)
        }
    })

    // From the package entry, so that dropping this export fails here before it fails a caller.
    test.each([
        ['Steven Kao Smith', 'Steven S.'],
        ['Yuki 🎌 Tanaka', 'Yuki T.'],
        ['Ada (nickname) Lovelace', 'Ada L.'],
    ])('formatUserShortName reads %j the same as getShortName', (fullName, shortName) => {
        expect(formatUserShortName(fullName)).toBe(shortName)
        expect(getShortName(fullName)).toBe(shortName)
    })
})
