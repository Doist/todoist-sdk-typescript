import type { SortOrder, SortedBy } from '../types/sync'
import type { Task } from '../types/tasks'

/** Todoist's default task-ordering hierarchies. */
export const DEFAULT_TASK_ORDERS = ['PRIORITY_FIRST', 'DATE_FIRST'] as const
/** Default hierarchy used when a view has no named sorting. */
export type DefaultTaskOrder = (typeof DEFAULT_TASK_ORDERS)[number]

export interface TaskSortOptions {
    /** Saved or requested sort field. Null and MANUAL use defaultOrder. */
    sortedBy?: SortedBy | null
    /** Saved or requested direction. Defaults by field when absent. */
    sortOrder?: SortOrder | null
    /** Default hierarchy for this view or filter query. */
    defaultOrder: DefaultTaskOrder
}

export interface TaskSortContext {
    /** Project ID to its visible order. */
    projectOrder?: ReadonlyMap<string, number>
    /** Project ID to the visible order of its workspace bucket. */
    workspaceOrder?: ReadonlyMap<string, number>
    /** Resolves the display name used for assignee sorting. */
    assigneeName?: (task: Task) => string | null | undefined
    /** Account IANA timezone. Defaults to UTC for deterministic behavior. */
    timezone?: string
    /** Locale used for text comparisons. Defaults to English. */
    locale?: string | readonly string[]
}

type DateSortValue = {
    day: number
    kind: number
    time: number
}

type DateComponents = {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
    millisecond?: number
    isAllDay?: boolean
}

type PreparedTask = {
    task: Task
    index: number
    due: DateSortValue | null
    deadline: DateSortValue | null
    schedule: DateSortValue | null
    added: number | null
    project: number | null
    workspace: number | null
    assignee: string | null
}

const DEFAULT_TIMEZONE = 'UTC'
const DEFAULT_LOCALE = 'en'
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/
const EXPLICIT_TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i

function compareNumber(a: number, b: number): number {
    if (a === b) return 0
    return a < b ? -1 : 1
}

function isValidDateParts(year: number, month: number, day: number): boolean {
    const date = new Date(0)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCFullYear(year, month - 1, day)
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    )
}

function dateSortValue({
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
    isAllDay = false,
}: DateComponents): DateSortValue | null {
    if (
        !isValidDateParts(year, month, day) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59 ||
        millisecond < 0 ||
        millisecond > 999
    ) {
        return null
    }

    return {
        day: year * 10_000 + month * 100 + day,
        kind: isAllDay ? 0 : 1,
        time: ((hour * 60 + minute) * 60 + second) * 1_000 + millisecond,
    }
}

function parseDateOnly(value: string): DateSortValue | null {
    const match = DATE_ONLY_PATTERN.exec(value)
    if (!match) return null
    return dateSortValue({
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        isAllDay: true,
    })
}

function parseFloatingDateTime(value: string): DateSortValue | null {
    const match = DATE_TIME_PATTERN.exec(value)
    if (!match) return null
    const milliseconds = Number((match[7] ?? '').padEnd(3, '0').slice(0, 3))
    return dateSortValue({
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6] ?? 0),
        millisecond: milliseconds,
    })
}

function createDateTimeFormatter(timezone: string): Intl.DateTimeFormat {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            calendar: 'iso8601',
            numberingSystem: 'latn',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        })
    } catch {
        return createDateTimeFormatter(DEFAULT_TIMEZONE)
    }
}

function parseFixedDateTime(value: string, formatter: Intl.DateTimeFormat): DateSortValue | null {
    if (parseFloatingDateTime(value.replace(EXPLICIT_TIMEZONE_PATTERN, '')) === null) return null

    const timestamp = Date.parse(value)
    if (Number.isNaN(timestamp)) return null

    const parts = formatter.formatToParts(new Date(timestamp))
    function part(type: Intl.DateTimeFormatPartTypes): number {
        return Number(parts.find((entry) => entry.type === type)?.value)
    }

    return dateSortValue({
        year: part('year'),
        month: part('month'),
        day: part('day'),
        hour: part('hour'),
        minute: part('minute'),
        second: part('second'),
        millisecond: new Date(timestamp).getUTCMilliseconds(),
    })
}

function parseTaskDate(value: string, formatter: Intl.DateTimeFormat): DateSortValue | null {
    return (
        parseDateOnly(value) ??
        (EXPLICIT_TIMEZONE_PATTERN.test(value)
            ? parseFixedDateTime(value, formatter)
            : parseFloatingDateTime(value))
    )
}

function compareDate(a: DateSortValue | null, b: DateSortValue | null): number {
    if (a === null || b === null) {
        if (a === b) return 0
        return a === null ? 1 : -1
    }
    return (
        compareNumber(a.day, b.day) ||
        compareNumber(a.kind, b.kind) ||
        compareNumber(a.time, b.time)
    )
}

function compareOptionalNumber(a: number | null, b: number | null): number {
    if (a === null || b === null) {
        if (a === b) return 0
        return a === null ? 1 : -1
    }
    return compareNumber(a, b)
}

function compareOptionalText(a: string | null, b: string | null, collator: Intl.Collator): number {
    if (a === null || b === null) {
        if (a === b) return 0
        return a === null ? 1 : -1
    }
    return collator.compare(a, b)
}

function prepareTasks(
    tasks: readonly Task[],
    context: TaskSortContext,
    formatter: Intl.DateTimeFormat,
): PreparedTask[] {
    return tasks.map((task, index) => {
        const due = task.due ? parseTaskDate(task.due.datetime ?? task.due.date, formatter) : null
        const deadline = task.deadline ? parseTaskDate(task.deadline.date, formatter) : null

        return {
            task,
            index,
            due,
            deadline,
            schedule: due ?? deadline,
            added:
                task.addedAt && !Number.isNaN(task.addedAt.getTime())
                    ? task.addedAt.getTime()
                    : null,
            project: context.projectOrder?.get(task.projectId) ?? null,
            workspace: context.workspaceOrder?.get(task.projectId) ?? null,
            assignee: context.assigneeName?.(task) ?? null,
        }
    })
}

function comparePriorityFirst(a: PreparedTask, b: PreparedTask): number {
    const common =
        compareNumber(b.task.priority, a.task.priority) ||
        compareDate(a.due, b.due) ||
        compareDate(a.deadline, b.deadline)
    if (common !== 0) return common

    const project = compareOptionalNumber(a.project, b.project)
    if (project !== 0) return project

    if (a.project !== null && b.project !== null) {
        return compareNumber(a.task.childOrder, b.task.childOrder)
    }
    return 0
}

function compareDateFirst(a: PreparedTask, b: PreparedTask): number {
    return (
        compareDate(a.schedule, b.schedule) ||
        compareNumber(b.task.priority, a.task.priority) ||
        compareDate(a.deadline, b.deadline) ||
        compareNumber(a.task.dayOrder, b.task.dayOrder) ||
        compareOptionalNumber(a.added, b.added)
    )
}

function compareDefault(a: PreparedTask, b: PreparedTask, defaultOrder: DefaultTaskOrder): number {
    return defaultOrder === 'DATE_FIRST' ? compareDateFirst(a, b) : comparePriorityFirst(a, b)
}

function comparePrimary({
    sortedBy,
    a,
    b,
    collator,
}: {
    sortedBy: SortedBy
    a: PreparedTask
    b: PreparedTask
    collator: Intl.Collator
}): number {
    switch (sortedBy) {
        case 'ALPHABETICALLY':
            return collator.compare(a.task.content, b.task.content)
        case 'ASSIGNEE':
            return compareOptionalText(a.assignee, b.assignee, collator)
        case 'DUE_DATE':
            return compareDate(a.due, b.due)
        case 'DEADLINE':
            return compareDate(a.deadline, b.deadline)
        case 'ADDED_DATE':
            return compareOptionalNumber(a.added, b.added)
        case 'PRIORITY':
            return compareNumber(a.task.priority, b.task.priority)
        case 'PROJECT':
            return compareOptionalNumber(a.project, b.project)
        case 'WORKSPACE':
            return compareOptionalNumber(a.workspace, b.workspace)
        case 'MANUAL':
            return 0
    }
}

function defaultSortOrder(sortedBy: SortedBy): SortOrder {
    return sortedBy === 'PRIORITY' ? 'DESC' : 'ASC'
}

/**
 * Sorts the supplied tasks using Todoist view-ordering rules.
 *
 * The function performs no I/O and always returns a new array. Exact project,
 * workspace, assignee, localized text, and due-time ordering requires the
 * corresponding context. Callers must sort each independent view section or
 * group separately and preserve any subtask structure they render.
 *
 * This function sorts only the tasks supplied to it. Fetch every page first
 * when globally correct ordering is required for a paginated query.
 */
export function sortTasks(
    tasks: readonly Task[],
    options: TaskSortOptions,
    context: TaskSortContext = {},
): Task[] {
    const locale = Array.isArray(context.locale)
        ? [...context.locale]
        : (context.locale ?? DEFAULT_LOCALE)
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
    const formatter = createDateTimeFormatter(context.timezone ?? DEFAULT_TIMEZONE)
    const prepared = prepareTasks(tasks, context, formatter)
    const sortedBy = options.sortedBy

    return prepared
        .sort((a, b) => {
            if (sortedBy && sortedBy !== 'MANUAL') {
                const direction = options.sortOrder ?? defaultSortOrder(sortedBy)
                const primary =
                    comparePrimary({ sortedBy, a, b, collator }) * (direction === 'DESC' ? -1 : 1)
                if (primary !== 0) return primary
            }

            return compareDefault(a, b, options.defaultOrder) || compareNumber(a.index, b.index)
        })
        .map(({ task }) => task)
}
