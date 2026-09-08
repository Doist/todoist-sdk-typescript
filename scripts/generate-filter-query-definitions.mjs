#!/usr/bin/env node
/**
 * Regenerates the filter-query token table behind `isDateDrivenQuery`.
 *
 * The table is Todoist's own filter vocabulary, taken from
 * Doist/filterist-definitions, the repository every Todoist client generates
 * its lexer from. Nothing here is written by hand: run this after a
 * definitions release and commit whatever it produces.
 *
 *     node scripts/generate-filter-query-definitions.mjs
 *     npm run check:fix
 *
 * Reading the definitions needs `gh` authenticated against the Doist org.
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = 'Doist/filterist-definitions'
const REF = process.env.FILTERIST_DEFINITIONS_REF ?? 'main'

const ROOT = join(import.meta.dirname, '..')
const DEFINITIONS_FILE = join(ROOT, 'src', 'utils', 'filter-query-definitions.ts')
const CONFORMANCE_FILE = join(ROOT, 'src', 'utils', 'filter-queries.conformance.test.ts')

/**
 * Token kinds in the order FilteristKt's `Lexer` registers them, which settles
 * ties between two patterns of the same length. Kinds the lexer has no matcher
 * for are left out on purpose: the engine hands those words to the date parser,
 * and so does this package.
 */
const TOKENS = [
    'LEFT',
    'RIGHT',
    'NOT',
    'AND',
    'OR',
    'PRIORITY',
    'NO_PRIORITY',
    'PROJECT',
    'SECTION',
    'PROJECT_SINGLE',
    'LABEL',
    'NO_LABELS',
    'DUE',
    'DUE_BEFORE',
    'DUE_AFTER',
    'DEADLINE',
    'DEADLINE_BEFORE',
    'DEADLINE_AFTER',
    'DATE',
    'DATE_BEFORE',
    'DATE_AFTER',
    'DUE_RECURRING',
    'OVERDUE',
    'WITHIN_DAYS',
    'NO_DUE_DATE',
    'NO_DEADLINE',
    'NO_DATE',
    'NO_TIME',
    'CREATED',
    'CREATED_BEFORE',
    'CREATED_AFTER',
    'ADDED_BY',
    'SHARED',
    'ASSIGNED',
    'TO_ME',
    'TO_OTHERS',
    'ASSIGNED_TO',
    'ASSIGNED_BY',
    'SUBTASK',
    'VIEW_ALL',
    'ALL',
    'SEARCH',
    'WORKSPACE_SINGLE',
    'UNCOMPLETABLE',
]

/**
 * Tokens that make a subquery group by day, from FilteristKt's `Grouper`.
 *
 * `recurring`, `no date` and `created:` are absent there too. Each says
 * something about dates without giving the list one to lead with.
 */
const DATE_TOKENS = [
    'DUE',
    'DUE_BEFORE',
    'DUE_AFTER',
    'DEADLINE',
    'DEADLINE_BEFORE',
    'DEADLINE_AFTER',
    'DATE',
    'DATE_BEFORE',
    'DATE_AFTER',
    'OVERDUE',
    'WITHIN_DAYS',
]

/** Tokens that join or negate operands rather than standing as one. */
const OPERATOR_TOKENS = ['LEFT', 'RIGHT', 'NOT', 'AND', 'OR']

/** The operand a named reference or date argument runs to, shared by most patterns. */
const OPERAND = String.raw`((?:[^()|&!,\\]|\\.)+)`

const cache = new Map()

function gh(path) {
    const cached = cache.get(path)
    if (cached) return cached

    const body = execFileSync('gh', ['api', `repos/${REPO}/${path}`], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    })
    cache.set(path, body)
    return body
}

function ghJson(path) {
    return JSON.parse(gh(path))
}

function ghFile(path, ref) {
    const { content } = ghJson(`contents/${path}?ref=${ref}`)
    return JSON.parse(
        Buffer.from(content, 'base64')
            .toString('utf8')
            .replace(/^\uFEFF/, ''),
    )
}

/**
 * The definitions carry each pattern escaped for a source-code literal, so one
 * round of unescaping gives the regular expression itself. Every pattern is
 * then wrapped in `^\s*` … `\s*`, which the runtime adds back.
 */
function patternBody(pattern) {
    const source = pattern.replace(/\\\\/g, '\\')
    const match = /^\^\\s\*([\s\S]*?)\\s\*$/.exec(source)
    if (!match) throw new Error(`Unexpected pattern shape: ${source}`)
    return match[1]
}

function quote(value) {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

/** Writes a pattern as a template literal when it ends in the shared operand. */
function patternLiteral(body) {
    if (!body.endsWith(OPERAND)) return quote(body)

    const head = body.slice(0, -OPERAND.length)
    if (head === '') return 'OPERAND'

    const escaped = head.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')
    return `\`${escaped}\${OPERAND}\``
}

function main() {
    // Resolve the ref once. Every request below pins to this commit, so a tip
    // that moves mid-run cannot mix two revisions into one generated file.
    const sha = ghJson(`commits/${REF}`).sha
    const languages = ghJson(`contents/dist/json?ref=${sha}`)
        .map((entry) => entry.name)
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -'.json'.length))
        .sort()

    const patterns = new Map()
    for (const language of languages) {
        const byToken = new Map(
            ghFile(`dist/json/${language}.json`, sha).tokenRegexDef.map((entry) => [
                entry.name,
                entry.regex,
            ]),
        )
        patterns.set(
            language,
            TOKENS.map((token) => {
                const regexes = byToken.get(token)
                if (!regexes) throw new Error(`${language}.json is missing ${token}`)
                return [token, regexes.map(patternBody)]
            }),
        )
    }

    writeFileSync(DEFINITIONS_FILE, renderDefinitions({ sha, languages, patterns }))
    writeFileSync(CONFORMANCE_FILE, renderConformance({ sha, languages }))
    process.stdout.write(`Wrote ${languages.length} languages from ${REPO}@${sha.slice(0, 12)}\n`)
}

function renderDefinitions({ sha, languages, patterns }) {
    const lines = [
        '// Generated by scripts/generate-filter-query-definitions.mjs. Do not edit by hand.',
        `// Source: ${REPO}@${sha.slice(0, 12)} (dist/json).`,
        '',
        '/**',
        ' * Languages the Todoist filter parser reads queries in.',
        ' *',
        ' * English keywords parse under every one of them, so only a query written in',
        " * the account's own language needs the matching code.",
        ' */',
        'export const FILTER_QUERY_LANGUAGES = [',
        ...languages.map((language) => `    ${quote(language)},`),
        '] as const',
        '',
        '/** A language the Todoist filter parser reads queries in. */',
        'export type FilterQueryLanguage = (typeof FILTER_QUERY_LANGUAGES)[number]',
        '',
        '/** Token kinds the Todoist filter lexer recognizes, in the order it tries them. */',
        'export const FILTER_QUERY_TOKENS = [',
        ...TOKENS.map((token) => `    ${quote(token)},`),
        '] as const',
        '',
        '/** A token kind the Todoist filter lexer recognizes. */',
        'export type FilterQueryToken = (typeof FILTER_QUERY_TOKENS)[number]',
        '',
        '/**',
        " * Tokens that make a subquery date-driven, from FilteristKt's `Grouper`.",
        ' *',
        ' * `recurring`, `no date` and `created:` are absent there too. Each says',
        ' * something about dates without giving the list one to lead with.',
        ' */',
        'export const FILTER_QUERY_DATE_TOKENS = [',
        ...DATE_TOKENS.map((token) => `    ${quote(token)},`),
        '] as const satisfies readonly FilterQueryToken[]',
        '',
        '/** Tokens that join or negate operands rather than standing as one. */',
        'export const FILTER_QUERY_OPERATOR_TOKENS = [',
        ...OPERATOR_TOKENS.map((token) => `    ${quote(token)},`),
        '] as const satisfies readonly FilterQueryToken[]',
        '',
        '/** The operand a named reference or date argument runs to, shared by most patterns. */',
        `const OPERAND = ${quote(OPERAND)}`,
        '',
        '/**',
        ' * Localized patterns per token, each one the body of `^\\s*<pattern>\\s*` and',
        ' * matched case-insensitively at the cursor.',
        ' */',
        'export const FILTER_QUERY_PATTERNS: Record<',
        '    FilterQueryLanguage,',
        '    Record<FilterQueryToken, readonly string[]>',
        '> = {',
    ]

    for (const language of languages) {
        lines.push(`    ${language}: {`)
        for (const [token, bodies] of patterns.get(language)) {
            lines.push(`        ${token}: [${bodies.map(patternLiteral).join(', ')}],`)
        }
        lines.push('    },')
    }

    lines.push('}', '')
    return lines.join('\n')
}

function renderConformance({ sha, languages }) {
    const grouping = ghFile('test_json/grouping_test.json', sha)
    const rows = []

    for (const language of languages) {
        const seenTokens = new Set()
        const seenQueries = new Set()
        for (const testCase of ghFile(`test_json/lexer_i18n_tests/${language}_test.json`, sha)) {
            if (testCase.expected_tokens.length !== 1) continue

            const token = testCase.expected_tokens[0].type
            if (!TOKENS.includes(token) || OPERATOR_TOKENS.includes(token)) continue
            // Date tokens get every phrasing, since those decide the answer. The
            // rest need one row each, to prove the pattern is reached at all and
            // does not fall through to the date parser.
            if (!DATE_TOKENS.includes(token) && seenTokens.has(token)) continue
            if (seenQueries.has(testCase.query)) continue

            seenTokens.add(token)
            seenQueries.add(testCase.query)
            rows.push([language, testCase.query, token, DATE_TOKENS.includes(token)])
        }
    }

    return [
        '// Generated by scripts/generate-filter-query-definitions.mjs. Do not edit by hand.',
        `// Source: ${REPO}@${sha.slice(0, 12)} (test_json).`,
        '',
        "import { isDateDrivenQuery } from './filter-queries'",
        '',
        "/** Todoist's own grouping cases, the ones every client lexer is checked against. */",
        'const GROUPING_CASES: readonly (readonly [string, boolean])[] = [',
        ...grouping.map(
            (entry) =>
                `    [${quote(entry.query)}, ${String(entry.suggested_grouping.type === 'DAY')}],`,
        ),
        ']',
        '',
        '/** One row per localized phrasing of a token, from the shared lexer fixtures. */',
        'const TOKEN_CASES: readonly (readonly [string, string, string, boolean])[] = [',
        ...rows.map(
            ([language, query, token, isDay]) =>
                `    [${quote(language)}, ${quote(query)}, ${quote(token)}, ${String(isDay)}],`,
        ),
        ']',
        '',
        "describe('isDateDrivenQuery matches the shared grouping fixtures', () => {",
        "    test.each(GROUPING_CASES)('%s', (query, expected) => {",
        '        expect(isDateDrivenQuery(query)).toBe(expected)',
        '    })',
        '})',
        '',
        "describe('isDateDrivenQuery reads every localized token', () => {",
        "    test.each(TOKEN_CASES)('%s %s (%s)', (lang, query, _token, expected) => {",
        '        expect(isDateDrivenQuery(query, { lang })).toBe(expected)',
        '    })',
        '})',
        '',
    ].join('\n')
}

main()
