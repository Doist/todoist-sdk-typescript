import { describe, expect, it } from 'vitest'
import { safeName } from './state.ts'

describe('safeName', () => {
    it.each([
        ['session-1', 'session-1'],
        ['a.b_c', 'a.b_c'],
        ['../verified', '.._verified'],
        ['a/b\\c', 'a_b_c'],
        ['.', '_'],
        ['..', '__'],
        ['...', '___'],
    ])('makes %j %j', (name, expected) => {
        expect(safeName(name)).toBe(expected)
    })
})
