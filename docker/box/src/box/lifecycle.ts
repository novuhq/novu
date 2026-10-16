// A box's life inside its container: `bake` makes the golden /data and `start` boots it.

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { log } from '../node/main.ts';
import * as proc from '../node/process.ts';
import { type Baked, PackageJson } from '../shared/contracts.ts';
import { seedBridge, seedManagedAgent, syncBridge } from './bridge.ts';
import { build, buildBridge, deployApp, pnpmInstall, prepareDashboard } from './build.ts';
import { fetchRef, gitWithToken } from './git.ts';
import { lockHolder, withLock } from './lock.ts';
import {
  API_HEALTH,
  BAKED,
  BOX,
  BRIDGE_SECRET,
  BRIDGE_URL,
  BULLMQ_PRO,
  DATA,
  LOCK,
  MAIL_HOST,
  PC_SOCKET,
  REDIS_PORTS,
  REDIS_TLS,
  REPO,
  REPO_URL,
  RUN,
  SINK_URL,
  WORKER_HEALTH,
} from './paths.ts';
import { DEPLOYED_APPS, PROJECT_PROCESSES } from './processes.ts';
import { appendTiming, output, readJson, run, step, vars, waitForHttp } from './runtime.ts';
import { seedChannels, seedTeamTier } from './seed.ts';
import { seedClerk } from './seed-org.ts';
import { SOCKET } from './supervisor.ts';

// Bakes `ref` into an empty /data. `thenStart`: boot the box once baked, as the Cloudflare host's bake does.
export async function bake(ref: string, token: string | undefined, thenStart: boolean): Promise<number | undefined> {
  if (fs.existsSync(BAKED)) throw new Error(`${BAKED} exists; bake into an empty /data`);
  await withLock('bake', () => bakeLocked(ref, token));

  return thenStart ? start() : undefined;
}

async function bakeLocked(ref: string, token: string | undefined): Promise<void> {
  const sha = await step('clone', async () => {
    fs.mkdirSync(DATA, { recursive: true });
    if (!fs.existsSync(`${REPO}/.git`))
      await run('git', ['clone', '--filter=blob:none', '--no-checkout', REPO_URL, REPO], { cwd: DATA });
    const sha = await fetchRef(ref);
    await run('git', ['checkout', '--force', '--detach', sha]);

    return sha;
  });
  await step('enterprise submodule', () =>
    gitWithToken(token, ['submodule', 'update', '--init', '--depth', '1', '.source'])
  );
  await step('pnpm install', pnpmInstall);
  if (vars.BULL_MQ_PRO_NPM_TOKEN) await step('bullmq pro', installBullMqPro);
  else log('WARN: no BULL_MQ_PRO_NPM_TOKEN; the box runs open-source BullMQ without NOVU_MANAGED_SERVICE');
  await step('build', () => build(Object.keys(PROJECT_PROCESSES)));
  await step('build bridge', buildBridge);
  await step('deploy api worker', async () => {
    for (const name of Object.keys(DEPLOYED_APPS)) await deployApp(name);
  });
  await prepareRuntime();

  const supervisor = startSupervisor();
  try {
    await step('first boot', () => waitForHttp(API_HEALTH, 300));
    const userToken = await step('seed Clerk user and org', seedClerk);
    await step('seed email (Mailpit), SMS, push and chat (sink)', () => seedChannels(userToken));
    await step('seed bridge app (framework)', () => seedBridge(userToken));
    await step('seed Team tier (Stripe)', () => seedTeamTier(userToken));
  } finally {
    await step('shutdown', supervisor.stop);
  }

  const baked: Baked = { ref, sha, at: new Date().toISOString() };
  fs.writeFileSync(BAKED, JSON.stringify(baked, null, 2));
  log(`baked ${ref} at ${sha}`);
}

// `process-compose up` with the box's environment as it is now. Stopping it stops the processes in order, the
// stores last, each within its own timeout (image/process-compose.yaml).
function startSupervisor(): { exited: Promise<number>; stop: () => Promise<void> } {
  const stopper = new AbortController();
  const args = ['up', '--tui=false', '--keep-project', '--config', `${BOX}/process-compose.yaml`, ...SOCKET];
  const exited = proc.exitCode('process-compose', args, {
    cwd: RUN,
    env: { ...vars },
    stdio: 'inherit',
    graceMs: 200_000,
    signal: stopper.signal,
  });

  return {
    exited,
    stop: async () => {
      stopper.abort();
      await exited.catch(() => {});
    },
  };
}

// .npmrc-cloud references ${BULL_MQ_PRO_NPM_TOKEN}, so the token itself never reaches the disk.
async function installBullMqPro(): Promise<void> {
  const pkg = readJson(`${REPO}/libs/application-generic/package.json`, PackageJson);
  const version = pkg?.optionalDependencies?.['@taskforcesh/bullmq-pro'];
  if (!version) throw new Error("libs/application-generic doesn't name a @taskforcesh/bullmq-pro version");
  fs.rmSync(BULLMQ_PRO, { recursive: true, force: true });
  fs.mkdirSync(BULLMQ_PRO, { recursive: true });
  fs.copyFileSync(`${REPO}/.npmrc-cloud`, `${BULLMQ_PRO}/.npmrc`);
  await run('npm', ['init', '-y'], { cwd: BULLMQ_PRO, stdio: 'ignore' });
  await run('npm', ['install', '--no-fund', '--no-audit', `@taskforcesh/bullmq-pro@${version}`], { cwd: BULLMQ_PRO });
  vars.NOVU_MANAGED_SERVICE = 'true';
}

// One self-signed cert for every Redis node, which is also the CA the nodes and the apps (NODE_EXTRA_CA_CERTS) trust.
async function ensureRedisTls(): Promise<void> {
  if (fs.existsSync(`${REDIS_TLS}/box.crt`)) return;
  fs.mkdirSync(REDIS_TLS, { recursive: true });
  const subject = '-subj /CN=localhost -addext subjectAltName=IP:127.0.0.1,DNS:localhost';
  await run(
    'openssl',
    `req -x509 -newkey rsa:2048 -nodes -days 3650 ${subject} -keyout box.key -out box.crt`.split(' '),
    {
      cwd: REDIS_TLS,
      stdio: 'ignore',
    }
  );
}

async function prepareRuntime(): Promise<void> {
  const dirs = [
    'logs',
    'run',
    'mongo',
    ...REDIS_PORTS.map((port) => `redis/${port}`),
    'clickhouse',
    's3',
    'sqs',
    'mail',
  ];
  for (const dir of [...dirs, 'pnpm-store']) fs.mkdirSync(`${DATA}/${dir}`, { recursive: true });

  // A filesystem snapshot keeps the lock and socket files of processes that are no longer running, and git's
  // index.lock when it cut a checkout off. PIDs start over, so a lock from before it could name a live process; only
  // the bake that calls this holds one now.
  const pm2Homes = fs
    .readdirSync(RUN)
    .filter((name) => name.startsWith('pm2-'))
    .map((name) => `${RUN}/${name}`);
  const ownLock = lockHolder()?.pid === process.pid;
  const stale = [`${DATA}/mongo/mongod.lock`, `${DATA}/clickhouse/status`, `${REPO}/.git/index.lock`, PC_SOCKET];
  for (const file of [...stale, ...(ownLock ? [] : [LOCK]), ...pm2Homes])
    fs.rmSync(file, { recursive: true, force: true });

  await ensureRedisTls();
  const bundle = `${RUN}/ca-bundle.pem`;
  const platformCa = process.env.NODE_EXTRA_CA_CERTS;
  fs.writeFileSync(
    bundle,
    [
      fs.readFileSync(`${REDIS_TLS}/box.crt`, 'utf8'),
      platformCa && fs.existsSync(platformCa) ? fs.readFileSync(platformCa, 'utf8') : '',
    ].join('\n')
  );
  vars.NODE_EXTRA_CA_CERTS = bundle;

  // S3 keys are new on every start and exist only in the env of this process tree, so nobody outside the box
  // can sign S3 requests. Browsers only ever get presigned URLs, and stored objects don't depend on the keys.
  vars.AWS_ACCESS_KEY_ID = randomBytes(10).toString('hex');
  vars.AWS_SECRET_ACCESS_KEY = randomBytes(20).toString('hex');

  // The signing secret of `stripe listen` (the `stripe` process) for this key; Stripe returns the same one every time.
  vars.STRIPE_CONNECT_SECRET = await output('stripe', ['listen', '--print-secret', '--skip-update']);

  await addHosts();
  prepareDashboard();

  fs.writeFileSync(
    `${REPO}/enterprise/workers/socket/.dev.vars`,
    `JWT_SECRET=${vars.JWT_SECRET}\nINTERNAL_API_KEY=${vars.INTERNAL_SERVICES_API_KEY}\n`
  );
  fs.writeFileSync(`${REPO}/enterprise/workers/thalamus-observer/.dev.vars`, `API_KEY=${vars.THALAMUS_CF_API_KEY}\n`);
}

// The SSRF guards reject localhost and literal private IPs, so Mailpit, the sink and the bridge app are
// reached by names in NOVU_SAFE_OUTBOUND_ALLOW. Cloudflare mounts /etc/hosts read-only, so there a writable copy
// is bound over it (the container has CAP_SYS_ADMIN); the mount lasts until the container stops.
async function addHosts(): Promise<void> {
  const hosts = fs.readFileSync('/etc/hosts', 'utf8');
  const missing = [MAIL_HOST, new URL(SINK_URL).hostname, new URL(BRIDGE_URL).hostname].filter(
    (host) => !hosts.includes(` ${host}`)
  );
  if (!missing.length) return;
  const lines = missing.map((host) => `127.0.0.1 ${host}\n`).join('');
  try {
    fs.appendFileSync('/etc/hosts', lines);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EROFS')) throw error;
    fs.writeFileSync(`${RUN}/hosts`, hosts + lines);
    await run('mount', ['--bind', `${RUN}/hosts`, '/etc/hosts']);
  }
}

// The image's default command: boots every process and runs until process-compose exits. A SIGTERM stops
// process-compose, which stops the processes in order.
export async function start(): Promise<number> {
  if (!fs.existsSync(BAKED)) throw new Error('No golden data in /data. Run `box bake` first.');
  const started = Date.now();
  await prepareRuntime();
  const supervisor = startSupervisor();
  // The box lives as long as process-compose, ready or not.
  const exited = new AbortController();
  supervisor.exited.finally(() => exited.abort()).catch(() => {});
  try {
    await waitForHttp(API_HEALTH, 600, exited.signal);
    await waitForHttp(WORKER_HEALTH, 600, exited.signal);
  } catch (error) {
    if (exited.signal.aborted) return supervisor.exited;
    await supervisor.stop();
    throw error;
  }
  const seconds = (Date.now() - started) / 1000;
  appendTiming('api+worker healthy', seconds, 'start');
  log(`box ready in ${seconds.toFixed(1)}s`);
  // The API keeps the workflows and agents of the last sync; sync again so they match the bridge running now.
  if (fs.existsSync(BRIDGE_SECRET))
    await syncBridge().catch((error) => log(`WARN: bridge sync failed: ${error.message}`));
  if (vars.NOVU_MANAGED_CLAUDE_API_KEY)
    await seedManagedAgent().catch((error) => log(`WARN: managed agent seed failed: ${error.message}`));

  return supervisor.exited;
}
