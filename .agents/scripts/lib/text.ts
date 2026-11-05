/** The first `max` items, then how many more there are: "a, b and 3 more". */
export function listSome(items: string[], max: number): string {
    const shown = items.slice(0, max).join(', ')
    return items.length > max ? `${shown} and ${items.length - max} more` : shown
}
