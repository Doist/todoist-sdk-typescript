import {
    FILTER_QUERY_DATE_TOKENS,
    FILTER_QUERY_LANGUAGES,
    FILTER_QUERY_OPERATOR_TOKENS,
    FILTER_QUERY_PATTERNS,
    FILTER_QUERY_TOKENS,
} from './filter-query-definitions'
import type { FilterQueryLanguage, FilterQueryToken } from './filter-query-definitions'

export type IsDateDrivenQueryOptions = {
    /**
     * Language the query is written in, as the account's `lang`. Unknown codes
     * and regional variants fall back to their base language, then to English.
     */
    lang?: string | null
}

/** The two ways Todoist lays out a list. Day outranks flat. */
type Grouping = 'DAY' | 'FLAT'

/** A token the lexer produced, or a run the date parser would have taken. */
type LexedToken = FilterQueryToken | 'BARE_DATE'

type Matcher = {
    token: FilterQueryToken
    length: number
    regex: RegExp
}

type TokenReader = {
    tokens: readonly LexedToken[]
    index: number
    depth: number
}

const DEFAULT_LANGUAGE: FilterQueryLanguage = 'en'

const DATE_TOKENS: ReadonlySet<FilterQueryToken> = new Set(FILTER_QUERY_DATE_TOKENS)
const OPERATOR_TOKENS: ReadonlySet<FilterQueryToken> = new Set(FILTER_QUERY_OPERATOR_TOKENS)

/** Operators are the same symbols in every language, and they end a bare date. */
const OPERATOR_PATTERN = /[()!&|]/

/**
 * Deepest run of parentheses this reads before giving up.
 *
 * Parentheses are the only construct left that recurses, and Todoist caps a
 * saved query long before this. The limit is what keeps a hostile string from
 * reaching the call stack.
 */
const MAX_NESTING_DEPTH = 100

/** Codes the parser answers to beyond the language names themselves. */
const LANGUAGE_ALIASES = new Map<string, FilterQueryLanguage>([
    ['zh-cn', 'zh_cn'],
    ['zh-hans', 'zh_cn'],
    ['zh_hans', 'zh_cn'],
    ['zh-tw', 'zh_tw'],
    ['zh-hant', 'zh_tw'],
    ['zh_hant', 'zh_tw'],
])

const MATCHERS_BY_LANGUAGE = new Map<FilterQueryLanguage, readonly Matcher[]>()

function lookUpLanguage(code: string): FilterQueryLanguage | undefined {
    return (
        LANGUAGE_ALIASES.get(code) ?? FILTER_QUERY_LANGUAGES.find((language) => language === code)
    )
}

function resolveLanguage(lang: string | null | undefined): FilterQueryLanguage {
    if (!lang) return DEFAULT_LANGUAGE

    const code = lang.toLowerCase()
    return lookUpLanguage(code) ?? lookUpLanguage(code.split(/[-_]/)[0]) ?? DEFAULT_LANGUAGE
}

function createMatchers(language: FilterQueryLanguage): readonly Matcher[] {
    const patterns = FILTER_QUERY_PATTERNS[language]
    const matchers: Matcher[] = []

    for (const token of FILTER_QUERY_TOKENS) {
        for (const pattern of patterns[token]) {
            matchers.push({
                token,
                length: pattern.length,
                regex: new RegExp(`\\s*${pattern}\\s*`, 'iuy'),
            })
        }
    }

    // Longest pattern first, as the engine does. Otherwise `all` claims the
    // front of Dutch's `alles bekijken` and the rest reads as a date.
    return matchers.sort((a, b) => b.length - a.length)
}

function matchersFor(language: FilterQueryLanguage): readonly Matcher[] {
    const cached = MATCHERS_BY_LANGUAGE.get(language)
    if (cached) return cached

    const matchers = createMatchers(language)
    MATCHERS_BY_LANGUAGE.set(language, matchers)
    return matchers
}

function matchAt(
    query: string,
    cursor: number,
    matchers: readonly Matcher[],
): { token: FilterQueryToken; end: number } | null {
    for (const matcher of matchers) {
        matcher.regex.lastIndex = cursor
        if (matcher.regex.test(query) && matcher.regex.lastIndex > cursor) {
            return { token: matcher.token, end: matcher.regex.lastIndex }
        }
    }

    return null
}

/**
 * Splits a query on unescaped commas, the way Todoist does before parsing.
 * Each part is drawn as its own list.
 */
function splitSubqueries(query: string): string[] {
    const subqueries: string[] = []
    let current = ''
    let escaped = false

    for (let index = 0; index < query.length; index += 1) {
        const character = query[index]
        if (character === ',' && !escaped) {
            subqueries.push(current)
            current = ''
            continue
        }

        current += character
        escaped = !escaped && character === '\\'
    }
    subqueries.push(current)

    return subqueries.map((subquery) => subquery.trim()).filter((subquery) => subquery.length > 0)
}

/**
 * Reads a subquery into tokens.
 *
 * Anything the vocabulary doesn't claim is a bare date: the engine tries every
 * keyword first and hands what is left to its date parser, which is what reads
 * `today`, `hoy` and `2026-12-24`. A bare date runs to the next operator.
 */
function tokenize(subquery: string, matchers: readonly Matcher[]): LexedToken[] {
    const tokens: LexedToken[] = []
    let cursor = 0

    while (cursor < subquery.length) {
        const match = matchAt(subquery, cursor, matchers)
        if (match) {
            tokens.push(match.token)
            cursor = match.end
            continue
        }

        const offset = subquery.slice(cursor + 1).search(OPERATOR_PATTERN)
        tokens.push('BARE_DATE')
        cursor = offset === -1 ? subquery.length : cursor + 1 + offset
    }

    return tokens
}

function peek(reader: TokenReader): LexedToken | undefined {
    return reader.index < reader.tokens.length ? reader.tokens[reader.index] : undefined
}

function next(reader: TokenReader): LexedToken | undefined {
    const token = peek(reader)
    reader.index += 1
    return token
}

/**
 * `<expression 4> ::= <expression 3> [ or <expression 4> ]`
 *
 * The engine nests this to the right and folds with a minimum, so reading the
 * chain in a loop lands on the same grouping without a frame per operator.
 */
function readOr(reader: TokenReader): Grouping | null {
    let grouping = readAnd(reader)

    while (grouping !== null && peek(reader) === 'OR') {
        next(reader)
        const right = readAnd(reader)
        if (right === null) return null

        // `|` keeps the lower grouping, so one flat side flattens the pair.
        grouping = grouping === 'DAY' && right === 'DAY' ? 'DAY' : 'FLAT'
    }

    return grouping
}

/** `<expression 3> ::= <expression 2> [ and <expression 3> ]` */
function readAnd(reader: TokenReader): Grouping | null {
    let grouping = readNot(reader)

    while (grouping !== null && peek(reader) === 'AND') {
        next(reader)
        const right = readNot(reader)
        if (right === null) return null

        // `&` keeps the higher grouping, so one dated side leads the pair.
        grouping = grouping === 'DAY' || right === 'DAY' ? 'DAY' : 'FLAT'
    }

    return grouping
}

/** `<expression 2> ::= { [ not ] <expression 2> } | <expression 1>` */
function readNot(reader: TokenReader): Grouping | null {
    let negated = false
    while (peek(reader) === 'NOT') {
        next(reader)
        negated = true
    }

    const grouping = readOperand(reader)
    if (grouping === null) return null

    // A negation never groups by day, however the expression under it reads.
    return negated ? 'FLAT' : grouping
}

/** `<expression 1> ::= { "(" <expression> ")" } | <query>` */
function readOperand(reader: TokenReader): Grouping | null {
    const token = next(reader)
    if (token === undefined) return null

    if (token === 'LEFT') {
        if (reader.depth >= MAX_NESTING_DEPTH) return null

        reader.depth += 1
        const grouping = readOr(reader)
        reader.depth -= 1

        if (grouping === null || next(reader) !== 'RIGHT') return null
        return grouping
    }

    if (token === 'BARE_DATE') return 'DAY'
    if (OPERATOR_TOKENS.has(token)) return null
    return DATE_TOKENS.has(token) ? 'DAY' : 'FLAT'
}

function groupingOf(subquery: string, matchers: readonly Matcher[]): Grouping | null {
    const reader: TokenReader = { tokens: tokenize(subquery, matchers), index: 0, depth: 0 }
    const grouping = readOr(reader)

    // Tokens left over mean the query doesn't parse, which the engine rejects.
    return grouping !== null && reader.index === reader.tokens.length ? grouping : null
}

/**
 * Returns whether a filter query leads with dates rather than with priority.
 *
 * Todoist gives every filter one of two default hierarchies, and a query that
 * mentions dates gets the date-first one. Pass the answer to {@link sortTasks}
 * as its `defaultOrder`:
 *
 * ```ts
 * sortTasks(tasks, {
 *     sortedBy: savedOptions?.sortedBy,
 *     sortOrder: savedOptions?.sortOrder,
 *     defaultOrder: isDateDrivenQuery(query, { lang }) ? 'DATE_FIRST' : 'PRIORITY_FIRST',
 * })
 * ```
 *
 * The query is read in `lang`, the account language `getUser` returns, the way
 * the API reads it. English keywords parse under every language, so `lang` only
 * matters for a query written in the account's own: `sin fecha` is a keyword
 * under `es` and an unreadable phrase under `en`.
 *
 * Commas divide a filter into subqueries and Todoist draws each one as its own
 * list, with its own hierarchy. Classify them one at a time for exact results;
 * a whole query answers true only when every subquery is date-driven.
 *
 * Two kinds of unreadable query part company here. One that breaks the grammar,
 * such as `(today`, returns false. One that only breaks the vocabulary, such as
 * `sin fecha` under `en`, returns true, because a word this package doesn't
 * recognize is treated as a bare date. Pass the account's own `lang` and the
 * question doesn't arise; get it wrong and a keyword can read as a date.
 *
 * The function performs no I/O.
 *
 * @see sortTasks
 */
export function isDateDrivenQuery(query: string, options: IsDateDrivenQueryOptions = {}): boolean {
    const matchers = matchersFor(resolveLanguage(options.lang))
    const subqueries = splitSubqueries(query)

    return (
        subqueries.length > 0 &&
        subqueries.every((subquery) => groupingOf(subquery, matchers) === 'DAY')
    )
}
