import { formatUserShortName } from './user-name-helpers'

/** Written as a code point because formatters render the escape invisibly. */
const COMBINING_ACUTE = String.fromCharCode(0x0301)

describe('formatUserShortName', () => {
    test.each([
        ['Name | 🌴', 'Name'],
        ['name (OOO Friday)', 'name'],
        ['Firstname Surname (OOO Sept 4-7)', 'Firstname S.'],
        ['Firstname Surname (OOO until Tuesday, Sept 8)', 'Firstname S.'],
        ['Firstname Surname (working half days sept 1-4)', 'Firstname S.'],
        ['Firstname Surname - OOO back Tue', 'Firstname S.'],
        ['Firstname OOO - Back on September 8', 'Firstname'],
        ['Firstname Surname (Back 7 Sept)', 'Firstname S.'],
        ['Firstname 🏖️ (🔙 31 Aug)', 'Firstname'],
        ['Firstname Surname', 'Firstname S.'],
        // Different initials ensure that a status month cannot pass as a surname.
        ['Ada Lovelace (Back 7 Sept)', 'Ada L.'],
        ['Ada Lovelace – away', 'Ada L.'],
        ['Ada Lovelace — away', 'Ada L.'],
        ['Ada Lovelace | away', 'Ada L.'],
        ['Ada ooo', 'Ada'],
        ['Ada Lovelace OOO', 'Ada L.'],
        ['Ada (nickname) (OOO Friday)', 'Ada'],
        ['Ada (nickname) OOO', 'Ada'],
        ['Ada OOO (nickname)', 'Ada'],
        ['Ada OOO (nickname) OOO', 'Ada'],
    ])('omits status text in %j, returning %j', (input, expected) => {
        expect(formatUserShortName(input)).toBe(expected)
    })

    test.each([
        ['', ''],
        ['   ', ''],
        ['Rui', 'Rui'],
        ['Ada Lovelace', 'Ada L.'],
        ['Steven Kao Smith', 'Steven K.'],
        ['Anne-Marie Smith-Jones', 'Anne-Marie S.'],
        ['Ada O’Connor', 'Ada O.'],
        ['Ada Ooolander', 'Ada O.'],
        ['  Ada \t Lovelace  ', 'Ada L.'],
        ['José García', 'José G.'],
        ['李 小明', '李 小.'],
        ['محمد علي', 'محمد ع.'],
        [`Ada E${COMBINING_ACUTE}clair`, `Ada E${COMBINING_ACUTE}.`],
        ['Ada 𐐀name', 'Ada 𐐀.'],
        ['Yuki 🎌 Tanaka', 'Yuki'],
        ['Omar | 🌴', 'Omar'],
        ['A 👨‍👩‍👧', 'A'],
        ['Ada 123', 'Ada'],
        ['Ada (nickname) Lovelace', 'Ada'],
        ['Ada 🎌Lovelace', 'Ada'],
        ['Ada 1Lovelace', 'Ada'],
    ])('abbreviates %j to %j without splitting graphemes', (input, expected) => {
        expect(formatUserShortName(input)).toBe(expected)
    })

    describe('without Intl.Segmenter', () => {
        const originalSegmenter = Intl.Segmenter

        beforeEach(() => {
            vi.resetModules()
            Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true })
        })

        afterEach(() => {
            Object.defineProperty(Intl, 'Segmenter', {
                value: originalSegmenter,
                configurable: true,
                writable: true,
            })
        })

        test.each([
            ['Ada Lovelace (Back 7 Sept)', 'Ada L.'],
            ['Ada 𐐀name', 'Ada 𐐀.'],
            ['Omar | 🌴', 'Omar'],
            ['Yuki 🎌 Tanaka', 'Yuki'],
            // Code points cannot keep a combining accent with its base letter.
            [`Ada E${COMBINING_ACUTE}clair`, 'Ada E.'],
        ])('falls back to code points for %j, returning %j', async (input, expected) => {
            const { formatUserShortName: freshFormatUserShortName } =
                await import('./user-name-helpers')
            expect(freshFormatUserShortName(input)).toBe(expected)
        })
    })
})
