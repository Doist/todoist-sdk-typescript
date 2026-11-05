import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { branchBase, defaultBranchRef } from './git.ts'
import { createTempRepo, type TempRepo } from './test-repo.ts'

// The base verify measures a branch against, in a throwaway repo with a local bare remote.
let repo: TempRepo
let initial: string

beforeEach(() => {
    repo = createTempRepo()
    repo.write('a.txt', 'a\n')
    repo.git(['add', '.'])
    repo.git(['commit', '--quiet', '-m', 'initial'])
    initial = repo.git(['rev-parse', 'HEAD']).stdout.trim()
})

afterEach(() => repo.cleanup())

function addRemote(): void {
    const remote = join(repo.dir, '.remote.git')
    repo.git(['init', '--quiet', '--bare', remote])
    repo.git(['remote', 'add', 'origin', remote])
    repo.git(['push', '--quiet', 'origin', 'main'])
}

describe('defaultBranchRef', () => {
    it("takes origin's default branch from origin/HEAD", () => {
        addRemote()
        repo.git(['push', '--quiet', 'origin', 'HEAD:trunk'])
        repo.git(['fetch', '--quiet', 'origin'])
        repo.git(['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk'])
        expect(defaultBranchRef(repo.dir)).toBe('refs/remotes/origin/trunk')
    })

    it('falls back to origin/main without origin/HEAD', () => {
        addRemote()
        expect(defaultBranchRef(repo.dir)).toBe('refs/remotes/origin/main')
    })

    it('falls back to a local main without a remote', () => {
        expect(defaultBranchRef(repo.dir)).toBe('refs/heads/main')
    })

    it('finds none without a remote or a local main', () => {
        repo.git(['branch', '--quiet', '-m', 'main', 'trunk'])
        expect(defaultBranchRef(repo.dir)).toBeUndefined()
    })
})

describe('branchBase', () => {
    it('is where the branch left the default branch', () => {
        repo.git(['switch', '--quiet', '-c', 'feature'])
        repo.write('b.txt', 'b\n')
        repo.git(['add', '.'])
        repo.git(['commit', '--quiet', '-m', 'feature'])
        repo.git(['switch', '--quiet', 'main'])
        repo.write('c.txt', 'c\n')
        repo.git(['add', '.'])
        repo.git(['commit', '--quiet', '-m', 'main moved on'])
        repo.git(['switch', '--quiet', 'feature'])
        expect(branchBase(repo.dir)).toBe(initial)
    })

    it('is undefined without a default branch', () => {
        repo.git(['branch', '--quiet', '-m', 'main', 'trunk'])
        expect(branchBase(repo.dir)).toBeUndefined()
    })
})
