// Agent tooling state lives in the checkout's gitignored .tmp/agents/, not in .git/:
// Codex's sandbox cannot write .git/, and each worktree keeps its own state.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function stateDir(root: string): string {
    return join(root, '.tmp/agents')
}

/**
 * A name made safe to use as a file name under the state directory: anything but letters, digits,
 * `.`, `-` and `_` becomes `_`, and so does every dot of a name made only of dots (`.`, `..`), so
 * a hook's session id cannot point outside it.
 */
export function safeName(name: string): string {
    const safe = name.replace(/[^\w.-]/g, '_')
    return /^\.+$/.test(safe) ? safe.replace(/\./g, '_') : safe
}

export function readJson<T>(path: string): T | undefined {
    try {
        return JSON.parse(readFileSync(path, 'utf8')) as T
    } catch {
        return undefined
    }
}

export function writeJson(path: string, value: unknown): void {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

export type VerifiedRecord = { fingerprint: string; head: string; at: string }

function verifiedPath(root: string): string {
    return join(stateDir(root), 'verified.json')
}

export function readVerified(root: string): VerifiedRecord | undefined {
    return readJson<VerifiedRecord>(verifiedPath(root))
}

export function writeVerified(root: string, record: VerifiedRecord): void {
    writeJson(verifiedPath(root), record)
}

export function clearVerified(root: string): void {
    rmSync(verifiedPath(root), { force: true })
}
