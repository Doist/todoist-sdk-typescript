import { describe, expect, test } from 'vitest'
import { TodoistArgumentError } from '../types/errors'
import { encodePathSegment, generatePath } from './request-helpers'

describe('encodePathSegment', () => {
    test.each(['6Jf8VQXxpwv56VQ7', '12345', 'sec-1', 'a_b'])('leaves an ID as-is (%s)', (id) => {
        expect(encodePathSegment(id)).toBe(id)
    })

    test.each([
        ['../projects/123', '..%2Fprojects%2F123'],
        ['123?x=1', '123%3Fx%3D1'],
        ['123#frag', '123%23frag'],
        ['%2e%2e', '%252e%252e'],
    ])('encodes characters that would leave the segment (%s)', (input, expected) => {
        expect(encodePathSegment(input)).toBe(expected)
    })

    test('keeps commas literal', () => {
        expect(encodePathSegment('1,2,3')).toBe('1,2,3')
    })

    test.each(['', '.', '..'])('rejects the dot or empty segment "%s"', (segment) => {
        expect(() => encodePathSegment(segment)).toThrow(TodoistArgumentError)
    })
})

describe('generatePath', () => {
    test('joins the endpoint and segments', () => {
        expect(generatePath('tasks', '123', 'close')).toBe('tasks/123/close')
    })

    test('keeps slashes in the endpoint', () => {
        expect(generatePath('workspaces/users', '123')).toBe('workspaces/users/123')
    })

    test('encodes every segment after the endpoint', () => {
        expect(generatePath('tasks', '../projects/123')).toBe('tasks/..%2Fprojects%2F123')
    })

    test('rejects a dot segment', () => {
        expect(() => generatePath('tasks', '..')).toThrow(TodoistArgumentError)
    })
})
