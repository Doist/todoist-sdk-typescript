import { ZodError } from 'zod'
import {
    DEFAULT_TASK,
    INVALID_TASK,
    DEFAULT_PROJECT,
    INVALID_PROJECT,
    DEFAULT_SECTION,
    INVALID_SECTION,
    DEFAULT_LABEL,
    INVALID_LABEL,
    DEFAULT_COMMENT,
    INVALID_COMMENT,
    DEFAULT_USER,
    INVALID_USER,
    DEFAULT_RAW_COMMENT,
    DEFAULT_WORKSPACE_PROJECT,
} from '../test-utils/test-defaults'
import {
    IdSchema,
    validateTask,
    validateTaskArray,
    validateProject,
    validateProjectArray,
    validateWorkspaceProject,
    validateWorkspaceProjectArray,
    validateSection,
    validateSectionArray,
    validateLabel,
    validateLabelArray,
    validateComment,
    validateCommentArray,
    validateUser,
    validateUserArray,
} from './validators'

describe('validators', () => {
    describe('validateTask', () => {
        test('validation passes for a valid task', () => {
            const result = validateTask(DEFAULT_TASK)
            expect(result).toEqual(DEFAULT_TASK)
        })

        test('validation throws error for an invalid task', () => {
            expect(() => {
                validateTask(INVALID_TASK)
            }).toThrow(ZodError)
        })
    })

    describe('validateTaskArray', () => {
        test('validation passes for empty array', () => {
            const result = validateTaskArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid task array', () => {
            const result = validateTaskArray([DEFAULT_TASK])
            expect(result).toEqual([DEFAULT_TASK])
        })

        test('validation throws error for an invalid task array ', () => {
            expect(() => {
                validateTaskArray([INVALID_TASK])
            }).toThrow(ZodError)
        })
    })

    describe('validateProject', () => {
        test('validation passes for a valid project', () => {
            const result = validateProject(DEFAULT_PROJECT)
            expect(result).toEqual(DEFAULT_PROJECT)
        })

        test('validation throws error for an invalid project', () => {
            expect(() => {
                validateProject(INVALID_PROJECT)
            }).toThrow(ZodError)
        })
    })

    describe('validateProjectArray', () => {
        test('validation passes for empty array', () => {
            const result = validateProjectArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid project array', () => {
            const result = validateProjectArray([DEFAULT_PROJECT])
            expect(result).toEqual([DEFAULT_PROJECT])
        })

        test('validation throws error for an invalid project array ', () => {
            expect(() => {
                validateProjectArray([INVALID_PROJECT])
            }).toThrow(ZodError)
        })
    })

    describe('validateWorkspaceProject', () => {
        test('validation passes for a valid workspace project', () => {
            const result = validateWorkspaceProject(DEFAULT_WORKSPACE_PROJECT)
            expect(result).toEqual(DEFAULT_WORKSPACE_PROJECT)
        })

        test('validation throws error for an invalid workspace project', () => {
            expect(() => {
                validateWorkspaceProject(INVALID_PROJECT)
            }).toThrow(ZodError)
        })
    })

    describe('validateWorkspaceProjectArray', () => {
        test('validation passes for empty array', () => {
            const result = validateWorkspaceProjectArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid workspace project array', () => {
            const result = validateWorkspaceProjectArray([DEFAULT_WORKSPACE_PROJECT])
            expect(result).toEqual([DEFAULT_WORKSPACE_PROJECT])
        })

        test('validation throws error for an invalid workspace project array', () => {
            expect(() => {
                validateWorkspaceProjectArray([INVALID_PROJECT])
            }).toThrow(ZodError)
        })
    })

    describe('validateSection', () => {
        test('validation passes for a valid section', () => {
            const result = validateSection(DEFAULT_SECTION)
            expect(result).toEqual(DEFAULT_SECTION)
        })

        test('validation throws error for an invalid section', () => {
            expect(() => {
                validateSection(INVALID_SECTION)
            }).toThrow(ZodError)
        })
    })

    describe('validateSectionArray', () => {
        test('validation passes for empty array', () => {
            const result = validateSectionArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid section array', () => {
            const result = validateSectionArray([DEFAULT_SECTION])
            expect(result).toEqual([DEFAULT_SECTION])
        })

        test('validation throws error for an invalid section array ', () => {
            expect(() => {
                validateSectionArray([INVALID_SECTION])
            }).toThrow(ZodError)
        })
    })

    describe('validateLabel', () => {
        test('validation passes for a valid label', () => {
            const result = validateLabel(DEFAULT_LABEL)
            expect(result).toEqual(DEFAULT_LABEL)
        })

        test('validation throws error for an invalid label', () => {
            expect(() => {
                validateLabel(INVALID_LABEL)
            }).toThrow(ZodError)
        })
    })

    describe('validateLabelArray', () => {
        test('validation passes for empty array', () => {
            const result = validateLabelArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid label array', () => {
            const result = validateLabelArray([DEFAULT_LABEL])
            expect(result).toEqual([DEFAULT_LABEL])
        })

        test('validation throws error for an invalid label array ', () => {
            expect(() => {
                validateLabelArray([INVALID_LABEL])
            }).toThrow(ZodError)
        })
    })

    describe('validateComment', () => {
        test('validation passes for a valid comment', () => {
            const result = validateComment(DEFAULT_RAW_COMMENT)
            expect(result).toEqual(DEFAULT_COMMENT)
        })

        test('validation throws error for an invalid comment', () => {
            expect(() => {
                validateComment(INVALID_COMMENT)
            }).toThrow(ZodError)
        })
    })

    describe('validateCommentArray', () => {
        test('validation passes for empty array', () => {
            const result = validateCommentArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid comment array', () => {
            const result = validateCommentArray([DEFAULT_RAW_COMMENT])
            expect(result).toEqual([DEFAULT_COMMENT])
        })

        test('validation throws error for an invalid comment array ', () => {
            expect(() => {
                validateCommentArray([INVALID_COMMENT])
            }).toThrow(ZodError)
        })
    })

    describe('validateUser', () => {
        test('validation passes for a valid user', () => {
            const result = validateUser(DEFAULT_USER)
            expect(result).toEqual(DEFAULT_USER)
        })

        test('validation throws error for an invalid user', () => {
            expect(() => {
                validateUser(INVALID_USER)
            }).toThrow(ZodError)
        })
    })

    describe('validateUserArray', () => {
        test('validation passes for empty array', () => {
            const result = validateUserArray([])
            expect(result).toEqual([])
        })

        test('validation passes for valid user array', () => {
            const result = validateUserArray([DEFAULT_USER])
            expect(result).toEqual([DEFAULT_USER])
        })

        test('validation throws error for an invalid user array ', () => {
            expect(() => {
                validateUserArray([INVALID_USER])
            }).toThrow(ZodError)
        })
    })

    describe('IdSchema', () => {
        test('passes for a plain non-empty ID', () => {
            const result = IdSchema.parse('6X4Vw2Hq9J3mC8kF')
            expect(result).toBe('6X4Vw2Hq9J3mC8kF')
        })

        test('throws ZodError for an empty string', () => {
            expect(() => IdSchema.parse('')).toThrow(ZodError)
        })

        test('throws ZodError for a tmp- prefixed ID', () => {
            expect(() => IdSchema.parse('tmp-abc-123')).toThrow(ZodError)
        })

        test('tmp- rejection surfaces the client-side placeholder guidance', () => {
            expect(() => IdSchema.parse('tmp-abc-123')).toThrow(/client-side placeholder/)
        })
    })
})
