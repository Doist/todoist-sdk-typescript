import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

// Exercise the real CLI in a disposable directory. Only gh/npm/fetch boundaries are replaced;
// unexpected calls fail closed. Archives, hashes, tar inspection and subprocesses are real.
export function releaseFixture() {
    const root = realpathSync(mkdtempSync(resolve(tmpdir(), 'todoist-release-test-')))
    const output = resolve(root, '.tmp/release')
    const original = resolve(root, 'original')
    for (const path of [output, original, resolve(root, 'bin')])
        mkdirSync(path, { recursive: true })
    cpSync(new URL('../release.mjs', import.meta.url), resolve(root, 'release.mjs'))
    const digest = (bytes, algorithm = 'sha256', encoding = 'hex') =>
        createHash(algorithm).update(bytes).digest(encoding)
    const pkg = {
        name: '@todoist/todoist-sdk',
        version: '17.0.1',
        repository: 'https://github.com/todoist/todoist-sdk-typescript',
        publishConfig: { provenance: false },
        exports: { '.': { types: './dist/types/index.d.ts', default: './dist/esm/index.js' } },
        engines: { node: '>=24' },
        dependencies: { '@todoist/sdk-kmp': '0.6.2' },
    }
    const filename = 'todoist-todoist-sdk-17.0.1.tgz'
    function tarball(code) {
        const staging = resolve(root, 'staging')
        mkdirSync(resolve(staging, 'package/dist/esm'), { recursive: true })
        mkdirSync(resolve(staging, 'package/dist/types'), { recursive: true })
        writeFileSync(resolve(staging, 'package/package.json'), JSON.stringify(pkg))
        writeFileSync(resolve(staging, 'package/dist/esm/index.js'), code)
        writeFileSync(
            resolve(staging, 'package/dist/types/index.d.ts'),
            'export declare const value: number',
        )
        execFileSync(
            'tar',
            [
                '-czf',
                resolve(output, filename),
                'package/package.json',
                'package/dist/esm/index.js',
                'package/dist/types/index.d.ts',
            ],
            { cwd: staging },
        )
        return readFileSync(resolve(output, filename))
    }
    const bytes = tarball('export const value = 1')
    const sourceSha = 'a'.repeat(40)
    const manifest = {
        schemaVersion: 1,
        name: pkg.name,
        repository: 'todoist/todoist-sdk-typescript',
        workflow: '.github/workflows/release.yml',
        sourceSha,
        workflowSha: sourceSha,
        mainSha: sourceSha,
        branch: 'main',
        version: '17.0.1',
        previousVersion: '17.0.0',
        channel: 'latest',
        runId: '123',
        runAttempt: '1',
        filename,
        sha256: digest(bytes),
        integrity: `sha512-${digest(bytes, 'sha512', 'base64')}`,
        notes: '## 17.0.1\n\nOriginal release notes.',
    }
    writeFileSync(resolve(output, 'release.json'), JSON.stringify(manifest))
    cpSync(resolve(output, 'release.json'), resolve(original, 'release.json'))
    cpSync(resolve(output, filename), resolve(original, filename))
    execFileSync('zip', ['-q', resolve(root, 'original.zip'), 'release.json', filename], {
        cwd: original,
    })
    const build = {
        id: 123,
        run_attempt: 1,
        repository: { id: 428678731, full_name: manifest.repository },
        head_repository: { id: 428678731, full_name: manifest.repository },
        workflow_id: 252936157,
        path: manifest.workflow,
        status: 'completed',
        conclusion: 'success',
        event: 'workflow_dispatch',
        head_branch: 'main',
        head_sha: sourceSha,
    }
    const artifact = {
        id: 77,
        name: 'todoist-sdk-release-123-1',
        expired: false,
        digest: `sha256:${digest(readFileSync(resolve(root, 'original.zip')))}`,
        workflow_run: {
            id: 123,
            repository_id: 428678731,
            head_repository_id: 428678731,
            head_branch: 'main',
            head_sha: sourceSha,
        },
    }
    const statePath = resolve(root, 'state.json')
    const writeState = (state) => writeFileSync(statePath, JSON.stringify(state))
    const state = () => JSON.parse(readFileSync(statePath, 'utf8'))
    writeState({
        build,
        artifact,
        artifacts: [artifact],
        calls: [],
        writes: [],
        copies: 'missing',
        latestConclusion: 'failure',
        main: 'b'.repeat(40),
        sourceFiles: {
            'package.json': JSON.stringify({ ...pkg, version: '17.0.0' }),
            'package-lock.json': JSON.stringify({
                name: pkg.name,
                version: '17.0.0',
                packages: { '': { name: pkg.name, version: '17.0.0' } },
            }),
            'CHANGELOG.md': '# Existing history\n',
        },
        release: {
            tag_name: 'v17.0.1',
            draft: false,
            prerelease: false,
            published_at: '2026-11-10T12:00:00Z',
            assets: [
                { id: 1, name: 'release.json', state: 'uploaded' },
                { id: 2, name: filename, state: 'uploaded' },
            ],
        },
    })
    const cli = `#!${process.execPath}
import {readFileSync,writeFileSync} from 'node:fs';
const root=process.env.SDK_RELEASE_FIXTURE, file=root+'/state.json';
const s=JSON.parse(readFileSync(file)), args=process.argv.slice(2), command=process.argv[1].split('/').pop();
s.calls.push({command,args});
const save=()=>writeFileSync(file,JSON.stringify(s));
const send=value=>{save();process.stdout.write(JSON.stringify(value));};
if(command==='npm') {
 if(args.some(arg=>arg==='--registry=https://npm.pkg.github.com/')) {
  const config=readFileSync(process.env.NPM_CONFIG_USERCONFIG,'utf8');
  if(!config.includes('_authToken=\u0024{RELEASE_TOKEN}')||config.includes('fake-write')) throw Error('Wrong GitHub userconfig authentication');
 }
 for(const name of ['GH_TOKEN','GITHUB_TOKEN','GH_PACKAGES_TOKEN','NODE_AUTH_TOKEN']) if(process.env[name]) throw Error('Leaked '+name);
 s.writes.push({command,args}); s.copies='published'; save(); process.exit(0);
}
if(command!=='gh'||args[0]!=='api') throw Error('Unexpected command '+command+' '+args);
const path=args[1];
if(args.includes('--method')) {
 const data=JSON.parse(readFileSync(0,'utf8'));s.writes.push({command:'gh',path,data});
 if(path.endsWith('/git/trees')) {s.pendingFiles=Object.fromEntries(data.tree.map(f=>[f.path,f.content]));send({sha:'d'.repeat(40)});}
 else if(path.endsWith('/git/commits')) send({sha:'e'.repeat(40)});
 else if(path.endsWith('/git/refs/heads/main')) {if(data.force!==false)throw Error('No force');s.main=data.sha;s.sourceFiles=s.pendingFiles;send({});}
 else throw Error('Unexpected GitHub write '+path);
}
else if(path.endsWith('/git/ref/heads/main')) send({object:{type:'commit',sha:s.main}});
else if(path.includes('/git/commits/')) send({tree:{sha:'c'.repeat(40)}});
else if(path.includes('/contents/')) send({encoding:'base64',content:Buffer.from(s.sourceFiles[path.split('/contents/')[1].split('?')[0]]).toString('base64')});
else if(path.endsWith('/actions/runs/123/attempts/1')) send(s.build);
else if(path.endsWith('/actions/runs/123')) send({...s.build,run_attempt:2,conclusion:s.latestConclusion});
else if(path.includes('/actions/runs/123/artifacts?')) send({total_count:s.artifacts.length,artifacts:s.artifacts});
else if(path.endsWith('/actions/artifacts/77')) send(s.artifact);
else if(path.endsWith('/actions/artifacts/77/zip')) {save();process.stdout.write(readFileSync(root+'/original.zip'));}
else if(path.includes('/compare/')) send({status:'ahead'});
else if(path.includes('/releases/assets/')) {save();process.stdout.write(readFileSync(root+'/original/'+(path.endsWith('/1')?'release.json':'${filename}')));}
else throw Error('Unexpected GitHub API '+path);
`
    for (const name of ['gh', 'npm'])
        writeFileSync(resolve(root, 'bin', name), cli, { mode: 0o755 })
    writeFileSync(resolve(root, 'package.json'), '{"type":"module"}')
    writeFileSync(
        resolve(root, 'fetch.mjs'),
        `
import {readFileSync,writeFileSync} from 'node:fs';
const root=process.env.SDK_RELEASE_FIXTURE,file=root+'/state.json';
globalThis.fetch=async(url)=>{
 const s=JSON.parse(readFileSync(file));s.calls.push({command:'fetch',url});writeFileSync(file,JSON.stringify(s));
 const m=JSON.parse(readFileSync(root+'/.tmp/release/release.json'));
 const send=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
 if(url.endsWith('/-/whoami')) return send({username:'fixture'});
 if(url.includes('/orgs/todoist/packages?')) return send(s.copies==='missing'?[]:[{name:'todoist-sdk',visibility:'private',repository:{id:428678731}}]);
 if(url.endsWith('/user/memberships/orgs/todoist')) return send({state:'active',role:'admin',organization:{id:2565372}},200,{'x-oauth-scopes':'read:org, read:packages'});
 if(url.startsWith('https://registry.npmjs.org/')||url.startsWith('https://npm.pkg.github.com/')) return s.copies==='missing'?send({},404):send({versions:{[m.version]:{dist:{integrity:m.integrity}}},'dist-tags':{latest:m.version}});
 if(url.includes('/releases?')) return send([s.release]);
 if(url.includes('/git/ref/tags/')) return send({object:{type:'commit',sha:'${sourceSha}'}});
 throw Error('Unexpected network '+url);
};`,
    )
    return {
        root,
        output,
        manifest,
        state,
        writeState,
        invoke(...args) {
            return spawnSync(
                process.execPath,
                ['--import', resolve(root, 'fetch.mjs'), resolve(root, 'release.mjs'), ...args],
                {
                    cwd: root,
                    encoding: 'utf8',
                    timeout: 15000,
                    env: {
                        PATH: `${root}/bin:${process.env.PATH}`,
                        SDK_RELEASE_FIXTURE: root,
                        GH_TOKEN: 'fake-gh',
                        GH_PACKAGES_TOKEN: 'fake-read',
                        NODE_AUTH_TOKEN: 'fake-write',
                        GITHUB_PACKAGE_VISIBILITY: 'private',
                    },
                },
            )
        },
        forge() {
            const changed = tarball('export const value = 999')
            writeFileSync(
                resolve(output, 'release.json'),
                JSON.stringify({
                    ...manifest,
                    sha256: digest(changed),
                    integrity: `sha512-${digest(changed, 'sha512', 'base64')}`,
                }),
            )
        },
        cleanOutput() {
            rmSync(output, { recursive: true, force: true })
        },
        dispose() {
            rmSync(root, { recursive: true, force: true })
        },
    }
}
