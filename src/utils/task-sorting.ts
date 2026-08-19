import type { SortOrder, SortedBy } from '../types/sync'
import type { Task } from '../types/tasks'

/** Todoist's default task-ordering hierarchies. */
export const DEFAULT_TASK_ORDERS = ['PRIORITY_FIRST', 'DATE_FIRST'] as const
/** Default hierarchy used when a view has no named sorting. */
export type DefaultTaskOrder = (typeof DEFAULT_TASK_ORDERS)[number]

export type TaskSortOptions = {
    /** Saved or requested sort field. Null and MANUAL use defaultOrder. */
    sortedBy?: SortedBy | null
    /** Saved or requested direction. Defaults by field when absent. */
    sortOrder?: SortOrder | null
    /** Default hierarchy for this view or filter query. */
    defaultOrder: DefaultTaskOrder
}

export type TaskSortContext = {
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
const DATE_TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

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

function parseDateTimeComponents(value: string): DateComponents | null {
    const match = DATE_TIME_PATTERN.exec(value)
    if (!match) return null
    const milliseconds = Number((match[7] ?? '').padEnd(3, '0').slice(0, 3))
    const components = {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6] ?? 0),
        millisecond: milliseconds,
    }
    return dateSortValue(components) === null ? null : components
}

function createDateTimeFormatter(
    timezone: string,
    fallback?: Intl.DateTimeFormat,
): Intl.DateTimeFormat {
    const cached = DATE_TIME_FORMATTERS.get(timezone)
    if (cached) return cached

    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
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
        DATE_TIME_FORMATTERS.set(timezone, formatter)
        return formatter
    } catch {
        return fallback ?? createDateTimeFormatter(DEFAULT_TIMEZONE)
    }
}

function componentsAt(timestamp: number, formatter: Intl.DateTimeFormat): DateComponents {
    const parts = formatter.formatToParts(new Date(timestamp))
    function part(type: Intl.DateTimeFormatPartTypes): number {
        return Number(parts.find((entry) => entry.type === type)?.value)
    }

    return {
        year: part('year'),
        month: part('month'),
        day: part('day'),
        hour: part('hour'),
        minute: part('minute'),
        second: part('second'),
        millisecond: new Date(timestamp).getUTCMilliseconds(),
    }
}

function componentsAsUtcTimestamp({
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
}: DateComponents): number {
    const date = new Date(0)
    date.setUTCFullYear(year, month - 1, day)
    date.setUTCHours(hour, minute, second, millisecond)
    return date.getTime()
}

/** Resolves a zoned wall clock to an instant, including daylight-saving offsets. */
function timestampForWallClock(
    components: DateComponents,
    formatter: Intl.DateTimeFormat,
): number | null {
    const target = componentsAsUtcTimestamp(components)
    let timestamp = target

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const adjustment = target - componentsAsUtcTimestamp(componentsAt(timestamp, formatter))
        if (adjustment === 0) return timestamp
        timestamp += adjustment
    }

    return null
}

function dateSortValueAt(timestamp: number, formatter: Intl.DateTimeFormat): DateSortValue | null {
    const value = dateSortValue(componentsAt(timestamp, formatter))
    return value ? { ...value, time: timestamp } : null
}

function parseFixedDateTime(value: string, formatter: Intl.DateTimeFormat): DateSortValue | null {
    if (parseDateTimeComponents(value.replace(EXPLICIT_TIMEZONE_PATTERN, '')) === null) return null

    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? null : dateSortValueAt(timestamp, formatter)
}

function parseZonedFloatingDateTime(
    value: string,
    sourceFormatter: Intl.DateTimeFormat,
    accountFormatter: Intl.DateTimeFormat,
): DateSortValue | null {
    const components = parseDateTimeComponents(value)
    if (!components) return null

    const timestamp = timestampForWallClock(components, sourceFormatter)
    return timestamp === null ? null : dateSortValueAt(timestamp, accountFormatter)
}

function parseTaskDate(
    value: string,
    formatter: Intl.DateTimeFormat,
    timezone?: string | null,
): DateSortValue | null {
    return (
        parseDateOnly(value) ??
        (EXPLICIT_TIMEZONE_PATTERN.test(value)
            ? parseFixedDateTime(value, formatter)
            : parseZonedFloatingDateTime(
                  value,
                  timezone ? createDateTimeFormatter(timezone, formatter) : formatter,
                  formatter,
              ))
    )
}

function compareNullable<T>(
    a: T | null,
    b: T | null,
    compare: (left: T, right: T) => number,
): number {
    if (a === null || b === null) {
        if (a === b) return 0
        return a === null ? 1 : -1
    }
    return compare(a, b)
}

function compareDateValues(left: DateSortValue, right: DateSortValue): number {
    return (
        compareNumber(left.day, right.day) ||
        compareNumber(left.kind, right.kind) ||
        compareNumber(left.time, right.time)
    )
}

function compareDate(a: DateSortValue | null, b: DateSortValue | null): number {
    return compareNullable(a, b, compareDateValues)
}

function compareOptionalNumber(a: number | null, b: number | null): number {
    return compareNullable(a, b, compareNumber)
}

function compareOptionalText(a: string | null, b: string | null, collator: Intl.Collator): number {
    return compareNullable(a, b, (left, right) => collator.compare(left, right))
}

function prepareTasks(
    tasks: readonly Task[],
    context: TaskSortContext,
    { formatter, resolveAssignee }: { formatter: Intl.DateTimeFormat; resolveAssignee: boolean },
): PreparedTask[] {
    return tasks.map((task, index) => {
        const due = task.due
            ? parseTaskDate(task.due.datetime ?? task.due.date, formatter, task.due.timezone)
            : null
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
            assignee: resolveAssignee ? (context.assigneeName?.(task) ?? null) : null,
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

    if (a.task.projectId === b.task.projectId) {
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
    const sortedBy = options.sortedBy
    const prepared = prepareTasks(tasks, context, {
        formatter,
        resolveAssignee: sortedBy === 'ASSIGNEE',
    })
    const direction =
        sortedBy && sortedBy !== 'MANUAL' ? (options.sortOrder ?? defaultSortOrder(sortedBy)) : null
    const directionMultiplier = direction === 'DESC' ? -1 : 1

    return prepared
        .sort((a, b) => {
            if (sortedBy && sortedBy !== 'MANUAL') {
                const primary = comparePrimary({ sortedBy, a, b, collator }) * directionMultiplier
                if (primary !== 0) return primary
            }

            return compareDefault(a, b, options.defaultOrder) || compareNumber(a.index, b.index)
        })
        .map(({ task }) => task)
}
