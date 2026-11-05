// Instructions that name files or commands that don't exist send agents in circles. This checks
// every path, link and `npm run` script named in the agent-facing docs, and the skills' shape.

import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { git } from './lib/git.ts'
import { readJson } from './lib/state.ts'
import { REPO_ROOT } from './lib/test-repo.ts'
import { AGENT_DOCS } from './lib/tree.ts'

const SKILLS_DIR = join(REPO_ROOT, '.agents/skills')
// Only folders are skills; a stray file such as a README in .agents/skills/ is not one.
const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)

function markdownFiles(dir: string): string[] {
    return readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter((name) => name.endsWith('.md'))
        .map((name) => join(dir, name))
}

// The same list that makes verify treat these docs as code, so a doc checked here can't be
// skipped there as docs-only.
const DOCS = [
    ...[...AGENT_DOCS].map((path) => join(REPO_ROOT, path)),
    ...markdownFiles(join(REPO_ROOT, '.agents')),
]

const tracked = git(REPO_ROOT, ['ls-files', '--cached', '--others', '--exclude-standard'])
    .stdout.split('\n')
    .filter(Boolean)
const scripts = Object.keys(
    readJson<{ scripts: Record<string, string> }>(join(REPO_ROOT, 'package.json'))?.scripts ?? {},
)

const ROOTED = /^(src|scripts|docs|website|\.agents|\.github|\.claude|\.codex|\.cursor)\//
const FILE_NAME = /^[\w.-]+\.(md|json|ts|tsx|js|cjs|mjs|sh|yml|yaml)$/
// A path relative to the document, like `references/test-rules.md` in a skill.
const RELATIVE_FILE = /^[\w.-]+(\/[\w.-]+)+\.(md|json|ts|sh)$/
// Output and state that exist only after a build or run.
const GENERATED = /^(\.tmp|tmp|dist|node_modules)(\/|$)/

type Reference = { path: string; line?: number }

/** Paths named in backticks, with an optional `:line`. Placeholders (`<area>`, `*`) are skipped. */
function namedPaths(text: string): Reference[] {
    return [...text.matchAll(/`([^`\s]+)`/g)]
        .map((match) => match[1] ?? '')
        .filter((value) => !/[<>*{}]/.test(value) && !GENERATED.test(value))
        .map((value) => {
            const [, path = value, line] = value.match(/^(.*?):(\d+)$/) ?? []
            return { path, line: line ? Number(line) : undefined }
        })
        .filter(({ path }) => ROOTED.test(path) || FILE_NAME.test(path) || RELATIVE_FILE.test(path))
}

/**
 * The repository path a reference names, or why it doesn't resolve. A bare file name resolves
 * through the files git lists, but only to one still on disk: git keeps listing a deleted file
 * until the deletion is staged.
 */
function resolveReference(
    path: string,
    doc: string,
    files: string[] = tracked,
): string | { problem: string } {
    if (!ROOTED.test(path) && path.includes('/')) {
        const local = relative(REPO_ROOT, resolve(dirname(doc), path))
        if (existsSync(join(REPO_ROOT, local))) return local
    }
    if (ROOTED.test(path) || path.includes('/') || existsSync(join(REPO_ROOT, path))) {
        return existsSync(join(REPO_ROOT, path)) ? path : { problem: 'does not exist' }
    }
    const matches = files.filter(
        (candidate) => basename(candidate) === path && existsSync(join(REPO_ROOT, candidate)),
    )
    if (matches.length === 1) return matches[0] ?? path
    return {
        problem: matches.length === 0 ? 'does not exist' : `is ambiguous: ${matches.join(', ')}`,
    }
}

/** Lines in a file, not counting the empty one `split` finds after a final newline. */
function lineCount(text: string): number {
    const lines = text.split('\n')
    return text.endsWith('\n') ? lines.length - 1 : lines.length
}

function brokenReferences(text: string, doc: string): string[] {
    return namedPaths(text).flatMap(({ path, line }) => {
        const resolved = resolveReference(path, doc)
        if (typeof resolved !== 'string') return [`${path} ${resolved.problem}`]
        if (line === undefined) return []
        const full = join(REPO_ROOT, resolved)
        if (lstatSync(full).isDirectory()) return [`${path}:${line} names a line in a folder`]
        const lines = lineCount(readFileSync(full, 'utf8'))
        return line > lines ? [`${path}:${line} is past the end (${lines} lines)`] : []
    })
}

/** Backticked names in the bullet list under a heading. */
function listedUnder(text: string, heading: string): string[] {
    const section = text.split(heading)[1]?.split(/\n#{1,3} /)[0] ?? ''
    return [...section.matchAll(/^- `([\w-]+)`/gm)].map((match) => match[1] ?? '')
}

describe.each(DOCS.map((path) => [relative(REPO_ROOT, path), path]))('%s', (_name, path) => {
    const text = readFileSync(path, 'utf8')

    it('names only files and lines that exist', () => {
        expect(brokenReferences(text, path)).toEqual([])
    })

    it('links only to files that exist', () => {
        const links = [...text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)]
            .map((match) => match[1] ?? '')
            .filter((link) => !/^[a-z]+:/.test(link))
        expect(links.filter((link) => !existsSync(resolve(dirname(path), link)))).toEqual([])
    })

    it('names only npm scripts that exist', () => {
        const named = [...text.matchAll(/npm run (?:--silent )?([\w:-]+)/g)].map((m) => m[1] ?? '')
        expect(named.filter((script) => !scripts.includes(script))).toEqual([])
    })
})

it('counts lines without the empty one after a final newline', () => {
    expect([lineCount('a\nb\n'), lineCount('a\nb'), lineCount('a\n')]).toEqual([2, 2, 1])
})

it('treats a line just past the end of a file as broken', () => {
    const doc = join(REPO_ROOT, 'AGENTS.md')
    // lefthook.yml ends with a newline, so it has as many lines as newlines.
    const last = readFileSync(join(REPO_ROOT, 'lefthook.yml'), 'utf8').match(/\n/g)?.length ?? 0
    expect(brokenReferences(`\`lefthook.yml:${last}\``, doc)).toEqual([])
    expect(brokenReferences(`\`lefthook.yml:${last + 1}\``, doc)).toEqual([
        `lefthook.yml:${last + 1} is past the end (${last} lines)`,
    ])
})

it('resolves a bare file name only to a file still on disk', () => {
    const doc = join(REPO_ROOT, 'AGENTS.md')
    expect(resolveReference('lefthook.yml', doc, ['lefthook.yml'])).toBe('lefthook.yml')
    expect(resolveReference('gone.md', doc, ['docs/gone.md'])).toEqual({
        problem: 'does not exist',
    })
    expect(resolveReference('agents.md', doc, ['docs/agents.md', 'old/agents.md'])).toBe(
        'docs/agents.md',
    )
})

describe.each(skills)('skill %s', (skill) => {
    const file = join(SKILLS_DIR, skill, 'SKILL.md')
    const text = readFileSync(file, 'utf8')
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''

    it('has a name matching its folder and a description that says when to use it', () => {
        expect(frontmatter).toMatch(new RegExp(`^name: ${skill}$`, 'm'))
        const description = frontmatter.match(/^description: (.+)$/m)?.[1] ?? ''
        expect(description).toContain('Use when')
        expect(description.length).toBeLessThan(400)
    })

    it('is linked for Claude Code', () => {
        const link = join(REPO_ROOT, '.claude/skills', skill)
        expect(lstatSync(link).isSymbolicLink()).toBe(true)
        expect(resolve(dirname(link), readlinkSync(link))).toBe(join(SKILLS_DIR, skill))
    })
})

it('lists every skill in AGENTS.md, and only those', () => {
    const text = readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf8')
    expect(listedUnder(text, '## Skills').toSorted()).toEqual(skills.toSorted())
})

it('names only test helpers that src/test-utils/ exports', async () => {
    const skill = readFileSync(join(SKILLS_DIR, 'write-tests/SKILL.md'), 'utf8')
    const section = skill.split('## Helpers')[1]?.split('\n## ')[0] ?? ''
    const named = [...section.matchAll(/`(\w+)`/g)].map((match) => match[1] ?? '')
    const dir = join(REPO_ROOT, 'src/test-utils')
    const modules = readdirSync(dir)
        .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
        .map((file) => join(dir, file))
    // What the modules export at run time, whatever form the export takes.
    const exported = (await Promise.all(modules.map((path) => import(path)))).flatMap((module) =>
        Object.keys(module as object),
    )
    expect(named.length).toBeGreaterThan(5)
    expect(named.filter((name) => !exported.includes(name))).toEqual([])
})

it('has no Claude Code skill link without a skill behind it', () => {
    const links = readdirSync(join(REPO_ROOT, '.claude/skills'))
    expect(links.toSorted()).toEqual(skills.toSorted())
})
