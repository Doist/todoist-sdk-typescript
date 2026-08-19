import type { ViewOptions } from '../types/sync'
import { findViewOptions, isActiveViewOption } from './view-options'

describe('view option utilities', () => {
    const options: ViewOptions[] = [
        { viewType: 'FILTER', objectId: 'filter1', sortedBy: 'DUE_DATE' },
        {
            viewType: 'WORKSPACE_FILTER',
            objectId: 'filter2',
            sortedBy: 'PRIORITY',
        },
        { viewType: 'UPCOMING', objectId: null, sortedBy: 'DEADLINE' },
        { viewType: 'TODAY', isDeleted: true },
    ]

    test('identifies active options and deletion tombstones', () => {
        expect(isActiveViewOption(options[0])).toBe(true)
        expect(isActiveViewOption(options[3])).toBe(false)
    })

    test('matches object-backed views by type and ID', () => {
        expect(
            findViewOptions(options, {
                viewTypes: ['FILTER', 'WORKSPACE_FILTER'],
                objectId: 'filter2',
            })?.sortedBy,
        ).toBe('PRIORITY')
    })

    test('matches singleton views with null or omitted object IDs', () => {
        expect(findViewOptions(options, { viewTypes: ['UPCOMING'] })?.sortedBy).toBe('DEADLINE')
    })

    test('ignores deleted options', () => {
        expect(findViewOptions(options, { viewTypes: ['TODAY'] })).toBeUndefined()
    })
})
