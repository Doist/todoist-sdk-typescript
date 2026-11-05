import { rmSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTempRepo, type TempRepo } from './test-repo.ts'
import { changedPaths, changedSince, classify, codeFingerprint, snapshot } from './tree.ts'

let repo: TempRepo

// A throwaway repository for the suites that read files; classify needs none.
function useRepo(): void {
    beforeEach(() => {
        repo = createTempRepo()
        repo.write('src/a.ts', 'export const a = 1\n')
        repo.write('README.md', 'readme\n')
        repo.write('.gitignore', 'ignored/\n')
        repo.git(['add', '.'])
        repo.git(['commit', '--quiet', '-m', 'initial'])
    })
    afterEach(() => repo.cleanup())
}

function objectCount(): string {
    return repo.git(['count-objects', '-v']).stdout
}

describe('snapshot', () => {
    useRepo()

    it('sees an edit that keeps the size and modification time', () => {
        const before = codeFingerprint(snapshot(repo.dir))
        const file = join(repo.dir, 'src/a.ts')
        repo.write('src/a.ts', 'export const a = 2\n')
        utimesSync(file, new Date(2020, 0, 1), new Date(2020, 0, 1))
        const middle = codeFingerprint(snapshot(repo.dir))
        repo.write('src/a.ts', 'export const a = 3\n')
        utimesSync(file, new Date(2020, 0, 1), new Date(2020, 0, 1))
        const after = codeFingerprint(snapshot(repo.dir))
        expect(new Set([before, middle, after]).size).toBe(3)
    })

    it('includes untracked files and leaves out ignored ones', () => {
        const before = snapshot(repo.dir)
        repo.write('src/new.ts', 'new\n')
        repo.write('ignored/build.js', 'built\n')
        expect(changedPaths(before, snapshot(repo.dir))).toEqual(['src/new.ts'])
    })

    it('sees a deleted tracked file', () => {
        const before = snapshot(repo.dir)
        rmSync(join(repo.dir, 'src/a.ts'))
        expect(changedPaths(before, snapshot(repo.dir))).toEqual(['src/a.ts'])
    })

    it('is the same before and after a deletion is staged', () => {
        rmSync(join(repo.dir, 'src/a.ts'))
        const unstaged = snapshot(repo.dir)
        repo.git(['add', '--all'])
        expect(snapshot(repo.dir)).toEqual(unstaged)
    })

    it('sees an executable bit change', () => {
        const before = codeFingerprint(snapshot(repo.dir))
        repo.run('chmod', ['+x', 'src/a.ts'])
        expect(codeFingerprint(snapshot(repo.dir))).not.toBe(before)
    })

    it('writes nothing to the object store', () => {
        repo.write('src/new.ts', 'new\n')
        const before = objectCount()
        snapshot(repo.dir)
        expect(objectCount()).toBe(before)
    })
})

describe('codeFingerprint', () => {
    useRepo()

    it('ignores docs and files only CI reads, and nothing else', () => {
        const before = codeFingerprint(snapshot(repo.dir))
        repo.write('README.md', 'changed\n')
        repo.write('docs/guide.md', 'new\n')
        repo.write('.github/renovate.json', '{}\n')
        repo.write('website/docs/about.md', 'about\n')
        expect(codeFingerprint(snapshot(repo.dir))).toBe(before)
        repo.write('src/prompt.md', 'markdown the SDK could load\n')
        expect(codeFingerprint(snapshot(repo.dir))).not.toBe(before)
    })
})

describe('classify', () => {
    it.each([
        ['README.md', 'docs'],
        ['CHANGELOG.md', 'docs'],
        ['CONTRIBUTING.md', 'docs'],
        ['docs/guide.md', 'docs'],
        ['.github/ISSUE_TEMPLATE/bug_report.md', 'docs'],
        ['LICENSE', 'docs'],
        ['.github/workflows/CI.yml', 'code'],
        ['.github/workflows/validate-docs.yml', 'code'],
        ['.github/workflows/release.yml', 'code'],
        ['.github/CODEOWNERS', 'unchecked'],
        ['.github/renovate.json', 'unchecked'],
        ['website/docs/about.md', 'unchecked'],
        ['website/docusaurus.config.ts', 'unchecked'],
        ['tsconfig.docs.json', 'unchecked'],
        ['src/index.ts', 'code'],
        ['src/notes.md', 'code'],
        ['package-lock.json', 'code'],
        ['tsconfig.esm.json', 'code'],
        ['scripts/fix-esm-imports.cjs', 'code'],
        ['.agents/scripts/verify.ts', 'code'],
        ['lefthook.yml', 'code'],
    ])('%s is %s', (path, kind) => {
        expect(classify(path)).toBe(kind)
    })
})

describe('changedSince', () => {
    useRepo()

    it('lists committed, staged, unstaged and untracked changes', () => {
        const base = repo.git(['rev-parse', 'HEAD']).stdout.trim()
        repo.git(['switch', '--quiet', '-c', 'feature'])
        repo.write('src/committed.ts', '1\n')
        repo.git(['add', '.'])
        repo.git(['commit', '--quiet', '-m', 'c'])
        repo.write('src/staged.ts', '1\n')
        repo.git(['add', 'src/staged.ts'])
        repo.write('src/a.ts', 'unstaged\n')
        repo.write('src/untracked.ts', '1\n')
        expect(changedSince(repo.dir, base)).toEqual([
            'src/a.ts',
            'src/committed.ts',
            'src/staged.ts',
            'src/untracked.ts',
        ])
    })
})
