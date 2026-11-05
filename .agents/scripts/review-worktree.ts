// `npm run review:worktree -- <dir>`: a separate worktree with the current change in it, for a
// reviewer that needs to run or break code. The shared checkout stays read-only for reviewers.
// See lib/review-worktree.ts.

import { resolve } from 'node:path'
import { CHECKOUT_ROOT } from './lib/git.ts'
import { createReviewWorktree } from './lib/review-worktree.ts'

function main(root: string, target: string | undefined): number {
    if (!target) {
        process.stderr.write('usage: npm run review:worktree -- <dir>\n')
        return 2
    }
    const dir = resolve(target)
    try {
        createReviewWorktree(root, dir)
    } catch (error) {
        process.stderr.write(`review-worktree: ${(error as Error).message}\n`)
        return 1
    }
    const quoted = `'${dir.replaceAll("'", "'\\''")}'`
    process.stdout.write(
        [
            `Review worktree ready: ${dir}`,
            `Install dependencies there before running anything: cd ${quoted} && npm ci`,
            `Remove it when done: git worktree remove --force ${quoted}`,
            '',
        ].join('\n'),
    )
    return 0
}

// exitCode rather than process.exit(), so output still buffered for a pipe is written first.
process.exitCode = main(CHECKOUT_ROOT, process.argv[2])
