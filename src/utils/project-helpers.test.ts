import { DEFAULT_PROJECT, DEFAULT_WORKSPACE_PROJECT } from '../test-utils/test-defaults'
import { countsTowardsPersonalProjectLimit } from './project-helpers'

describe('countsTowardsPersonalProjectLimit', () => {
    test.each([
        { kind: 'an active personal project', project: { ...DEFAULT_PROJECT, parentId: null } },
        { kind: 'a shared personal project', project: { ...DEFAULT_PROJECT, isShared: true } },
        { kind: 'a sub-project', project: { ...DEFAULT_PROJECT, parentId: 'parent' } },
    ])('counts $kind', ({ project }) => {
        expect(countsTowardsPersonalProjectLimit(project)).toBe(true)
    })

    test.each([
        { kind: 'the Inbox', project: { ...DEFAULT_PROJECT, inboxProject: true } },
        { kind: 'an archived project', project: { ...DEFAULT_PROJECT, isArchived: true } },
        { kind: 'a deleted project', project: { ...DEFAULT_PROJECT, isDeleted: true } },
        { kind: 'a workspace project', project: DEFAULT_WORKSPACE_PROJECT },
    ])('does not count $kind', ({ project }) => {
        expect(countsTowardsPersonalProjectLimit(project)).toBe(false)
    })
})
