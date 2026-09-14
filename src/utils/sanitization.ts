import { Task } from '../types'

const BOLD_FORMAT = /(^|[\s!?,;>:]+)(?:\*\*|__|!!)(.+?)(\*\*|__|!!)(?=$|[\s!?,;><:]+)/gi
const ITALIC_FORMAT = /(^|[\s!?,;>:]+)(?:\*|_|!)(.+?)(\*|_|!)(?=$|[\s!?,;><:]+)/gi
const BOLD_ITALIC_FORMAT =
    /(^|[\s!?,;>:]+)(?:\*\*\*|___|!!!)(.+?)(\*\*\*|___|!!!)(?=$|[\s!?,;><:]+)/gi
const CODE_BLOCK_FORMAT = /```([\s\S]*?)```/gi
const CODE_INLINE_FORMAT = /`([^`]+)`/gi

const TODOIST_LINK = /((?:(?:onenote:)?[\w-]+):\/\/[^\s]+)\s+[[(]([^)]+)[\])]/gi
const MARKDOWN_LINK = /\[(.+?)\]\((.+?)\)/gi
const GMAIL_LINK = /\[\[gmail=(.+?),\s*(.+?)\]\]/gi
const OUTLOOK_LINK = /\[\[outlook=(.+?),\s*(.+?)\]\]/gi
const THUNDERBIRD_LINK = /\[\[thunderbird\n(.+)\n(.+)\n\s*\]\]/gi

const FAKE_SECTION_PREFIX = '* '
const FAKE_SECTION_SUFFIX = ':'

export type TaskWithSanitizedContent = Task & {
    sanitizedContent: string
}

function removeStyleFormatting(input: string): string {
    if (!input.includes('!') && !input.includes('*') && !input.includes('_')) {
        return input
    }

    function removeMarkdown(_match: string, prefix: string, text: string) {
        return `${prefix}${text}`
    }

    input = input.replace(BOLD_ITALIC_FORMAT, removeMarkdown)
    input = input.replace(BOLD_FORMAT, removeMarkdown)
    input = input.replace(ITALIC_FORMAT, removeMarkdown)

    return input
}

function removeCodeFormatting(input: string): string {
    function removeMarkdown(_match: string, text: string) {
        return text
    }

    input = input.replace(CODE_BLOCK_FORMAT, removeMarkdown)
    input = input.replace(CODE_INLINE_FORMAT, removeMarkdown)

    return input
}

function removeFakeSectionFormatting(input: string): string {
    if (input.startsWith(FAKE_SECTION_PREFIX)) {
        input = input.slice(FAKE_SECTION_PREFIX.length)
    }

    if (input.endsWith(FAKE_SECTION_SUFFIX)) {
        input = input.slice(0, input.length - FAKE_SECTION_SUFFIX.length)
    }

    return input
}

function removeMarkdownLinks(input: string) {
    if (!input.includes('[') || !input.includes(']')) {
        return input
    }

    function removeMarkdown(_match: string, text: string) {
        return text
    }

    return input.replace(MARKDOWN_LINK, removeMarkdown)
}

function removeTodoistLinks(input: string) {
    if (!input.includes('(') || !input.includes(')')) {
        return input
    }

    function removeMarkdown(_match: string, _url: string, text: string) {
        return text
    }

    return input.replace(TODOIST_LINK, removeMarkdown)
}

function removeAppLinks(input: string) {
    if (input.includes('gmail')) {
        input = input.replace(GMAIL_LINK, (_match: string, _id: string, text: string) => text)
    }

    if (input.includes('outlook')) {
        input = input.replace(OUTLOOK_LINK, (_match: string, _id: string, text: string) => text)
    }

    if (input.includes('thunderbird')) {
        input = input.replace(THUNDERBIRD_LINK, (_match: string, text: string) => text)
    }

    return input
}

/**
 * Sanitizes a string by removing Todoist's formatting syntax (e.g. bold, italic, code blocks, links).
 *
 * @example
 * // Removes bold/italic formatting
 * getSanitizedContent('Some **bold** and *italic*') // 'Some bold and italic'
 *
 * // Removes markdown links
 * getSanitizedContent('A [markdown](http://url.com) link') // 'A markdown link'
 *
 * // Removes app-specific links
 * getSanitizedContent('A [[gmail=id, link from gmail]]') // 'A link from gmail'
 *
 * @param input - The string to sanitize
 * @returns The sanitized string with all formatting removed
 */
export function getSanitizedContent(input: string): string {
    input = removeStyleFormatting(input)
    input = removeCodeFormatting(input)
    input = removeFakeSectionFormatting(input)
    input = removeMarkdownLinks(input)
    input = removeTodoistLinks(input)
    input = removeAppLinks(input)

    return input
}

/**
 * Takes an array of tasks and returns a new array with sanitized content
 * added as 'sanitizedContent' property to each task.
 *
 * @see {@link getSanitizedContent}
 *
 * @example
 * const tasks = [{ content: '**Bold** task', ... }]
 * getSanitizedTasks(tasks) // [{ content: '**Bold** task', sanitizedContent: 'Bold task', ... }]
 *
 * @param tasks - Array of Task objects to sanitize
 * @returns Array of tasks with added sanitizedContent property
 */
export function getSanitizedTasks(tasks: Task[]): TaskWithSanitizedContent[] {
    return tasks.map((task) => ({ ...task, sanitizedContent: getSanitizedContent(task.content) }))
}

/**
 * Escapes text for use as a token in a Todoist filter query.
 *
 * Prefixes parentheses, pipes, ampersands, exclamation marks, commas, and
 * backslashes with a backslash. Quotes and asterisks are left unchanged.
 * Whitespace validation and trimming are the caller's responsibility.
 * Pass unescaped text to this function once, before inserting it into a query.
 *
 * @example
 * const tasks = await api.getTasksByFilter({
 *     query: `search: ${escapeFilterToken(searchText)}`,
 * })
 *
 * @param text - The text to escape, not a complete filter query
 * @returns The escaped text, with whitespace preserved
 */
export function escapeFilterToken(text: string): string {
    return text.replace(/[()|&!,\\]/g, '\\$&')
}
