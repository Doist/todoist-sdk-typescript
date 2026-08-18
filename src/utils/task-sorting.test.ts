import type { Task } from '../types/tasks'
import { sortTasks } from './task-sorting'

function makeTask(overrides: Partial<Task> & { id: string }): Task {
    return {
        id: overrides.id,
        userId: 'user1',
        projectId: 'project1',
        sectionId: null,
        parentId: null,
        addedByUid: 'user1',
        assignedByUid: null,
        responsibleUid: null,
        labels: [],
        deadline: null,
        duration: null,
        checked: false,
        isDeleted: false,
        addedAt: new Date('2026-01-01T00:00:00Z'),
        completedAt: null,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        due: null,
        priority: 1,
        childOrder: 0,
        content: overrides.id,
        description: '',
        dayOrder: 0,
        isCollapsed: false,
        isUncompletable: false,
        url: `https://app.todoist.com/app/task/${overrides.id}`,
        ...overrides,
    }
}

function due(date: string, timezone: string | null = null) {
    return {
        date: date.slice(0, 10),
        datetime: date.includes('T') ? date : null,
        timezone,
        string: date,
        isRecurring: false,
    }
}

function ids(tasks: readonly Task[]): string[] {
    return tasks.map((task) => task.id)
}

describe('sortTasks default ordering', () => {
    test('uses the priority-first hierarchy', () => {
        const tasks = [
            makeTask({ id: 'p4' }),
            makeTask({ id: 'p1', priority: 4 }),
            makeTask({ id: 'p3', priority: 2 }),
        ]

        expect(ids(sortTasks(tasks, { defaultOrder: 'PRIORITY_FIRST' }))).toEqual([
            'p1',
            'p3',
            'p4',
        ])
    })

    test('breaks priority ties by due date, deadline, project, and child order', () => {
        const tasks = [
            makeTask({ id: 'project2', projectId: 'project2', childOrder: 0 }),
            makeTask({ id: 'second-child', childOrder: 2 }),
            makeTask({ id: 'first-child', childOrder: 1 }),
            makeTask({ id: 'deadline', deadline: { date: '2026-03-01', lang: 'en' } }),
            makeTask({ id: 'later', due: due('2026-02-02') }),
            makeTask({ id: 'sooner', due: due('2026-02-01') }),
        ]
        const projectOrder = new Map([
            ['project1', 0],
            ['project2', 1],
        ])

        expect(ids(sortTasks(tasks, { defaultOrder: 'PRIORITY_FIRST' }, { projectOrder }))).toEqual(
            ['sooner', 'later', 'deadline', 'first-child', 'second-child', 'project2'],
        )
    })

    test('uses the date-first hierarchy', () => {
        const tasks = [
            makeTask({ id: 'p1-later', priority: 4, due: due('2026-02-02') }),
            makeTask({ id: 'p4-sooner', due: due('2026-02-01') }),
        ]

        expect(ids(sortTasks(tasks, { defaultOrder: 'DATE_FIRST' }))).toEqual([
            'p4-sooner',
            'p1-later',
        ])
    })

    test('uses deadline as the date-first schedule when due is absent', () => {
        const tasks = [
            makeTask({ id: 'due-later', due: due('2026-02-03') }),
            makeTask({ id: 'deadline-sooner', deadline: { date: '2026-02-01', lang: 'en' } }),
        ]

        expect(ids(sortTasks(tasks, { defaultOrder: 'DATE_FIRST' }))).toEqual([
            'deadline-sooner',
            'due-later',
        ])
    })

    test('uses dayOrder rather than childOrder for the date-first manual criterion', () => {
        const tasks = [
            makeTask({ id: 'day-second', dayOrder: 2, childOrder: 0 }),
            makeTask({ id: 'day-first', dayOrder: 1, childOrder: 100 }),
        ]

        expect(ids(sortTasks(tasks, { defaultOrder: 'DATE_FIRST' }))).toEqual([
            'day-first',
            'day-second',
        ])
    })

    test('uses creation time after equal date-first criteria', () => {
        const tasks = [
            makeTask({ id: 'newer', addedAt: new Date('2026-01-02T00:00:00Z') }),
            makeTask({ id: 'older', addedAt: new Date('2026-01-01T00:00:00Z') }),
        ]

        expect(ids(sortTasks(tasks, { defaultOrder: 'DATE_FIRST' }))).toEqual(['older', 'newer'])
    })
})

describe('sortTasks named sorting', () => {
    test('uses the field default direction', () => {
        const tasks = [
            makeTask({ id: 'p4' }),
            makeTask({ id: 'p1', priority: 4 }),
            makeTask({ id: 'p3', priority: 2 }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'PRIORITY',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['p1', 'p3', 'p4'])
    })

    test('sorts priority in both directions', () => {
        const tasks = [
            makeTask({ id: 'p3', priority: 2 }),
            makeTask({ id: 'p1', priority: 4 }),
            makeTask({ id: 'p4' }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'PRIORITY',
                    sortOrder: 'ASC',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['p4', 'p3', 'p1'])
        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'PRIORITY',
                    sortOrder: 'DESC',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['p1', 'p3', 'p4'])
    })

    test('sorts names case-insensitively and with numeric awareness', () => {
        const tasks = [
            makeTask({ id: 'ten', content: 'Task 10' }),
            makeTask({ id: 'alpha', content: 'alpha' }),
            makeTask({ id: 'two', content: 'task 2' }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'ALPHABETICALLY',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['alpha', 'two', 'ten'])
    })

    test('sorts by due date, deadline, and added date', () => {
        const tasks = [
            makeTask({
                id: 'third',
                due: due('2026-03-01'),
                deadline: { date: '2026-06-01', lang: 'en' },
                addedAt: new Date('2026-01-03T00:00:00Z'),
            }),
            makeTask({
                id: 'first',
                due: due('2026-01-01'),
                deadline: { date: '2026-04-01', lang: 'en' },
                addedAt: new Date('2026-01-01T00:00:00Z'),
            }),
            makeTask({
                id: 'second',
                due: due('2026-02-01'),
                deadline: { date: '2026-05-01', lang: 'en' },
                addedAt: new Date('2026-01-02T00:00:00Z'),
            }),
        ]

        for (const sortedBy of ['DUE_DATE', 'DEADLINE', 'ADDED_DATE'] as const) {
            expect(ids(sortTasks(tasks, { sortedBy, defaultOrder: 'PRIORITY_FIRST' }))).toEqual([
                'first',
                'second',
                'third',
            ])
        }
    })

    test('sorts by supplied project and workspace ranks', () => {
        const tasks = [
            makeTask({ id: 'third', projectId: 'project3' }),
            makeTask({ id: 'first', projectId: 'project1' }),
            makeTask({ id: 'second', projectId: 'project2' }),
        ]
        const context = {
            projectOrder: new Map([
                ['project1', 0],
                ['project2', 1],
                ['project3', 2],
            ]),
            workspaceOrder: new Map([
                ['project1', 0],
                ['project2', 1],
                ['project3', 2],
            ]),
        }

        for (const sortedBy of ['PROJECT', 'WORKSPACE'] as const) {
            expect(
                ids(sortTasks(tasks, { sortedBy, defaultOrder: 'PRIORITY_FIRST' }, context)),
            ).toEqual(['first', 'second', 'third'])
        }
    })

    test('sorts assignees in both directions and reverses missing placement', () => {
        const tasks = [
            makeTask({ id: 'unassigned' }),
            makeTask({ id: 'zoe', responsibleUid: 'user-z' }),
            makeTask({ id: 'ana', responsibleUid: 'user-a' }),
        ]
        const names = new Map([
            ['user-a', 'Ana'],
            ['user-z', 'Zoe'],
        ])
        const context = {
            assigneeName: (task: Task) =>
                task.responsibleUid ? names.get(task.responsibleUid) : null,
        }

        expect(
            ids(
                sortTasks(tasks, { sortedBy: 'ASSIGNEE', defaultOrder: 'PRIORITY_FIRST' }, context),
            ),
        ).toEqual(['ana', 'zoe', 'unassigned'])
        expect(
            ids(
                sortTasks(
                    tasks,
                    {
                        sortedBy: 'ASSIGNEE',
                        sortOrder: 'DESC',
                        defaultOrder: 'PRIORITY_FIRST',
                    },
                    context,
                ),
            ),
        ).toEqual(['unassigned', 'zoe', 'ana'])
    })

    test('reverses only the named primary criterion', () => {
        const tasks = [
            makeTask({ id: 'b-p4', content: 'Beta' }),
            makeTask({ id: 'a-p1', content: 'Alpha', priority: 4 }),
            makeTask({ id: 'a-p4', content: 'Alpha' }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'ALPHABETICALLY',
                    sortOrder: 'DESC',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['b-p4', 'a-p1', 'a-p4'])
    })

    test.each([undefined, null, 'MANUAL' as const])(
        'uses the default hierarchy for %s sorting',
        (sortedBy) => {
            const tasks = [makeTask({ id: 'p4' }), makeTask({ id: 'p1', priority: 4 })]
            expect(ids(sortTasks(tasks, { sortedBy, defaultOrder: 'PRIORITY_FIRST' }))).toEqual([
                'p1',
                'p4',
            ])
        },
    )
})

describe('sortTasks date handling', () => {
    test('sorts all-day tasks before timed tasks on the same day', () => {
        const tasks = [
            makeTask({ id: 'timed', due: due('2026-02-01T00:00:00') }),
            makeTask({ id: 'all-day', due: due('2026-02-01') }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'DUE_DATE',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['all-day', 'timed'])
    })

    test('compares floating, Z, offset, and IANA-tagged fixed times in the account timezone', () => {
        const tasks = [
            makeTask({ id: 'floating-9', due: due('2026-02-01T09:00:00') }),
            makeTask({ id: 'fixed-10', due: due('2026-02-01T15:00:00Z', 'America/Chicago') }),
            makeTask({ id: 'offset-8', due: due('2026-02-01T13:00:00+00:00') }),
            makeTask({ id: 'all-day', due: due('2026-02-01') }),
        ]

        expect(
            ids(
                sortTasks(
                    tasks,
                    { sortedBy: 'DUE_DATE', defaultOrder: 'PRIORITY_FIRST' },
                    { timezone: 'America/New_York' },
                ),
            ),
        ).toEqual(['all-day', 'offset-8', 'floating-9', 'fixed-10'])
    })

    test('uses UTC when no account timezone is supplied', () => {
        const tasks = [
            makeTask({ id: 'floating-9', due: due('2026-02-01T09:00:00') }),
            makeTask({ id: 'fixed-8', due: due('2026-02-01T08:00:00Z', 'Europe/London') }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'DUE_DATE',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['fixed-8', 'floating-9'])
    })

    test('treats invalid dates as missing without throwing', () => {
        const tasks = [
            makeTask({ id: 'invalid', due: due('not-a-date') }),
            makeTask({ id: 'invalid-fixed', due: due('2026-02-31T09:00:00Z') }),
            makeTask({ id: 'valid', due: due('2026-02-01') }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'DUE_DATE',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['valid', 'invalid', 'invalid-fixed'])
        expect(() =>
            sortTasks(
                tasks,
                { sortedBy: 'DUE_DATE', defaultOrder: 'PRIORITY_FIRST' },
                { timezone: 'Invalid/Timezone' },
            ),
        ).not.toThrow()
    })

    test('moves missing dates to the front when descending', () => {
        const tasks = [
            makeTask({ id: 'missing' }),
            makeTask({ id: 'dated', due: due('2026-02-01') }),
        ]

        expect(
            ids(
                sortTasks(tasks, {
                    sortedBy: 'DUE_DATE',
                    sortOrder: 'DESC',
                    defaultOrder: 'PRIORITY_FIRST',
                }),
            ),
        ).toEqual(['missing', 'dated'])
    })
})

describe('sortTasks input and fallback behavior', () => {
    test('does not mutate the input', () => {
        const tasks = [makeTask({ id: 'p4' }), makeTask({ id: 'p1', priority: 4 })]
        const sorted = sortTasks(tasks, { defaultOrder: 'PRIORITY_FIRST' })

        expect(ids(tasks)).toEqual(['p4', 'p1'])
        expect(sorted).not.toBe(tasks)
    })

    test('returns new arrays for empty and single-item inputs', () => {
        const empty: Task[] = []
        const one = [makeTask({ id: 'one' })]

        expect(sortTasks(empty, { defaultOrder: 'PRIORITY_FIRST' })).not.toBe(empty)
        expect(sortTasks(one, { defaultOrder: 'PRIORITY_FIRST' })).not.toBe(one)
    })

    test('preserves stable order and duplicate occurrences when comparisons tie', () => {
        const duplicate = makeTask({ id: 'duplicate' })
        const other = makeTask({ id: 'other' })
        const tasks = [duplicate, other, duplicate]

        const result = sortTasks(tasks, { defaultOrder: 'PRIORITY_FIRST' })

        expect(result).toEqual(tasks)
        expect(result[0]).toBe(result[2])
    })

    test('does not compare childOrder across projects when project ranks are absent', () => {
        const tasks = [
            makeTask({ id: 'first', projectId: 'project1', childOrder: 100 }),
            makeTask({ id: 'second', projectId: 'project2', childOrder: 0 }),
        ]

        expect(ids(sortTasks(tasks, { defaultOrder: 'PRIORITY_FIRST' }))).toEqual([
            'first',
            'second',
        ])
    })

    test('does not throw when optional context is absent', () => {
        const tasks = [makeTask({ id: 'second' }), makeTask({ id: 'first' })]

        for (const sortedBy of ['PROJECT', 'WORKSPACE', 'ASSIGNEE'] as const) {
            expect(() =>
                sortTasks(tasks, { sortedBy, defaultOrder: 'PRIORITY_FIRST' }),
            ).not.toThrow()
        }
    })
})
