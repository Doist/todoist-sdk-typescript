// Fingerprints of the working tree, by file content. Hashing content (not mtimes) catches edits
// made in the same second, and hashing in-process writes nothing to git's object store.

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { git, untrackedPaths } from './git.ts'

/** Path → content hash for every tracked and untracked, non-ignored file. */
export type Snapshot = Record<string, string>

export function snapshot(root: string): Snapshot {
    const listed = git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    if (!listed.ok) throw new Error(`git ls-files failed: ${listed.stderr.trim()}`)
    const files: Snapshot = {}
    for (const path of new Set(listed.stdout.split('\0').filter(Boolean))) {
        const hash = hashPath(join(root, path))
        // A tracked file deleted from disk is left out, exactly as it is once the deletion is
        // staged, so staging a deletion doesn't change the snapshot.
        if (hash !== undefined) files[path] = hash
    }
    return files
}

function hashPath(path: string): string | undefined {
    let stat
    try {
        stat = lstatSync(path)
    } catch {
        return undefined
    }
    const hash = createHash('sha256')
    if (stat.isSymbolicLink()) hash.update(`link:${readlinkSync(path)}`)
    else if (stat.isDirectory()) hash.update('dir') // a nested repository, listed but not entered
    else hash.update(`${stat.mode & 0o111 ? 'x' : '-'}:`).update(readFileSync(path))
    return hash.digest('hex')
}

/**
 * The pull-request workflows that run checks. .agents/scripts/lib/steps.test.ts compares verify
 * with their commands, and reads every other workflow to check none of them runs a command on pull
 * requests, so every workflow counts as code.
 */
export const CHECKED_WORKFLOWS = ['.github/workflows/CI.yml', '.github/workflows/validate-docs.yml']

/** Agent instructions outside .agents/. instructions.test.ts checks every reference in them. */
export const AGENT_DOCS = new Set(['AGENTS.md', 'docs/agents.md'])

/** The kinds of file, as far as local checks are concerned. */
export const FILE_KINDS = ['docs', 'unchecked', 'code'] as const
/** The kind of file, as far as local checks are concerned. */
export type FileKind = (typeof FILE_KINDS)[number]

/**
 * - docs: prose no check reads. Markdown under src/ is excluded, since it could be loaded at runtime,
 *   and so are the agent instructions, which a test reads.
 * - unchecked: files only CI or GitHub reads: the docs site, which verify does not build, Renovate
 *   and other .github/ config. Local verification cannot vouch for them.
 * - code: everything else, including config, lockfiles, scripts and tests.
 */
export function classify(path: string): FileKind {
    if (path.startsWith('.github/workflows/')) return 'code'
    // .agents/scripts/instructions.test.ts checks every reference in these.
    if (AGENT_DOCS.has(path) || path.startsWith('.agents/')) return 'code'
    if (path.startsWith('.github/')) return path.endsWith('.md') ? 'docs' : 'unchecked'
    // Read only by the docs site build (validate-docs.yml), Markdown included.
    if (path.startsWith('website/') || path === 'tsconfig.docs.json') return 'unchecked'
    if (path.endsWith('.md') && !path.startsWith('src/')) return 'docs'
    if (path === 'LICENSE') return 'docs'
    return 'code'
}

function present(files: Snapshot, path: string): boolean {
    return files[path] !== undefined
}

/**
 * Hash of every file local checks read, so editing docs, or files only CI reads, after a pass
 * keeps it valid. Docs count by name: the agent docs may name one, so adding, renaming or deleting
 * a doc means checking again.
 */
export function codeFingerprint(files: Snapshot): string {
    const hash = createHash('sha256')
    for (const path of Object.keys(files).sort()) {
        const kind = classify(path)
        if (kind === 'code') hash.update(`${path}\0${files[path]}\n`)
        // Every key is a file on disk, so a doc counts by name alone.
        else if (kind === 'docs') hash.update(`${path}\0doc\n`)
    }
    return hash.digest('hex')
}

/** Changed files the fingerprint covers: code, and docs added or removed. */
export function fingerprintChanges(before: Snapshot, after: Snapshot): string[] {
    return changedPaths(before, after).filter((path) => {
        const kind = classify(path)
        return (
            kind === 'code' || (kind === 'docs' && present(before, path) !== present(after, path))
        )
    })
}

export function changedPaths(before: Snapshot, after: Snapshot): string[] {
    const paths = new Set([...Object.keys(before), ...Object.keys(after)])
    return [...paths].filter((path) => before[path] !== after[path]).sort()
}

/**
 * The kind a file that differs from the default branch counts as: its own, except that a doc that
 * was deleted or renamed counts as code, since the agent docs may name it.
 */
export function checkKind(root: string, path: string): FileKind {
    const kind = classify(path)
    return kind === 'docs' && !existsSync(join(root, path)) ? 'code' : kind
}

/** Whether a file that differs from the default branch needs the checks. */
export function needsChecks(root: string, path: string): boolean {
    return checkKind(root, path) === 'code'
}

/** Files that differ from `base`: committed, staged, unstaged and untracked. */
export function changedSince(root: string, base: string): string[] {
    const diff = git(root, ['diff', '--name-only', '-z', '--no-renames', base])
    if (!diff.ok) throw new Error(`git diff failed: ${diff.stderr.trim()}`)
    const paths = [...diff.stdout.split('\0'), ...untrackedPaths(root)].filter(Boolean)
    return [...new Set(paths)].sort()
}
