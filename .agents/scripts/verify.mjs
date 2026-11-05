// `npm run verify` starts here. verify.ts needs Node's type stripping, so an older Node would fail
// on the .ts extension before verify's own preflight could say why. This checks the Node version
// against package.json first, in plain JavaScript, then hands over.

import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Not import.meta.dirname: the Node versions this has to handle may not have it.
const root = fileURLToPath(new URL('../..', import.meta.url))
const engine = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).engines?.node
const minimum = engine?.match(/^>=\s*(\d+)/)?.[1]

if (minimum && Number(process.versions.node.split('.')[0]) < Number(minimum)) {
    rmSync(join(root, '.tmp/agents/verified.json'), { force: true })
    process.stdout.write(
        `✗ Node ${process.versions.node} is older than the ${engine} this repository needs. ` +
            'Switch versions (see .nvmrc) and run again.\n',
    )
    process.exitCode = 1
} else {
    await import('./verify.ts')
}
