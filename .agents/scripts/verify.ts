// `npm run verify`: every check CI runs on a pull request, in about twenty seconds.
// Records a fingerprint of the tree only when everything passed; the end-of-turn gate reads it.

import { CHECKOUT_ROOT, branchBase, defaultBranchRef } from './lib/git.ts'
import { clearVerified } from './lib/state.ts'
import { BLIND_SPOTS, preflight, removeLocalOnlyEnv, VERIFY_STEPS } from './lib/steps.ts'
import { runVerify } from './lib/verify.ts'

const root = CHECKOUT_ROOT

function print(line: string): void {
    process.stdout.write(`${line}\n`)
}

const problems = preflight(root)
if (problems.length > 0) {
    clearVerified(root)
    for (const problem of problems) print(`✗ ${problem}`)
    process.exit(1)
}

for (const name of removeLocalOnlyEnv(process.env)) {
    print(`Ignoring ${name}: CI does not set it.`)
}

const ref = defaultBranchRef(root)
const result = await runVerify({
    root,
    steps: VERIFY_STEPS,
    base: ref ? branchBase(root, ref) : undefined,
    baseName: ref?.replace(/^refs\/(remotes|heads)\//, '') ?? 'main',
})

if (result.recorded) {
    print('Not covered by these checks:')
    for (const spot of BLIND_SPOTS) print(`- ${spot}`)
}
process.exit(result.ok ? 0 : 1)
