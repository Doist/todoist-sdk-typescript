// A separate worktree with the current change in it, for a reviewer that needs to run or break
// code. It checks out HEAD, applies the staged and unstaged diff, and copies untracked files that
// are not ignored. It does not link node_modules: reinstalling through a symlinked node_modules
// would empty the original checkout's install.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { cleanGitEnv, git, untrackedPaths } from './git.ts'

/** Git with its output and input as bytes: a patch of a file that isn't UTF-8 must survive. */
function gitBytes(
    cwd: string,
    args: string[],
    input?: Buffer,
): { ok: boolean; stdout: Buffer; stderr: string } {
    const result = spawnSync('git', args, {
        cwd,
        env: cleanGitEnv(),
        input,
        maxBuffer: 256 * 1024 * 1024,
    })
    return {
        ok: result.status === 0,
        stdout: result.stdout ?? Buffer.alloc(0),
        stderr: result.stderr?.toString() ?? '',
    }
}

export function createReviewWorktree(root: string, target: string): void {
    if (existsSync(target)) throw new Error(`${target} already exists`)

    // Read the change before the worktree exists: a target inside the checkout would otherwise be
    // listed as an untracked folder and copied into itself. Fixed prefixes and context, and no
    // external diff, textconv or colour, whatever the user's git config says, so `git apply` can
    // read the patch: it rejects zero-context hunks, which diff.context=0 would produce.
    const diff = gitBytes(root, [
        'diff',
        'HEAD',
        '--binary',
        '--unified=3',
        '--no-ext-diff',
        '--no-textconv',
        '--no-color',
        '--src-prefix=a/',
        '--dst-prefix=b/',
    ])
    if (!diff.ok) throw new Error(`git diff failed: ${diff.stderr.trim()}`)
    // An untracked nested repository (a clone, another worktree) is not part of the change, and
    // copying it whole would bring along the files its own .gitignore keeps out, like .env.
    const untracked = untrackedPaths(root).filter((path) => !path.endsWith('/'))

    const added = git(root, ['worktree', 'add', '--quiet', '--detach', target, 'HEAD'])
    if (!added.ok) throw new Error(`git worktree add failed: ${added.stderr.trim()}`)

    try {
        if (diff.stdout.length > 0) {
            const applied = gitBytes(target, ['apply', '--whitespace=nowarn'], diff.stdout)
            if (!applied.ok) throw new Error(`git apply failed: ${applied.stderr.trim()}`)
        }
        for (const path of untracked) {
            mkdirSync(dirname(join(target, path)), { recursive: true })
            // verbatimSymlinks keeps a relative link relative, instead of pointing it back into
            // the original checkout.
            cpSync(join(root, path), join(target, path), {
                recursive: true,
                verbatimSymlinks: true,
            })
        }
    } catch (error) {
        // Leave nothing behind, so a retry is not refused with "already exists". If the remove
        // fails, the folder goes anyway and prune drops git's record of the worktree.
        if (!git(root, ['worktree', 'remove', '--force', target]).ok) {
            rmSync(target, { recursive: true, force: true })
            git(root, ['worktree', 'prune'])
        }
        rmSync(target, { recursive: true, force: true })
        throw error
    }
}
