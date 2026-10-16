// A box's life inside its container: `bake` makes the golden /data, `start` boots it, `quiesce` and `resume` stop
// and restart it around a snapshot, and `state` and `doctor` report on it.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { build, buildBridge, deployApp, pnpmInstall, prepareDashboard } from './apply.mjs';
import {
  API_HEALTH,
  APPLIED,
  APPLYING,
  APPS,
  BAKED,
  BOX,
  BRIDGE_SECRET,
  BRIDGE_URL,
  BULLMQ_PRO,
  DATA,
  DEPLOYED_APPS,
  env,
  fetchRef,
  gitWithToken,
  holdLock,
  isAlive,
  LOCK,
  lockHolder,
  log,
  MAIL_HOST,
  output,
  PC_SOCKET,
  PROCESSES,
  PROJECT_PROCESSES,
  pc,
  poll,
  processList,
  REDIS_PORTS,
  REDIS_TLS,
  REPO,
  REPO_URL,
  RUN,
  readJson,
  run,
  runnable,
  runningProcesses,
  SINK_URL,
  STORES,
  step,
  stopRunning,
  storesReady,
  WORKER_HEALTH,
  waitForHttp,
} from './lib.mjs';
import {
  seedBridge,
  seedChannels,
  seedClerk,
  seedEmailIntegration,
  seedManagedAgent,
  seedTeamTier,
  syncBridge,
} from './seed.mjs';

// Bakes `ref` into an empty /data. `start`: boot the box once baked, as the Cloudflare Worker's bake does.
export async function bake(ref, { token, start: thenStart = false }) {
  if (fs.existsSync(BAKED)) throw new Error(`${BAKED} exists; bake into an empty /data`);
  const release = holdLock('bake');
  try {
    let sha;
    await step('clone', () => {
      fs.mkdirSync(DATA, { recursive: true });
      if (!fs.existsSync(`${REPO}/.git`))
        run('git', ['clone', '--filter=blob:none', '--no-checkout', REPO_URL, REPO], { cwd: DATA });
      sha = fetchRef(ref);
      run('git', ['checkout', '--force', '--detach', sha]);
    });
    await step('enterprise submodule', () =>
      gitWithToken(token, ['submodule', 'update', '--init', '--depth', '1', '.source'])
    );
    await step('pnpm install', pnpmInstall);
    if (env.BULL_MQ_PRO_NPM_TOKEN) await step('bullmq pro', installBullMqPro);
    else log('WARN: no BULL_MQ_PRO_NPM_TOKEN; the box runs open-source BullMQ without NOVU_MANAGED_SERVICE');
    await step('build', () => build(Object.keys(PROJECT_PROCESSES)));
    await step('build bridge', buildBridge);
    await step('deploy api worker', () => {
      for (const name of Object.keys(DEPLOYED_APPS)) deployApp(name);
    });
    prepareRuntime();

    const supervisor = startSupervisor();
    await step('first boot', () => waitForHttp(API_HEALTH, 300));
    const userToken = await step('seed Clerk user and org', seedClerk);
    await step('seed Mailpit email integration', () => seedEmailIntegration(userToken));
    await step('seed SMS, push and chat (sink)', () => seedChannels(userToken));
    await step('seed bridge app (framework)', () => seedBridge(userToken));
    await step('seed Team tier (Stripe)', () => seedTeamTier(userToken));
    await step('shutdown', async () => {
      supervisor.kill('SIGTERM');
      await new Promise((resolve) => supervisor.on('exit', resolve));
    });

    fs.writeFileSync(BAKED, JSON.stringify({ ref, sha, at: new Date().toISOString() }, null, 2));
    log(`baked ${ref} at ${sha}`);
  } finally {
    release();
  }
  if (thenStart) await start();
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

  // A filesystem snapshot keeps the lock and socket files of processes that are no longer running, and git's
  // index.lock when it cut a checkout off. PIDs start over, so a lock from before it could name a live process; only
  // the bake that calls this holds one now.
  const pm2Homes = fs
    .readdirSync(RUN)
    .filter((name) => name.startsWith('pm2-'))
    .map((name) => `${RUN}/${name}`);
  const ownLock = lockHolder()?.pid === process.pid;
  for (const file of [
    `${DATA}/mongo/mongod.lock`,
    `${DATA}/clickhouse/status`,
    `${REPO}/.git/index.lock`,
    PC_SOCKET,
    ...(ownLock ? [] : [LOCK]),
    ...pm2Homes,
  ]) {
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

export async function start() {
  if (!fs.existsSync(BAKED)) throw new Error('No golden data in /data. Run `box bake` first.');
  const started = Date.now();
  prepareRuntime();
  const supervisor = startSupervisor();
  supervisor.on('exit', (code) => process.exit(code ?? 1));
  await waitForHttp(API_HEALTH, 600);
  await waitForHttp(WORKER_HEALTH, 600);
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

// What `box state` prints, as JSON: the baked and applied commits, an apply that didn't finish, and the bake or
// apply that runs now. It reads files only, so it answers before the supervisor is up and after `quiesce`.
export function state() {
  return { baked: readJson(BAKED), applied: readJson(APPLIED), applying: readJson(APPLYING), lock: lockHolder() };
}

// Whether the box is fit to test on, as JSON: no bake or apply running or an apply left half done, every process up
// (and ready, if it has a probe), and the API, dashboard and bridge app answering. `problems` says what isn't; it
// exits 1 if any.
export async function doctor() {
  const problems = [];
  const { baked, applied, applying, lock } = state();
  if (lock) problems.push(`a ${lock.command} is running (pid ${lock.pid})`);
  if (applying && !lock)
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
  const urls = { api: API_HEALTH, dashboard: 'http://127.0.0.1:4200/', bridge: 'http://127.0.0.1:4000/api/novu' };
  for (const [name, url] of Object.entries(urls)) {
    http[name] = await fetch(url, { signal: AbortSignal.timeout(5000) }).then(
      (response) => response.status,
      () => 0
    );
    if (http[name] !== 200) problems.push(`${name} answered ${http[name] || 'nothing'} at ${url}`);
  }

  console.log(JSON.stringify({ ok: !problems.length, problems, baked, applied, http, processes }, null, 2));
  if (problems.length) process.exitCode = 1;
}

function processTableProblems(names) {
  const unknown = names.filter((name) => !PROCESSES[name]);
  const missing = Object.keys(PROCESSES).filter((name) => !names.includes(name));

  return [
    ...(unknown.length ? [`lib.mjs's PROCESSES lacks ${unknown.join(', ')} from process-compose.yaml`] : []),
    ...(missing.length ? [`process-compose.yaml lacks ${missing.join(', ')} from lib.mjs's PROCESSES`] : []),
  ];
}

// Stops the apply that runs and everything it started, within a minute; CI calls it when a newer push supersedes
// the one being applied. The apply was started detached (cloud/shared.mjs), so its pid is its process group. The
// next apply takes over its lock and redoes its files (.applying.json).
export async function stopApply() {
  const holder = lockHolder();
  if (holder?.command !== 'apply') return;
  const signalGroup = (signal) => {
    try {
      process.kill(-holder.pid, signal);
    } catch {}
  };
  signalGroup('SIGTERM');
  await poll(60, () => !isAlive(-holder.pid), '').catch(() => signalGroup('SIGKILL'));
  await poll(10, () => !isAlive(-holder.pid), `the apply's process group ${holder.pid} outlived SIGKILL`);
  log(`stopped the apply of an older push (pid ${holder.pid})`);
}

// Stops every process, the stores last, leaving the supervisor up for a snapshot.
export async function quiesce() {
  await stopRunning(APPS);
  await stopRunning(STORES);
}

// Starts again what `quiesce` stopped, when the box keeps running after all (saving it failed): the stores, then,
// once they are ready, the rest. `migrate` already ran on this data.
export async function resume() {
  const notRunning = (names) => {
    const running = runningProcesses();

    return names.filter((name) => !running.has(name));
  };
  for (const name of notRunning(STORES)) pc(['process', 'start', name]);
  await poll(120, storesReady, 'the stores are not ready after 120s');
  const apps = runnable(new Set(APPS)).filter((name) => name !== 'migrate');
  for (const name of notRunning(apps)) pc(['process', 'start', name]);
  await waitForHttp(API_HEALTH, 300);
  log('resumed');
}
