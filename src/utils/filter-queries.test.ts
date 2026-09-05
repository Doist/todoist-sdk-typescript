import { isDateDrivenQuery } from './filter-queries'

describe('isDateDrivenQuery', () => {
    test('reads English queries without being told the language', () => {
        expect(isDateDrivenQuery('today')).toBe(true)
        expect(isDateDrivenQuery('overdue & ##Todoist')).toBe(true)
        expect(isDateDrivenQuery('p1')).toBe(false)
        expect(isDateDrivenQuery('##Todoist & p1')).toBe(false)
    })

    test.each([
        ['de', 'heute'],
        ['es', 'hoy'],
        ['fr', "aujourd'hui"],
        ['it', 'oggi'],
        ['ja', '今日'],
        ['ko', '오늘'],
        ['nl', 'vandaag'],
        ['pl', 'dzisiaj'],
        ['pt', 'hoje'],
        ['ru', 'сегодня'],
        ['sv', 'idag'],
        ['tr', 'bugün'],
    ])('treats an unrecognized word as the bare date it has to be (%s)', (lang, query) => {
        expect(isDateDrivenQuery(query, { lang })).toBe(true)
    })

    test('needs the right language to keep a keyword out of the hierarchy', () => {
        expect(isDateDrivenQuery('sin fecha', { lang: 'es' })).toBe(false)
        expect(isDateDrivenQuery('asignado a: mí', { lang: 'es' })).toBe(false)
        expect(isDateDrivenQuery('periódicas', { lang: 'es' })).toBe(false)

        // Under the wrong language the same keywords are unknown words, and an
        // unknown word can only be a bare date.
        expect(isDateDrivenQuery('sin fecha')).toBe(true)
        expect(isDateDrivenQuery('asignado a: mí')).toBe(true)
    })

    test('answers the saved filter from the issue', () => {
        expect(isDateDrivenQuery('hoy | vencidas', { lang: 'es' })).toBe(true)
    })

    test('leaves a date word inside a name alone', () => {
        expect(isDateDrivenQuery('#due date')).toBe(false)
        expect(isDateDrivenQuery('search: due diligence')).toBe(false)
        expect(isDateDrivenQuery('@today')).toBe(false)
    })

    test('follows the operators rather than the words', () => {
        expect(isDateDrivenQuery('today & p1')).toBe(true)
        expect(isDateDrivenQuery('today | p1')).toBe(false)
        expect(isDateDrivenQuery('!today')).toBe(false)
        expect(isDateDrivenQuery('(today | next 7 days) & (p1 | p2)')).toBe(true)
    })

    test('matches a keyword whatever case it is written in', () => {
        expect(isDateDrivenQuery('OVERDUE')).toBe(true)

        // Upper-cased keywords that fall outside the date tokens, so a missed
        // fold would read as a bare date and flip these to true. Both carry
        // non-ASCII letters, which is where ASCII-only folding would give up.
        expect(isDateDrivenQuery('PERIÓDICAS', { lang: 'es' })).toBe(false)
        expect(isDateDrivenQuery('БЕЗ ДАТЫ', { lang: 'ru' })).toBe(false)
    })

    test('resolves a regional, aliased or unknown language code', () => {
        expect(isDateDrivenQuery('sin fecha', { lang: 'es-ES' })).toBe(false)
        expect(isDateDrivenQuery('sin fecha', { lang: 'ES' })).toBe(false)
        expect(isDateDrivenQuery('无日期', { lang: 'zh_cn' })).toBe(false)
        expect(isDateDrivenQuery('无日期', { lang: 'zh-cn' })).toBe(false)
        expect(isDateDrivenQuery('无日期', { lang: 'zh-hans' })).toBe(false)
        expect(isDateDrivenQuery('沒有日期', { lang: 'zh-hant' })).toBe(false)
        expect(isDateDrivenQuery('no date', { lang: 'kl' })).toBe(false)
        expect(isDateDrivenQuery('no date', { lang: null })).toBe(false)
    })

    test('takes every subquery of a comma-separated filter', () => {
        expect(isDateDrivenQuery('today, overdue')).toBe(true)
        expect(isDateDrivenQuery('today, p1')).toBe(false)
        expect(isDateDrivenQuery('#Home\\, Work & today')).toBe(true)
    })

    test('returns false for a query that breaks the grammar', () => {
        expect(isDateDrivenQuery('')).toBe(false)
        expect(isDateDrivenQuery('   ')).toBe(false)
        expect(isDateDrivenQuery('(today')).toBe(false)
        expect(isDateDrivenQuery('p1 p2')).toBe(false)
    })

    test('holds its ground on input built to exhaust the stack', () => {
        expect(isDateDrivenQuery(`${'!'.repeat(10_000)}today`)).toBe(false)
        expect(isDateDrivenQuery(`${'('.repeat(10_000)}today${')'.repeat(10_000)}`)).toBe(false)
        expect(isDateDrivenQuery(`${'today & '.repeat(5_000)}today`)).toBe(true)
        expect(isDateDrivenQuery(`${'p1 | '.repeat(5_000)}p1`)).toBe(false)
        expect(isDateDrivenQuery('(((today)))')).toBe(true)
    })
})
