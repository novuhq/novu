#!/usr/bin/env node
// Novu Box, the commands that run inside the box. Plain Node, no npm dependencies. From your machine, use
// `cli.mjs`, which calls these.
//
//   box bake [ref]              clone ref (default next), install, build, migrate, seed  -> golden /data
//   box start                   boot every process (the image's default command)
//   box apply <pr|branch|sha>   on a running box: merge a PR onto the baked commit, rebuild and restart what changed
//   box apply --bundle <file>   the same for a bundle from `cli.mjs sync` (a checkout's changes)
//   box state                   the baked and applied commits, as JSON
//   box doctor                  whether the box is fit to test on, as JSON; exits 1 if not
//   box logs [process]          the last lines of one process, or of all of them (--tail <n>, default 200;
//                               --follow; --errors for warnings and errors only)
//   box quiesce                 stop every process, the data stores last, leaving the supervisor up for a snapshot
//   box resume                  start again what quiesce stopped (when the snapshot failed)
//   box status                  list processes
//   box migrate                 replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket
//                               (run by process-compose before the apps)
//
// apply.mjs, seed.mjs, migrate.mjs and logs.mjs hold the rest and import their constants and helpers from here, so
// nothing at their top level may use an import from this file: it isn't initialized yet when they load.

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { apply, build, buildBridge, deployApp, isAlive, pnpmInstall, runnable } from './apply.mjs';
import { logs } from './logs.mjs';
import { migrate } from './migrate.mjs';
import {
  seedBridge,
  seedChannels,
  seedClerk,
  seedEmailIntegration,
  seedManagedAgent,
  seedTeamTier,
  syncBridge,
} from './seed.mjs';

const BOX = process.env.BOX_HOME ?? '/opt/box';
export const DATA = '/data';
export const REPO = `${DATA}/novu`;
// nx itself, not through `pnpm nx`, which adds a pnpm start to every call.
export const NX = 'node_modules/.bin/nx';
export const BAKED = `${DATA}/.baked.json`;
export const APPLIED = `${DATA}/.applied.json`;
// Written before an apply checks out its commit and removed when it succeeds; see `apply`.
export const APPLYING = `${DATA}/.applying.json`;
export const MIGRATED = `${DATA}/.migrated`;
export const RUN = `${DATA}/run`;
export const APPLY_LOCK = `${RUN}/apply.lock`;
const PC_SOCKET = `${RUN}/process-compose.sock`;
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
// Every process in process-compose.yaml (`doctor` checks the two match). A store keeps data under /data: it stops
// after everything else, so its files are whole in a snapshot. `projects`: the nx projects whose build it runs;
// `paths`: files no nx project covers that change it (the workers have no nx build, and playground/ is in
// .nxignore); `deploy`: the package `pnpm deploy` puts under /data/deploy for it.
const PROCESSES = {
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
const STORES = processesWhere((entry) => entry.kind === 'store');
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

// The caller's token can push to novuhq/novu, and the box runs PR code (install scripts, builds, the apps), so it is
// taken out of the environment every child gets and passed only to the git calls that need it and the CI lookup.
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
delete process.env.GITHUB_TOKEN;
export const env = loadEnv();

function loadEnv() {
  const defaults = {};
  for (const line of fs.readFileSync(`${BOX}/config/box.env`, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) defaults[match[1]] = match[2];
  }
  // Production switches BullMQ to Pro (job groups) and turns off TTL indexes with this flag.
  if (fs.existsSync(`${BULLMQ_PRO}/node_modules/@taskforcesh/bullmq-pro`)) defaults.NOVU_MANAGED_SERVICE = 'true';

  return { ...defaults, ...process.env };
}

export function log(message) {
  console.log(`[box] ${new Date().toISOString()} ${message}`);
}

export function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env, cwd: REPO, ...options });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
}

export function runAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: REPO, ...options });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code ?? signal}`))
    );
  });
}

export function output(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', env, cwd: REPO, ...options });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${result.stderr}`);

  return result.stdout.trim();
}

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

export function pc(args, options) {
  run('process-compose', [...args, '--use-uds', '--unix-socket', PC_SOCKET], { cwd: RUN, ...options });
}

// process-compose writes every process's output to one file, a JSON line each ({process, message}); its own lines
// have no process. The apps (pino) and Caddy log JSON themselves. This prints `name | LEVEL context: message`.
export const PC_LOG = `${DATA}/logs/process-compose.log`;

export function processList() {
  return JSON.parse(
    output('process-compose', ['process', 'list', '-o', 'json', '--use-uds', '--unix-socket', PC_SOCKET], { cwd: RUN })
  );
}

// GITHUB_TOKEN is only read from the environment of this command; it is never written to disk. No hooks, so no
// checked-out code runs with it.
export function gitWithToken(args) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required to fetch the private enterprise submodule');
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
      'credential.helper=!f() { echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f',
      ...args,
    ],
    { env: { ...env, GITHUB_TOKEN } }
  );
}

export function fetchRef(ref) {
  const refspec = /^\d+$/.test(ref) ? `pull/${ref}/head` : ref;
  run('git', ['fetch', '--filter=blob:none', 'origin', refspec]);

  return output('git', ['rev-parse', 'FETCH_HEAD']);
}

// .npmrc-cloud references ${BULL_MQ_PRO_NPM_TOKEN}, so the token itself never reaches the disk.
function installBullMqPro() {
  const pkg = JSON.parse(fs.readFileSync(`${REPO}/libs/application-generic/package.json`, 'utf8'));
  const version = pkg.optionalDependencies['@taskforcesh/bullmq-pro'];
  fs.rmSync(BULLMQ_PRO, { recursive: true, force: true });
  fs.mkdirSync(BULLMQ_PRO, { recursive: true });
  fs.copyFileSync(`${REPO}/.npmrc-cloud`, `${BULLMQ_PRO}/.npmrc`);
  run('npm', ['init', '-y'], { cwd: BULLMQ_PRO, stdio: 'ignore' });
  run('npm', ['install', '--no-fund', '--no-audit', `@taskforcesh/bullmq-pro@${version}`], { cwd: BULLMQ_PRO });
  env.NOVU_MANAGED_SERVICE = 'true';
}

// One self-signed cert for every Redis node, which is also the CA the nodes and the apps (NODE_EXTRA_CA_CERTS) trust.
function ensureRedisTls() {
  if (fs.existsSync(`${REDIS_TLS}/box.crt`)) return;
  fs.mkdirSync(REDIS_TLS, { recursive: true });
  const subject = '-subj /CN=localhost -addext subjectAltName=IP:127.0.0.1,DNS:localhost';
  run('openssl', `req -x509 -newkey rsa:2048 -nodes -days 3650 ${subject} -keyout box.key -out box.crt`.split(' '), {
    cwd: REDIS_TLS,
    stdio: 'ignore',
  });
}

function prepareRuntime() {
  for (const dir of [
    'logs',
    'run',
    'mongo',
    ...REDIS_PORTS.map((port) => `redis/${port}`),
    'clickhouse',
    's3',
    'sqs',
    'mail',
    'pnpm-store',
  ]) {
    fs.mkdirSync(`${DATA}/${dir}`, { recursive: true });
  }

  // A filesystem snapshot keeps lock and socket files of processes that are no longer running. PIDs start over, so
  // an apply lock from before it could name a live process.
  const pm2Homes = fs
    .readdirSync(RUN)
    .filter((name) => name.startsWith('pm2-'))
    .map((name) => `${RUN}/${name}`);
  for (const file of [`${DATA}/mongo/mongod.lock`, `${DATA}/clickhouse/status`, PC_SOCKET, APPLY_LOCK, ...pm2Homes]) {
    fs.rmSync(file, { recursive: true, force: true });
  }

  ensureRedisTls();
  const bundle = `${RUN}/ca-bundle.pem`;
  const platformCa = process.env.NODE_EXTRA_CA_CERTS;
  fs.writeFileSync(
    bundle,
    [
      fs.readFileSync(`${REDIS_TLS}/box.crt`, 'utf8'),
      platformCa && fs.existsSync(platformCa) ? fs.readFileSync(platformCa, 'utf8') : '',
    ].join('\n')
  );
  env.NODE_EXTRA_CA_CERTS = bundle;

  // S3 keys are new on every start and exist only in the env of this process tree, so nobody outside the box
  // can sign S3 requests. Browsers only ever get presigned URLs, and stored objects don't depend on the keys.
  env.AWS_ACCESS_KEY_ID = randomBytes(10).toString('hex');
  env.AWS_SECRET_ACCESS_KEY = randomBytes(20).toString('hex');

  // The signing secret of `stripe listen` (the `stripe` process) for this key; Stripe returns the same one every time.
  env.STRIPE_CONNECT_SECRET = output('stripe', ['listen', '--print-secret', '--skip-update']);

  // The SSRF guards reject localhost and literal private IPs, so Mailpit, the sink and the bridge app are
  // reached by names in NOVU_SAFE_OUTBOUND_ALLOW. Cloudflare mounts /etc/hosts read-only, so there a writable copy
  // is bound over it (the container has CAP_SYS_ADMIN); the mount lasts until the container stops.
  const hosts = fs.readFileSync('/etc/hosts', 'utf8');
  const missing = [MAIL_HOST, new URL(SINK_URL).hostname, new URL(BRIDGE_URL).hostname].filter(
    (host) => !hosts.includes(` ${host}`)
  );
  if (missing.length) {
    const lines = missing.map((host) => `127.0.0.1 ${host}\n`).join('');
    try {
      fs.appendFileSync('/etc/hosts', lines);
    } catch (error) {
      if (error.code !== 'EROFS') throw error;
      fs.writeFileSync(`${RUN}/hosts`, hosts + lines);
      run('mount', ['--bind', `${RUN}/hosts`, '/etc/hosts']);
    }
  }

  prepareDashboard();

  fs.writeFileSync(
    `${REPO}/enterprise/workers/socket/.dev.vars`,
    `JWT_SECRET=${env.JWT_SECRET}\nINTERNAL_API_KEY=${env.INTERNAL_SERVICES_API_KEY}\n`
  );
  fs.writeFileSync(`${REPO}/enterprise/workers/thalamus-observer/.dev.vars`, `API_KEY=${env.THALAMUS_CF_API_KEY}\n`);
}

// Same job as apps/dashboard/docker-entrypoint.sh: expose VITE_* runtime env as window._env_.
export function prepareDashboard() {
  const target = `${RUN}/dashboard`;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/dashboard/dist`, target, { recursive: true });

  const viteEnv = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('VITE_')));
  const script = `<script>window._env_ = ${JSON.stringify(viteEnv).replace(/</g, '\\u003c')};</script>`;
  const indexFile = `${target}/index.html`;
  const html = fs.readFileSync(indexFile, 'utf8').replace('<script type="module"', `${script}\n<script type="module"`);
  fs.writeFileSync(indexFile, html);
  writeBoxJson();
}

// The baked and applied commits, for the dashboard (served at /__box.json).
export function writeBoxJson() {
  fs.writeFileSync(
    `${RUN}/dashboard/__box.json`,
    JSON.stringify({ baked: readJson(BAKED), applied: readJson(APPLIED) })
  );
}

function startSupervisor() {
  const child = spawn(
    'process-compose',
    [
      'up',
      '--tui=false',
      '--keep-project',
      '--config',
      `${BOX}/process-compose.yaml`,
      '--use-uds',
      '--unix-socket',
      PC_SOCKET,
    ],
    { stdio: 'inherit', env, cwd: RUN }
  );
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));

  return child;
}

export async function waitForHttp(url, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${url} not healthy after ${timeoutSeconds}s`);
}

export async function bake(ref = 'next') {
  if (fs.existsSync(BAKED)) throw new Error(`${BAKED} exists; bake into an empty /data`);

  let sha;
  await step('clone', () => {
    fs.mkdirSync(DATA, { recursive: true });
    if (!fs.existsSync(`${REPO}/.git`))
      run('git', ['clone', '--filter=blob:none', '--no-checkout', REPO_URL, REPO], { cwd: DATA });
    sha = fetchRef(ref);
    run('git', ['checkout', '--force', '--detach', sha]);
  });
  await step('enterprise submodule', () => gitWithToken(['submodule', 'update', '--init', '--depth', '1', '.source']));
  await step('pnpm install', pnpmInstall);
  if (env.BULL_MQ_PRO_NPM_TOKEN) await step('bullmq pro', installBullMqPro);
  else log('WARN: no BULL_MQ_PRO_NPM_TOKEN; the box runs open-source BullMQ without NOVU_MANAGED_SERVICE');
  await step('build', () => build(Object.keys(PROJECT_PROCESSES)));
  await step('build bridge', buildBridge);
  await step('deploy api worker', () => Object.keys(DEPLOYED_APPS).forEach((name) => deployApp(name)));
  prepareRuntime();

  const supervisor = startSupervisor();
  await step('first boot', () => waitForHttp('http://127.0.0.1:3000/v1/health-check', 300));
  const token = await step('seed Clerk user and org', seedClerk);
  await step('seed Mailpit email integration', () => seedEmailIntegration(token));
  await step('seed SMS, push and chat (sink)', () => seedChannels(token));
  await step('seed bridge app (framework)', () => seedBridge(token));
  await step('seed Team tier (Stripe)', () => seedTeamTier(token));
  await step('shutdown', async () => {
    supervisor.kill('SIGTERM');
    await new Promise((resolve) => supervisor.on('exit', resolve));
  });

  fs.writeFileSync(BAKED, JSON.stringify({ ref, sha, at: new Date().toISOString() }, null, 2));
  log(`baked ${ref} at ${sha}`);
}

async function start() {
  if (!fs.existsSync(BAKED)) throw new Error('No golden data in /data. Run `box bake` first.');
  const started = Date.now();
  prepareRuntime();
  const supervisor = startSupervisor();
  supervisor.on('exit', (code) => process.exit(code ?? 1));
  await waitForHttp('http://127.0.0.1:3000/v1/health-check', 600);
  await waitForHttp('http://127.0.0.1:3004/v1/health-check', 600);
  const seconds = (Date.now() - started) / 1000;
  fs.appendFileSync(
    `${DATA}/logs/timings.jsonl`,
    `${JSON.stringify({ at: new Date().toISOString(), command: 'start', step: 'api+worker healthy', seconds })}\n`
  );
  log(`box ready in ${seconds.toFixed(1)}s`);
  // The API keeps the workflows and agents of the last sync; sync again so they match the bridge running now.
  if (fs.existsSync(BRIDGE_SECRET))
    await syncBridge().catch((error) => log(`WARN: bridge sync failed: ${error.message}`));
  if (env.NOVU_MANAGED_CLAUDE_API_KEY) {
    await seedManagedAgent().catch((error) => log(`WARN: managed agent seed failed: ${error.message}`));
  }
}

// Whether the box is fit to test on, as JSON: no apply running or left half done, every process up (and ready, if it
// has a probe), and the API, dashboard and bridge app answering. `problems` says what isn't; it exits 1 if any.
async function doctor() {
  const problems = [];
  const lock = fs.existsSync(APPLY_LOCK) ? Number(fs.readFileSync(APPLY_LOCK, 'utf8')) : null;
  if (lock && isAlive(lock)) problems.push(`an apply is running (pid ${lock})`);
  const applying = readJson(APPLYING);
  if (applying && !(lock && isAlive(lock)))
    problems.push(`the apply of ${applying.sha.slice(0, 10)} didn't finish; apply again to finish it`);

  const list = processList();
  problems.push(...processTableProblems(list.map((entry) => entry.name)));
  const processes = list
    .filter((entry) => entry.status !== 'Disabled')
    .map(({ name, status, is_ready: ready, exit_code: exitCode, restarts }) => ({
      name,
      status,
      ready,
      exitCode,
      restarts,
    }));
  for (const { name, status, ready, exitCode } of processes) {
    const healthy = status === 'Completed' ? exitCode === 0 : status === 'Running' && ready !== 'Not Ready';
    if (!healthy) problems.push(`${name} is ${status === 'Running' ? 'not ready' : status}`);
  }

  const http = {};
  const urls = {
    api: 'http://127.0.0.1:3000/v1/health-check',
    dashboard: 'http://127.0.0.1:4200/',
    bridge: 'http://127.0.0.1:4000/api/novu',
  };
  for (const [name, url] of Object.entries(urls)) {
    http[name] = await fetch(url, { signal: AbortSignal.timeout(5000) }).then(
      (response) => response.status,
      () => 0
    );
    if (http[name] !== 200) problems.push(`${name} answered ${http[name] || 'nothing'} at ${url}`);
  }

  console.log(
    JSON.stringify(
      { ok: !problems.length, problems, baked: readJson(BAKED), applied: readJson(APPLIED), http, processes },
      null,
      2
    )
  );
  if (problems.length) process.exitCode = 1;
}

function processTableProblems(names) {
  const unknown = names.filter((name) => !PROCESSES[name]);
  const missing = Object.keys(PROCESSES).filter((name) => !names.includes(name));

  return [
    ...(unknown.length ? [`box.mjs's PROCESSES lacks ${unknown.join(', ')} from process-compose.yaml`] : []),
    ...(missing.length ? [`process-compose.yaml lacks ${missing.join(', ')} from box.mjs's PROCESSES`] : []),
  ];
}

function runningProcesses() {
  return new Set(
    processList()
      .filter((entry) => entry.is_running)
      .map((entry) => entry.name)
  );
}

// Stops every process, the stores last, leaving the supervisor up for a snapshot. process-compose fails to stop a
// process that isn't running (a failed apply leaves apps stopped), so it stops only the running ones.
async function quiesce() {
  const others = Object.keys(PROCESSES).filter((name) => !STORES.includes(name));
  const runningOthers = others.filter((name) => runningProcesses().has(name));
  if (runningOthers.length)
    await step(`stop ${runningOthers.join(' ')}`, () => pc(['process', 'stop', ...runningOthers]));
  await waitUntilStopped(others);
  const running = runningProcesses();
  const stores = STORES.filter((name) => running.has(name));
  if (stores.length) await step(`stop ${stores.join(' ')}`, () => pc(['process', 'stop', ...stores]));
  await waitUntilStopped(Object.keys(PROCESSES));
}

// `process stop` returns while the processes still terminate, and a terminating process isn't `is_running`.
async function waitUntilStopped(names) {
  for (let second = 0; ; second++) {
    const left = processList()
      .filter((entry) => names.includes(entry.name) && (entry.is_running || entry.status === 'Terminating'))
      .map((entry) => entry.name);
    if (!left.length) return;
    if (second === 180) throw new Error(`still running 180s after the stop: ${left.join(' ')}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Starts again what `quiesce` stopped, when the box keeps running after all (saving it failed): the stores, then,
// once they are ready, the rest. `migrate` already ran on this data.
async function resume() {
  const notRunning = (names) => {
    const running = runningProcesses();

    return names.filter((name) => !running.has(name));
  };
  for (const name of notRunning(STORES)) pc(['process', 'start', name]);
  for (let attempt = 0; ; attempt++) {
    const ready = processList().filter((entry) => STORES.includes(entry.name) && entry.is_ready === 'Ready');
    if (ready.length === STORES.length) break;
    if (attempt === 120) throw new Error('the stores are not ready after 120s');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const apps = runnable(new Set(processesWhere((entry) => entry.kind === 'app'))).filter((name) => name !== 'migrate');
  for (const name of notRunning(apps)) pc(['process', 'start', name]);
  await waitForHttp('http://127.0.0.1:3000/v1/health-check', 300);
  log('resumed');
}

const commands = {
  bake: () => bake(process.argv[3]),
  start,
  migrate,
  apply: () => {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(3),
      options: { bundle: { type: 'string' }, full: { type: 'boolean' } },
      allowPositionals: true,
    });

    return apply({ ref: positionals[0], ...values });
  },
  state: () =>
    console.log(JSON.stringify({ baked: readJson(BAKED), applied: readJson(APPLIED), applying: readJson(APPLYING) })),
  doctor,
  logs: () => {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(3),
      options: {
        tail: { type: 'string', default: '200' },
        follow: { type: 'boolean', default: false },
        errors: { type: 'boolean', default: false },
      },
      allowPositionals: true,
    });

    return logs({ name: positionals[0], tail: Number(values.tail), follow: values.follow, errors: values.errors });
  },
  quiesce,
  resume,
  status: () => pc(['process', 'list']),
};

const command = commands[process.argv[2]];
if (!command) {
  console.error(`usage: box ${Object.keys(commands).join('|')}`);
  process.exit(2);
}

try {
  await command();
} catch (error) {
  log(`ERROR: ${error.message}`);
  process.exit(1);
}
