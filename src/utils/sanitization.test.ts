import { escapeFilterToken } from '../index'
import { DEFAULT_TASK } from '../test-utils/test-defaults'
import { Task } from '../types'
import { getSanitizedContent, getSanitizedTasks } from './sanitization'

describe('getSanitizedContent', () => {
    const sanitizationTheories = [
        [
            'Some text with **Bold 1** and __Bold 2__ and !!Bold 3!!',
            'Some text with Bold 1 and Bold 2 and Bold 3',
        ],
        ['Some text with *Italic 1* and _Italic 2_', 'Some text with Italic 1 and Italic 2'],
        [
            'Some text with ***Bold Italic 1*** and ___Bold Italic 2___ and !!!Bold Italic 3!!!',
            'Some text with Bold Italic 1 and Bold Italic 2 and Bold Italic 3',
        ],
        ['* A fake section', 'A fake section'],
        ['Another fake section:', 'Another fake section'],
        ['A [markdown](http://someurl.com) link', 'A markdown link'],
        ['A http://someurl.com (Todoist) link', 'A Todoist link'],
        ['A [[gmail=14c98f1d86e72c05, link from gmail]]', 'A link from gmail'],
        ['A [[outlook=14c98f1d86e72c05, link from outlook]]', 'A link from outlook'],
        ['A [[thunderbird\nlink from thunderbird\nARANDOMID\n]]', 'A link from thunderbird'],
        [
            'Some text with `inline code` and ```block code```',
            'Some text with inline code and block code',
        ],
        ['Trailing asterisks are left in place*', 'Trailing asterisks are left in place*'],
    ]

    test.each(sanitizationTheories)('input text %p is sanitized to %p', (input, expected) => {
        const sanitizedContent = getSanitizedContent(input)
        expect(sanitizedContent).toEqual(expected)
    })
})

describe('getSanitizedTasks', () => {
    test('sanitizes a list of tasks', () => {
        const tasks: Task[] = [
            {
                ...DEFAULT_TASK,
                content: 'Some ***bold italic*** text',
            },
            {
                ...DEFAULT_TASK,
                content: '* A fake section',
            },
            {
                ...DEFAULT_TASK,
                content: 'A [markdown](http://someurl.com) link',
            },
        ]

        const expectedStrings = ['Some bold italic text', 'A fake section', 'A markdown link']

        const sanitizedTasks = getSanitizedTasks(tasks)

        expect(sanitizedTasks).toHaveLength(3)
        expect(sanitizedTasks[0].sanitizedContent).toEqual(expectedStrings[0])
        expect(sanitizedTasks[1].sanitizedContent).toEqual(expectedStrings[1])
        expect(sanitizedTasks[2].sanitizedContent).toEqual(expectedStrings[2])
    })
})

describe('escapeFilterToken', () => {
    test.each([
        '',
        'team meeting notes',
        '日本語 café 🙂',
        '"double quotes" and \'single quotes\'',
        '*wildcard*',
        '@work #project: [notes] / 100% $value',
        '   ',
        '\t\n\r',
        '  before\tand\nafter  ',
    ])('preserves %p', (input) => {
        expect(escapeFilterToken(input)).toBe(input)
    })

    test.each([
        ['before ( after', 'before \\( after'],
        ['before ) after', 'before \\) after'],
        ['before | after', 'before \\| after'],
        ['before & after', 'before \\& after'],
        ['before ! after', 'before \\! after'],
        ['before , after', 'before \\, after'],
        ['before \\ after', 'before \\\\ after'],
        ['(one & two), !three | four', '\\(one \\& two\\)\\, \\!three \\| four'],
        ['  (text)\t&\nnotes  ', '  \\(text\\)\t\\&\nnotes  '],
        ['\\', '\\\\'],
        ['trailing\\', 'trailing\\\\'],
        ['trailing\\\\', 'trailing\\\\\\\\'],
        [String.raw`C:\reports\notes`, String.raw`C:\\reports\\notes`],
        [String.raw`\(\)\|\&\!\,`, String.raw`\\\(\\\)\\\|\\\&\\\!\\\,`],
        [String.raw`\\,`, String.raw`\\\\\,`],
        [String.raw`\"\'\*\:`, String.raw`\\"\\'\\*\\:`],
    ])('escapes %p to %p', (input, expected) => {
        expect(escapeFilterToken(input)).toBe(expected)
    })
})
