import {
    formatDateToYYYYMMDD,
    getFilterUrl,
    getLabelUrl,
    getProjectCommentsUrl,
    getProjectCommentUrl,
    getProjectUrl,
    getSectionUrl,
    getTaskCommentsUrl,
    getTaskCommentUrl,
    getTaskUrl,
    getWorkspaceFilterUrl,
    getWorkspaceUrl,
    parseTodoistUrl,
    TODOIST_LINK_TYPES,
} from './url-helpers'

describe('formatDateToYYYYMMDD', () => {
    test('formats Date object to YYYY-MM-DD string', () => {
        const date = new Date('2025-01-15T10:30:00Z')
        expect(formatDateToYYYYMMDD(date)).toBe('2025-01-15')
    })

    test('pads month with leading zero', () => {
        const date = new Date('2025-03-05T00:00:00Z')
        expect(formatDateToYYYYMMDD(date)).toBe('2025-03-05')
    })

    test('pads day with leading zero', () => {
        const date = new Date('2025-12-07T00:00:00Z')
        expect(formatDateToYYYYMMDD(date)).toBe('2025-12-07')
    })

    test('handles end of month correctly', () => {
        const date = new Date('2025-02-28T23:59:59Z')
        expect(formatDateToYYYYMMDD(date)).toBe('2025-02-28')
    })

    test('handles leap year correctly', () => {
        const date = new Date('2024-02-29T12:00:00Z')
        expect(formatDateToYYYYMMDD(date)).toBe('2024-02-29')
    })

    test('uses local timezone for date components', () => {
        // Create a date using local timezone (not UTC)
        const date = new Date(2025, 0, 15, 23, 59, 59) // January 15, 2025, 23:59:59 local time
        const result = formatDateToYYYYMMDD(date)
        expect(result).toBe('2025-01-15')
    })
})

describe('getTaskUrl', () => {
    test('generates URL with task ID only', () => {
        expect(getTaskUrl('12345')).toBe('https://app.todoist.com/app/task/12345')
    })

    test('generates URL with task ID and content', () => {
        const url = getTaskUrl('12345', 'Buy groceries')
        expect(url).toBe('https://app.todoist.com/app/task/buy-groceries-12345')
    })
})

describe('getProjectUrl', () => {
    test('generates URL with project ID only', () => {
        expect(getProjectUrl('67890')).toBe('https://app.todoist.com/app/project/67890')
    })

    test('generates URL with project ID and name', () => {
        const url = getProjectUrl('67890', 'Work Project')
        expect(url).toBe('https://app.todoist.com/app/project/work-project-67890')
    })
})

describe('getSectionUrl', () => {
    test('generates URL with section ID only', () => {
        expect(getSectionUrl('11111')).toBe('https://app.todoist.com/app/section/11111')
    })

    test('generates URL with section ID and name', () => {
        const url = getSectionUrl('11111', 'To Do')
        expect(url).toBe('https://app.todoist.com/app/section/to-do-11111')
    })
})

describe('slugified names', () => {
    test('transliterates non-Latin scripts', () => {
        expect(getTaskUrl('4', 'Привет мир')).toBe('https://app.todoist.com/app/task/privet-mir-4')
        expect(getTaskUrl('9', 'مرحبا')).toBe('https://app.todoist.com/app/task/mrhba-9')
    })

    test('transliterates accented characters', () => {
        expect(getTaskUrl('2', 'Café Münster')).toBe(
            'https://app.todoist.com/app/task/cafe-muenster-2',
        )
    })

    test('strips emoji and punctuation', () => {
        expect(getTaskUrl('1', '🎉 Party time!')).toBe(
            'https://app.todoist.com/app/task/party-time-1',
        )
    })

    test('falls back to the bare id when the name slugifies to nothing', () => {
        expect(getTaskUrl('9', '买菜')).toBe('https://app.todoist.com/app/task/9')
    })

    test('truncates long slugs to 80 characters', () => {
        const url = getTaskUrl('7', 'a'.repeat(300))
        expect(url).toBe(`https://app.todoist.com/app/task/${'a'.repeat(80)}-7`)
    })
})

describe('ids the link builder rejects', () => {
    // URL generation happens while parsing API responses, so it must never throw.
    test.each([
        ['blank id', ''],
        ['id with an underscore', 'abc_def'],
        ['id with a space', 'abc def'],
        ['uuid-style id', 'a1b2c3d4-1234-5678-9abc-def012345678'],
    ])('falls back to a bare-id URL for a %s', (_name, taskId) => {
        expect(() => getTaskUrl(taskId, 'Buy groceries')).not.toThrow()
        expect(getTaskUrl(taskId, 'Buy groceries')).toBe(
            `https://app.todoist.com/app/task/${taskId}`,
        )
    })
})

describe('getLabelUrl', () => {
    test('generates URL with label ID only', () => {
        expect(getLabelUrl('123')).toBe('https://app.todoist.com/app/label/123')
    })

    test('generates URL with label ID and name', () => {
        expect(getLabelUrl('123', 'Urgent')).toBe('https://app.todoist.com/app/label/urgent-123')
    })
})

describe('getFilterUrl', () => {
    test('generates URL with filter ID and name', () => {
        expect(getFilterUrl('456', 'Due today')).toBe(
            'https://app.todoist.com/app/filter/due-today-456',
        )
    })
})

describe('getWorkspaceFilterUrl', () => {
    test('includes the workspace ID in the path', () => {
        expect(getWorkspaceFilterUrl('69', '456', 'Due today')).toBe(
            'https://app.todoist.com/app/69/filter/due-today-456',
        )
    })
})

describe('getWorkspaceUrl', () => {
    test('generates URL for a workspace', () => {
        expect(getWorkspaceUrl('69')).toBe('https://app.todoist.com/app/69')
    })
})

describe('comment URLs', () => {
    test('generates the comments URL for a task', () => {
        expect(getTaskCommentsUrl('12345', 'Buy groceries')).toBe(
            'https://app.todoist.com/app/task/buy-groceries-12345/comments',
        )
    })

    test('generates the comments URL for a project', () => {
        expect(getProjectCommentsUrl('67890', 'Work Project')).toBe(
            'https://app.todoist.com/app/project/work-project-67890/comments',
        )
    })

    test('generates the URL for a single task comment', () => {
        expect(getTaskCommentUrl('12345', '999', 'Buy groceries')).toBe(
            'https://app.todoist.com/app/task/buy-groceries-12345#comment-999',
        )
    })

    test('generates the URL for a single project comment', () => {
        expect(getProjectCommentUrl('67890', '999', 'Work Project')).toBe(
            'https://app.todoist.com/app/project/work-project-67890#comment-999',
        )
    })
})

describe('parseTodoistUrl', () => {
    test('parses a task URL', () => {
        expect(parseTodoistUrl('https://app.todoist.com/app/task/buy-groceries-12345')).toEqual({
            type: 'task',
            id: '12345',
            workspaceId: null,
            commentId: null,
        })
    })

    test('parses a project URL', () => {
        expect(parseTodoistUrl('https://app.todoist.com/app/project/work-project-67890')).toEqual({
            type: 'project',
            id: '67890',
            workspaceId: null,
            commentId: null,
        })
    })

    test('parses the comment ID out of a comment URL', () => {
        expect(parseTodoistUrl(getTaskCommentUrl('12345', '999', 'Buy groceries'))).toEqual({
            type: 'task',
            id: '12345',
            workspaceId: null,
            commentId: '999',
        })
    })

    test('parses the workspace ID out of a workspace filter URL', () => {
        expect(parseTodoistUrl(getWorkspaceFilterUrl('69', '456', 'Due today'))).toEqual({
            type: 'filter',
            id: '456',
            workspaceId: '69',
            commentId: null,
        })
    })

    test('round-trips a generated URL', () => {
        expect(parseTodoistUrl(getTaskUrl('12345', 'Buy groceries'))).toMatchObject({
            type: 'task',
            id: '12345',
        })
    })

    test('returns a plain serialisable object', () => {
        const parsed = parseTodoistUrl('https://app.todoist.com/app/task/buy-groceries-12345')
        expect(JSON.stringify(parsed)).toBe(
            '{"type":"task","id":"12345","workspaceId":null,"commentId":null}',
        )
    })

    test('parses a label URL', () => {
        expect(parseTodoistUrl(getLabelUrl('123', 'Urgent'))).toEqual({
            type: 'label',
            id: '123',
            workspaceId: null,
            commentId: null,
        })
    })

    test('parses a section URL', () => {
        expect(parseTodoistUrl(getSectionUrl('11111', 'To Do'))).toEqual({
            type: 'section',
            id: '11111',
            workspaceId: null,
            commentId: null,
        })
    })

    test('parses a workspace URL', () => {
        expect(parseTodoistUrl(getWorkspaceUrl('69'))).toEqual({
            type: 'workspace',
            id: '69',
            workspaceId: null,
            commentId: null,
        })
    })

    test('maps every URL this SDK can build back to its declared type', () => {
        const urls = [
            getTaskUrl('1', 'Task'),
            getProjectUrl('2', 'Project'),
            getFilterUrl('3', 'Filter'),
            getLabelUrl('4', 'Label'),
            getSectionUrl('5', 'Section'),
            getWorkspaceUrl('6'),
        ]
        const types = urls.map((url) => parseTodoistUrl(url)?.type)
        expect(types).toEqual(['task', 'project', 'filter', 'label', 'section', 'workspace'])
    })

    test('parses a template URL', () => {
        // Templates have no builder; they are recognised on parse only.
        expect(parseTodoistUrl('https://todoist.com/templates/team-standup-123')).toEqual({
            type: 'template',
            id: 'team-standup-123',
            workspaceId: null,
            commentId: null,
        })
    })

    test('every declared type is a known link type', () => {
        expect(new Set(TODOIST_LINK_TYPES).size).toBe(TODOIST_LINK_TYPES.length)
        expect(TODOIST_LINK_TYPES).toContain('template')
        expect(TODOIST_LINK_TYPES).toContain('comment')
        expect(TODOIST_LINK_TYPES).toContain('label_by_name')
    })

    test('returns null for a non-Todoist URL', () => {
        expect(parseTodoistUrl('https://example.com/foo')).toBeNull()
    })
})

describe('fallback URLs keep pointing at the right entity', () => {
    // A rejected id should degrade to a less-pretty URL, never to a different destination.
    const REJECTED = 'bad_id'

    test('workspace filter fallback keeps the workspace segment', () => {
        expect(getWorkspaceFilterUrl('69', REJECTED, 'Due today')).toBe(
            `https://app.todoist.com/app/69/filter/${REJECTED}`,
        )
    })

    test('comments fallbacks keep the comments segment', () => {
        expect(getTaskCommentsUrl(REJECTED, 'Buy groceries')).toBe(
            `https://app.todoist.com/app/task/${REJECTED}/comments`,
        )
        expect(getProjectCommentsUrl(REJECTED, 'Work Project')).toBe(
            `https://app.todoist.com/app/project/${REJECTED}/comments`,
        )
    })

    test('single comment fallbacks keep the comment anchor', () => {
        expect(getTaskCommentUrl('12345', REJECTED, 'Buy groceries')).toBe(
            `https://app.todoist.com/app/task/12345#comment-${REJECTED}`,
        )
        expect(getProjectCommentUrl('67890', REJECTED, 'Work Project')).toBe(
            `https://app.todoist.com/app/project/67890#comment-${REJECTED}`,
        )
    })
})
