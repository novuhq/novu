#!/usr/bin/env node
// Novu Box from your machine: start a box, put your checkout on it, check it, read its logs. Plain Node, no npm
// dependencies. It runs the box's own commands (`box.mjs`) inside the box: a local Docker container, or with
// `--cloud` a Cloudflare container (cloud/target.mjs).
//
//   node docker/box/cli.mjs up                start the box, baking `next` first if it has never been baked
//   node docker/box/cli.mjs sync [--full]     put this checkout, committed or not, on the box; rebuild what it changes
//   node docker/box/cli.mjs doctor            whether the box is fit to test on, as JSON; exits 1 if not
//   node docker/box/cli.mjs logs <process>    a process's last lines (--tail <n>, default 200)
//   node docker/box/cli.mjs exec -- <cmd...>  run a command in the box's checkout (/data/novu)
//   node docker/box/cli.mjs down              stop the box; its data stays (local: its volume; cloud: its snapshot)
//   node docker/box/cli.mjs delete --cloud    stop a Cloudflare box and delete it with its snapshot and Worker
//
// --box <name>  local: default novu-box, its volume is <name>-data; local boxes publish the same host ports, so one
//               runs at a time. Cloud: default the current branch; the box is https://novu-box-<name>.<workers.dev>.
// --cloud       the Cloudflare box. All boxes run in one host Worker; each has its own small Worker for its address.
//               `up --cloud --deploy` redeploys the host (after a change to docker/box), which applies to every box.
//               `up --cloud --from <box>` starts a new box from that box's latest snapshot instead of baking.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { cloudTarget } from './cloud/target.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const IMAGE = 'novu-box:dev';
const ENV_FILE = join(HERE, '.env');
const PORTS = { api: 13000, dashboard: 14200, socket: 18887, s3: 4566, mailpit: 18025 };
const PORT_FLAGS = ['13000:3000', '14200:4200', '18887:8887', '4566:4566', '18025:8025'].flatMap((map) => ['-p', map]);
const BUNDLE_IN_BOX = '/data/run/sync.bundle';
const SYNC_REF = 'refs/worktree/box-sync';
// Code changes bundle to kilobytes; a bundle this big holds build output or media nobody meant to send.
const MAX_BUNDLE_MB = 25;
const HEALTHY_WITHIN_SECONDS = 240;

const USAGE =
  'usage: node docker/box/cli.mjs up|sync|doctor|logs|exec|down|delete [--box <name>] [--cloud]; exec -- <cmd> for flags';
let options;
let positionals;
try {
  ({ values: options, positionals } = parseArgs({
    options: {
      box: { type: 'string' },
      cloud: { type: 'boolean', default: false },
      deploy: { type: 'boolean', default: false },
      from: { type: 'string' },
      full: { type: 'boolean', default: false },
      tail: { type: 'string', default: '200' },
    },
    allowPositionals: true,
  }));
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}
const BOX = options.box ?? (options.cloud ? branchBox() : 'novu-box');
const [command, ...args] = positionals;

// The current branch as a box name: lowercase letters, digits and dashes, short enough for a workers.dev name.
function branchBox() {
  const branch = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim();
  const name = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/, '');
  if (!name) throw new Error('not on a branch; pass --box <name>');

  return name;
}

function log(message) {
  console.error(`[cli] ${message}`);
}

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  if (result.error) throw result.error;

  return result.status ?? 1;
}

function output(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} failed: ${result.stderr.trim()}`);

  return result.stdout.trim();
}

function succeeds(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, { stdio: 'ignore', ...opts }).status === 0;
}

// Runs a box.mjs command in the box. GITHUB_TOKEN goes only into that command's environment, for the fetches that
// need it (a PR, the enterprise submodule); it's never written into the box.
function inBox(boxArgs, { withToken = false, capture = false } = {}) {
  const env = withToken ? { ...process.env, GITHUB_TOKEN: githubToken() } : process.env;
  const dockerArgs = [
    'exec',
    ...(withToken ? ['-e', 'GITHUB_TOKEN'] : []),
    BOX,
    'node',
    '/opt/box/box.mjs',
    ...boxArgs,
  ];

  return capture ? output('docker', dockerArgs, { env }) : run('docker', dockerArgs, { env });
}

function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const result = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('needs GITHUB_TOKEN or a signed-in `gh` (gh auth login)');

  return result.stdout.trim();
}

function containerStatus() {
  const result = spawnSync('docker', ['inspect', '--format', '{{.State.Status}}', BOX], { encoding: 'utf8' });

  return result.status === 0 ? result.stdout.trim() : null;
}

function requireRunning() {
  const status = containerStatus();
  if (status !== 'running') throw new Error(`box ${BOX} is ${status ?? 'not created'}; run \`cli.mjs up\` first`);
}

// --- up / down ---

async function up() {
  const status = containerStatus();
  if (status === 'running') log(`${BOX} is already running`);
  else if (status) {
    log(`starting ${BOX}`);
    run('docker', ['start', BOX]);
  } else create();
  await waitUntilHealthy();
  console.log(`dashboard: http://localhost:${PORTS.dashboard}`);
  console.log(`api: http://localhost:${PORTS.api}`);
  console.log(`mailpit: http://localhost:${PORTS.mailpit}/mail`);

  return 0;
}

function create() {
  if (!fs.existsSync(ENV_FILE))
    throw new Error(`${ENV_FILE} is missing; copy secrets.example.env there and fill it in`);
  if (!succeeds('docker', ['image', 'inspect', IMAGE])) {
    log(`building ${IMAGE}`);
    if (run('docker', ['build', '-t', IMAGE, HERE]) !== 0) throw new Error('the image build failed');
  }
  const volume = `${BOX}-data`;
  const volumeArgs = ['-v', `${volume}:/data`];
  if (!succeeds('docker', ['run', '--rm', ...volumeArgs, '--entrypoint', 'test', IMAGE, '-f', '/data/.baked.json'])) {
    log(`baking next into ${volume} (about 12 minutes)`);
    const baked = run(
      'docker',
      [
        'run',
        '--rm',
        '--name',
        `${BOX}-bake`,
        '-e',
        'GITHUB_TOKEN',
        '--env-file',
        ENV_FILE,
        ...volumeArgs,
        IMAGE,
        'bake',
        'next',
      ],
      { env: { ...process.env, GITHUB_TOKEN: githubToken() } }
    );
    if (baked !== 0)
      throw new Error(`the bake failed; its log is above, and the volume ${volume} keeps what it got to`);
  }
  log(`creating ${BOX}`);
  output('docker', ['run', '-d', '--name', BOX, '--env-file', ENV_FILE, ...volumeArgs, ...PORT_FLAGS, IMAGE]);
}

async function waitUntilHealthy() {
  const deadline = Date.now() + HEALTHY_WITHIN_SECONDS * 1000;
  let report;
  while (Date.now() < deadline) {
    report = doctorReport();
    if (report?.ok) {
      log(`${BOX} is healthy`);

      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 3000));
  }
  throw new Error(
    `${BOX} isn't healthy after ${HEALTHY_WITHIN_SECONDS}s: ${report?.problems.join('; ') ?? 'no report'}`
  );
}

function doctorReport() {
  const result = spawnSync('docker', ['exec', BOX, 'node', '/opt/box/box.mjs', 'doctor'], { encoding: 'utf8' });
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function down() {
  log(`stopping ${BOX}; \`cli.mjs up\` starts it again with the same data`);

  return run('docker', ['stop', BOX]);
}

// --- sync ---

// Puts this checkout on the box as the box would put a PR on it: the checkout becomes one commit (HEAD plus every
// change, committed or not, new files included; see `snapshot`), which the box merges onto its baked commit. It travels as a
// git bundle, so it arrives exactly as it is here: binaries, file modes, deletions.
async function sync() {
  await target.ready();
  const root = output('git', ['rev-parse', '--show-toplevel']);
  const git = (gitArgs, opts = {}) => output('git', gitArgs, { cwd: root, ...opts });
  const { baked } = JSON.parse(await target.box(['state'], { capture: true }));
  if (!succeeds('git', ['cat-file', '-e', `${baked.sha}^{commit}`], { cwd: root })) {
    log(`fetching the box's baked commit ${baked.sha.slice(0, 10)}`);
    git(['fetch', '--no-tags', 'origin', baked.sha]);
  }

  const { commit, changed, summary } = snapshot(root, git);
  log(summary);
  const bundle = join(os.tmpdir(), `box-sync-${process.pid}.bundle`);
  try {
    git(['update-ref', SYNC_REF, commit]);
    git(['bundle', 'create', '--quiet', bundle, SYNC_REF, `^${baked.sha}`]);
    const kb = fs.statSync(bundle).size / 1024;
    if (kb > MAX_BUNDLE_MB * 1024) {
      const biggest = changed
        .filter((file) => fs.statSync(join(root, file), { throwIfNoEntry: false })?.isFile())
        .map((file) => [file, fs.statSync(join(root, file)).size])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([file, size]) => `${file} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      throw new Error(
        `the sync is ${(kb / 1024).toFixed(0)} MB, over ${MAX_BUNDLE_MB} MB; the biggest changed files: ${biggest.join(', ')}`
      );
    }
    log(`sending ${kb.toFixed(0)} KB to ${target.name}`);
    await target.put(bundle, BUNDLE_IN_BOX);
  } finally {
    spawnSync('git', ['update-ref', '-d', SYNC_REF], { cwd: root });
    fs.rmSync(bundle, { force: true });
  }

  return target.box(['apply', '--bundle', BUNDLE_IN_BOX, ...(options.full ? ['--full'] : [])], { github: true });
}

// The checkout as a commit on HEAD, built in a copy of the index so your own index and staging stay as they are.
// New code starts untracked, so untracked files are sent too, but only inside the top-level folders the repo
// already has (apps, libs, packages, ...). Untracked files elsewhere (scratch folders, tool state, a stray
// screenshot or .env at the root) stay on your machine, and the summary names them. Ignored files are never sent.
function snapshot(root, git) {
  const head = git(['rev-parse', 'HEAD']);
  const repoFolders = new Set(git(['ls-tree', '-d', '--name-only', 'HEAD']).split('\n'));
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  const sent = new Set(untracked.filter((file) => file.includes('/') && repoFolders.has(file.split('/')[0])));
  const skipped = untracked.filter((file) => !sent.has(file));

  const index = join(os.tmpdir(), `box-sync-${process.pid}.index`);
  const ownIndex = resolve(root, git(['rev-parse', '--git-path', 'index']));
  const scratch = { env: { ...process.env, GIT_INDEX_FILE: index } };
  try {
    // Starting from the real index (when there is one) keeps its file stats, so `add` doesn't re-read every file.
    if (fs.existsSync(ownIndex)) fs.copyFileSync(ownIndex, index);
    else git(['read-tree', head], scratch);
    git(['add', '--update'], scratch);
    if (sent.size)
      git(['--literal-pathspecs', 'add', '--pathspec-from-file=-', '--pathspec-file-nul'], {
        ...scratch,
        input: [...sent].join('\0'),
      });
    const tree = git(['write-tree'], scratch);
    const changed = git(['diff', '--name-only', head, tree]).split('\n').filter(Boolean);
    const branch = git(['branch', '--show-current']) || 'a detached HEAD';
    const label = `sync ${branch} at ${head.slice(0, 10)}${changed.length ? ' with uncommitted changes' : ''}`;
    const identity = { GIT_AUTHOR_NAME: 'box sync', GIT_AUTHOR_EMAIL: 'box@box.internal' };
    const commit = git(['commit-tree', tree, '-p', head, '-m', label], {
      env: { ...process.env, ...identity, GIT_COMMITTER_NAME: 'box sync', GIT_COMMITTER_EMAIL: 'box@box.internal' },
    });
    const sentNote = sent.size ? `, ${sent.size} of them untracked: ${[...sent].slice(0, 5).join(' ')}` : '';
    const skippedNote = skipped.length ? `; not sent, outside the repo's folders: ${countByFolder(skipped)}` : '';

    return { commit, changed, summary: `${label}: ${changed.length} files differ from HEAD${sentNote}${skippedNote}` };
  } finally {
    fs.rmSync(index, { force: true });
  }
}

function countByFolder(files) {
  const counts = {};
  for (const file of files) counts[file.split('/')[0]] = (counts[file.split('/')[0]] ?? 0) + 1;

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([folder, count]) => (count > 1 ? `${folder} (${count} files)` : folder))
    .join(', ');
}

// --- where the box runs ---

// The local box: a Docker container. cloud/target.mjs is the same interface over HTTPS.
const docker = {
  name: BOX,
  up,
  down,
  ready: async () => requireRunning(),
  box: async (boxArgs, { github = false, capture = false } = {}) => inBox(boxArgs, { withToken: github, capture }),
  exec: async (cmd) =>
    run('docker', ['exec', ...(process.stdin.isTTY ? ['-it'] : ['-i']), '-w', '/data/novu', BOX, ...cmd]),
  put: async (file, path) => output('docker', ['cp', file, `${BOX}:${path}`]),
};
const target = options.cloud ? cloudTarget({ box: BOX, log, githubToken }) : docker;

const commands = {
  up: () => target.up({ deploy: options.deploy, from: options.from }),
  sync,
  doctor: async () => {
    await target.ready();

    return target.box(['doctor']);
  },
  logs: async () => {
    await target.ready();

    return target.box(['logs', ...args, '--tail', options.tail]);
  },
  exec: async () => {
    if (!args.length) throw new Error('usage: cli.mjs exec -- <command...>');
    await target.ready();

    return target.exec(args);
  },
  down: () => target.down(),
  delete: () => {
    if (!options.cloud) throw new Error('delete is for Cloudflare boxes (--cloud); a local box is its volume');

    return target.delete();
  },
};

if (!commands[command]) {
  console.error(USAGE);
  process.exit(2);
}

try {
  process.exitCode = await commands[command]();
} catch (error) {
  log(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
