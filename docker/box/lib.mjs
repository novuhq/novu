// What the commands that run inside the box share (box.mjs and the modules it calls): the paths under /data, the
// environment, running commands, process-compose and the process table, the bake-or-apply lock, git with a token, and
// waiting. It imports only node.mjs, which imports none of ours. On import it reads config/box.env into `env`;
// nothing else.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { output as nodeOutput, run as nodeRun, readEnvFile } from './node.mjs';

export const BOX = process.env.BOX_HOME ?? '/opt/box';
export const DATA = '/data';
export const REPO = `${DATA}/novu`;
// nx itself, not through `pnpm nx`, which adds a pnpm start to every call.
export const NX = 'node_modules/.bin/nx';
export const BAKED = `${DATA}/.baked.json`;
export const APPLIED = `${DATA}/.applied.json`;
// Written before an apply checks out its commit and removed when it succeeds; see apply.mjs.
export const APPLYING = `${DATA}/.applying.json`;
export const MIGRATED = `${DATA}/.migrated`;
export const RUN = `${DATA}/run`;
export const LOCK = `${RUN}/box.lock`;
export const PC_SOCKET = `${RUN}/process-compose.sock`;
// process-compose writes every process's output to one file, a JSON line each ({process, message}); see logs.mjs.
export const PC_LOG = `${DATA}/logs/process-compose.log`;
export const DEPLOY = `${DATA}/deploy`;
export const BULLMQ_PRO = `${DATA}/bullmq-pro`;
export const REDIS_TLS = `${DATA}/redis/tls`;
export const REDIS_PORTS = [7000, 7001, 7002];
export const MAIL_HOST = 'mail.box.internal';
export const SINK_URL = 'http://sink.box.internal:8026';
export const BRIDGE_URL = 'http://bridge.box.internal:4000/api/novu';
export const BRIDGE_SECRET = `${DATA}/bridge/secret-key`;
export const MANAGED_AGENT = 'box-managed';
export const REPO_URL = process.env.BOX_REPO_URL ?? 'https://github.com/novuhq/novu.git';
export const API_HEALTH = 'http://127.0.0.1:3000/v1/health-check';
export const WORKER_HEALTH = 'http://127.0.0.1:3004/v1/health-check';

// Every process in process-compose.yaml (`doctor` checks the two match). A store keeps data under /data: it stops
// after everything else, so its files are whole in a snapshot. `projects`: the nx projects whose build it runs;
// `paths`: files no nx project covers that change it (the workers have no nx build, and playground/ is in
// .nxignore); `deploy`: the package `pnpm deploy` puts under /data/deploy for it.
export const PROCESSES = {
  mongo: { kind: 'store' },
  ...Object.fromEntries(REDIS_PORTS.map((port) => [`redis-${port}`, { kind: 'store' }])),
  clickhouse: { kind: 'store' },
  s3: { kind: 'store' },
  sqs: { kind: 'store' },
  mail: { kind: 'store' },
  sink: { kind: 'app' },
  migrate: { kind: 'app' },
  api: { kind: 'app', projects: ['@novu/api-service'], deploy: '@novu/api-service' },
  worker: { kind: 'app', projects: ['@novu/worker'], deploy: '@novu/worker' },
  socket: { kind: 'app', paths: ['enterprise/workers/socket/'] },
  dashboard: { kind: 'app', projects: ['@novu/dashboard'] },
  stripe: { kind: 'app' },
  bridge: { kind: 'app', projects: ['@novu/framework', '@novu/agent-toolkit'], paths: ['playground/nextjs/'] },
  thalamus: { kind: 'app', paths: ['enterprise/workers/thalamus-observer/'] },
};
const processesWhere = (test) => Object.keys(PROCESSES).filter((name) => test(PROCESSES[name]));
export const STORES = processesWhere((entry) => entry.kind === 'store');
export const APPS = processesWhere((entry) => entry.kind === 'app');
// The processes that run the checkout's code, which a new install restarts.
export const CODE_PROCESSES = processesWhere((entry) => entry.projects || entry.paths);
export const PROJECT_PROCESSES = Object.fromEntries(
  Object.entries(PROCESSES).flatMap(([name, entry]) => (entry.projects ?? []).map((project) => [project, name]))
);
export const PATH_PROCESSES = Object.fromEntries(
  Object.entries(PROCESSES).flatMap(([name, entry]) => (entry.paths ?? []).map((path) => [path, name]))
);
export const DEPLOYED_APPS = Object.fromEntries(
  processesWhere((entry) => entry.deploy).map((name) => [name, PROCESSES[name].deploy])
);

// Those of `processes` this box runs: thalamus only runs with the managed-agent key (see `box start`).
export function runnable(processes) {
  if (!env.NOVU_MANAGED_CLAUDE_API_KEY) processes.delete('thalamus');

  return [...processes];
}

// GITHUB_TOKEN stays out: the box runs PR code (install scripts, builds, the apps), and every child gets this
// environment. box.mjs passes the token only to the git calls that need it and the CI lookup.
export const env = loadEnv();

function loadEnv() {
  const defaults = readEnvFile(`${BOX}/config/box.env`);
  // Production switches BullMQ to Pro (job groups) and turns off TTL indexes with this flag.
  if (fs.existsSync(`${BULLMQ_PRO}/node_modules/@taskforcesh/bullmq-pro`)) defaults.NOVU_MANAGED_SERVICE = 'true';
  const { GITHUB_TOKEN: _token, ...inherited } = process.env;

  return { ...defaults, ...inherited };
}

export function log(message) {
  console.log(`[box] ${new Date().toISOString()} ${message}`);
}

// In the checkout, with the box's environment; throws unless it exits 0.
export function run(cmd, args, options = {}) {
  nodeRun(cmd, args, { env, cwd: REPO, ...options });
}

// `run` without waiting, so builds can run side by side.
export function runAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: REPO, ...options });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code ?? signal}`))
    );
  });
}

// A command's stdout in the checkout, with the box's environment.
export function output(cmd, args, options = {}) {
  return nodeOutput(cmd, args, { env, cwd: REPO, ...options });
}

// Logs a step and how long it took, also into /data/logs/timings.jsonl.
export async function step(name, fn) {
  const started = Date.now();
  log(`${name}...`);
  const result = await fn();
  const seconds = (Date.now() - started) / 1000;
  fs.mkdirSync(`${DATA}/logs`, { recursive: true });
  fs.appendFileSync(
    `${DATA}/logs/timings.jsonl`,
    `${JSON.stringify({ at: new Date().toISOString(), command: process.argv[2], step: name, seconds })}\n`
  );
  log(`${name} done in ${seconds.toFixed(1)}s`);

  return result;
}

export function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls `check` until it returns something truthy, and returns that; throws `failure` after `seconds`.
export async function poll(seconds, check, failure, everyMs = 1000) {
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(typeof failure === 'function' ? failure() : failure);
    await sleep(everyMs);
  }
}

export function waitForHttp(url, seconds) {
  const healthy = () =>
    fetch(url).then(
      (response) => response.ok,
      () => false
    );

  return poll(seconds, healthy, `${url} not healthy after ${seconds}s`);
}

export function pc(args) {
  nodeRun('process-compose', [...args, '--use-uds', '--unix-socket', PC_SOCKET], { env, cwd: RUN });
}

export function processList() {
  return JSON.parse(
    nodeOutput('process-compose', ['process', 'list', '-o', 'json', '--use-uds', '--unix-socket', PC_SOCKET], {
      env,
      cwd: RUN,
    })
  );
}

export function runningProcesses() {
  return new Set(
    processList()
      .filter((entry) => entry.is_running)
      .map((entry) => entry.name)
  );
}

// Stops those of `names` that run, and waits until they have. process-compose fails to stop a process that isn't
// running (a failed apply leaves apps stopped), and `process stop` returns while they still terminate.
export async function stopRunning(names) {
  const running = runningProcesses();
  const stop = names.filter((name) => running.has(name));
  if (stop.length) await step(`stop ${stop.join(' ')}`, () => pc(['process', 'stop', ...stop]));
  let left = [];
  await poll(
    180,
    () => {
      left = processList()
        .filter((entry) => names.includes(entry.name) && (entry.is_running || entry.status === 'Terminating'))
        .map((entry) => entry.name);

      return !left.length;
    },
    () => `still running 180s after the stop: ${left.join(' ')}`
  );
}

// Every store answers its readiness probe and `migrate` has run: what the apps, and an apply, need first.
export function storesReady() {
  const list = processList();
  const ready = STORES.every((name) => list.find((entry) => entry.name === name)?.is_ready === 'Ready');

  return ready && list.find((entry) => entry.name === 'migrate')?.status === 'Completed';
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

// One bake or apply at a time, and the one answer to "is one running" (`box state` and `doctor`, the Cloudflare
// Worker's busy check, CI stopping an older push's apply). Started detached (`setsid`, see `detached` in
// cloud/shared.mjs), its pid is also its process group, so CI stops all of it. A lock whose process is gone (a killed
// apply) is taken over; `box start` clears one a snapshot kept, since PIDs start over. Returns the release.
export function holdLock(command) {
  fs.mkdirSync(RUN, { recursive: true });
  const take = () =>
    fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, command, at: new Date().toISOString() }), { flag: 'wx' });
  const taken = (holder) =>
    new Error(`another ${holder?.command ?? 'bake or apply'} is running (pid ${holder?.pid}); wait for it to finish`);
  try {
    take();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const holder = lockHolder();
    if (holder) throw taken(holder);
    log('taking over the lock of a bake or apply that is gone');
    fs.rmSync(LOCK, { force: true });
    // Only a bake or apply runs git in the checkout, so an index.lock is one that the dead one left.
    fs.rmSync(`${REPO}/.git/index.lock`, { force: true });
    // Another one that found the same dead holder may have taken the lock in between.
    try {
      take();
    } catch (retryError) {
      if (retryError.code !== 'EEXIST') throw retryError;
      throw taken(lockHolder());
    }
  }

  return () => fs.rmSync(LOCK, { force: true });
}

// The bake or apply that holds the lock, while its process lives.
export function lockHolder() {
  let holder = null;
  try {
    holder = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  } catch {}

  return holder?.pid && isAlive(holder.pid) ? holder : null;
}

// The token is only in this git's environment, never on disk, and git's credential helper gives it to github.com
// only. No hooks, so no checked-out code runs with it.
export function gitWithToken(token, args) {
  if (!token) throw new Error('GITHUB_TOKEN is required to fetch the private enterprise submodule');
  run(
    'git',
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'url.https://github.com/.insteadOf=git@github.com:',
      '-c',
      'credential.helper=',
      '-c',
      'credential.https://github.com.helper=!f() { echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f',
      ...args,
    ],
    { env: { ...env, GITHUB_TOKEN: token } }
  );
}

// `ref`: a PR number, branch, tag or SHA.
export function fetchRef(ref) {
  const refspec = /^\d+$/.test(ref) ? `pull/${ref}/head` : ref;
  run('git', ['fetch', '--filter=blob:none', 'origin', refspec]);

  return output('git', ['rev-parse', 'FETCH_HEAD']);
}
