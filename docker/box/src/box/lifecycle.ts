// A box's life inside its container: `bake` makes the golden /data, `start` boots it, `quiesce` and `resume` stop
// and restart it around a snapshot, and `state` and `doctor` report on it.

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { Effect, type Redacted } from 'effect';
import { Applied, Applying, Baked, type BoxState, type DoctorReport } from '../shared/contracts.ts';
import { runnable } from './apply.ts';
import { build, buildBridge, deployApp, pnpmInstall, prepareDashboard } from './build.ts';
import { BoxError } from './errors.ts';
import { fetchRef, gitWithToken } from './git.ts';
import { holdLock, isAlive, lockHolder } from './lock.ts';
import {
  API_HEALTH,
  APPLIED,
  APPLYING,
  BAKED,
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
import { APPS, DEPLOYED_APPS, PROCESSES, PROJECT_PROCESSES, STORES } from './processes.ts';
import { appendTiming, BoxEnv, httpStatus, log, poll, readJson, Shell, step, waitForHttp } from './runtime.ts';
import { seedBridge, seedChannels, seedClerk, seedManagedAgent, seedTeamTier, syncBridge } from './seed.ts';
import { ProcessCompose } from './supervisor.ts';

// Bakes `ref` into an empty /data. `start`: boot the box once baked, as the Cloudflare host's bake does.
export const bake = Effect.fn('bake')(function* (
  ref: string,
  { token, start: thenStart }: { token: Redacted.Redacted<string> | undefined; start: boolean }
) {
  if (fs.existsSync(BAKED)) return yield* new BoxError({ message: `${BAKED} exists; bake into an empty /data` });
  yield* Effect.scoped(
    Effect.gen(function* () {
      const shell = yield* Shell;
      const supervisor = yield* ProcessCompose;
      const { vars } = yield* BoxEnv;
      yield* holdLock('bake');
      const sha = yield* step(
        'clone',
        Effect.gen(function* () {
          fs.mkdirSync(DATA, { recursive: true });
          if (!fs.existsSync(`${REPO}/.git`))
            yield* shell.run('git', ['clone', '--filter=blob:none', '--no-checkout', REPO_URL, REPO], { cwd: DATA });
          const sha = yield* fetchRef(ref);
          yield* shell.run('git', ['checkout', '--force', '--detach', sha]);

          return sha;
        })
      );
      yield* step(
        'enterprise submodule',
        gitWithToken(token, ['submodule', 'update', '--init', '--depth', '1', '.source'])
      );
      yield* step('pnpm install', pnpmInstall);
      if (vars.BULL_MQ_PRO_NPM_TOKEN) yield* step('bullmq pro', installBullMqPro);
      else log('WARN: no BULL_MQ_PRO_NPM_TOKEN; the box runs open-source BullMQ without NOVU_MANAGED_SERVICE');
      yield* step('build', build(Object.keys(PROJECT_PROCESSES)));
      yield* step('build bridge', buildBridge);
      yield* step(
        'deploy api worker',
        Effect.forEach(Object.keys(DEPLOYED_APPS), (name) => deployApp(name), { discard: true })
      );
      yield* prepareRuntime;

      yield* Effect.scoped(
        Effect.gen(function* () {
          const running = yield* supervisor.up;
          yield* step('first boot', waitForHttp(API_HEALTH, 300));
          const userToken = yield* step('seed Clerk user and org', seedClerk);
          yield* step('seed email (Mailpit), SMS, push and chat (sink)', seedChannels(userToken));
          yield* step('seed bridge app (framework)', seedBridge(userToken));
          yield* step('seed Team tier (Stripe)', seedTeamTier(userToken));
          yield* step('shutdown', Effect.andThen(Effect.ignore(running.kill()), Effect.ignore(running.exitCode)));
        })
      );

      const baked: Baked = { ref, sha, at: new Date().toISOString() };
      fs.writeFileSync(BAKED, JSON.stringify(baked, null, 2));
      log(`baked ${ref} at ${sha}`);
    })
  );
  if (thenStart) yield* start;
});

// .npmrc-cloud references ${BULL_MQ_PRO_NPM_TOKEN}, so the token itself never reaches the disk.
const installBullMqPro = Effect.gen(function* () {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  const pkg = JSON.parse(fs.readFileSync(`${REPO}/libs/application-generic/package.json`, 'utf8'));
  const version = pkg.optionalDependencies['@taskforcesh/bullmq-pro'];
  fs.rmSync(BULLMQ_PRO, { recursive: true, force: true });
  fs.mkdirSync(BULLMQ_PRO, { recursive: true });
  fs.copyFileSync(`${REPO}/.npmrc-cloud`, `${BULLMQ_PRO}/.npmrc`);
  yield* shell.run('npm', ['init', '-y'], { cwd: BULLMQ_PRO, stdio: 'ignore' });
  yield* shell.run('npm', ['install', '--no-fund', '--no-audit', `@taskforcesh/bullmq-pro@${version}`], {
    cwd: BULLMQ_PRO,
  });
  vars.NOVU_MANAGED_SERVICE = 'true';
});

// One self-signed cert for every Redis node, which is also the CA the nodes and the apps (NODE_EXTRA_CA_CERTS) trust.
const ensureRedisTls = Effect.gen(function* () {
  if (fs.existsSync(`${REDIS_TLS}/box.crt`)) return;
  const shell = yield* Shell;
  fs.mkdirSync(REDIS_TLS, { recursive: true });
  const subject = '-subj /CN=localhost -addext subjectAltName=IP:127.0.0.1,DNS:localhost';
  yield* shell.run(
    'openssl',
    `req -x509 -newkey rsa:2048 -nodes -days 3650 ${subject} -keyout box.key -out box.crt`.split(' '),
    { cwd: REDIS_TLS, stdio: 'ignore' }
  );
});

const prepareRuntime = Effect.gen(function* () {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
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
  ])
    fs.mkdirSync(`${DATA}/${dir}`, { recursive: true });

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
  ])
    fs.rmSync(file, { recursive: true, force: true });

  yield* ensureRedisTls;
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
  vars.STRIPE_CONNECT_SECRET = yield* shell.output('stripe', ['listen', '--print-secret', '--skip-update']);

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
      if ((error as NodeJS.ErrnoException).code !== 'EROFS') throw error;
      fs.writeFileSync(`${RUN}/hosts`, hosts + lines);
      yield* shell.run('mount', ['--bind', `${RUN}/hosts`, '/etc/hosts']);
    }
  }

  yield* prepareDashboard;

  fs.writeFileSync(
    `${REPO}/enterprise/workers/socket/.dev.vars`,
    `JWT_SECRET=${vars.JWT_SECRET}\nINTERNAL_API_KEY=${vars.INTERNAL_SERVICES_API_KEY}\n`
  );
  fs.writeFileSync(`${REPO}/enterprise/workers/thalamus-observer/.dev.vars`, `API_KEY=${vars.THALAMUS_CF_API_KEY}\n`);
});

// The image's default command: boots every process and runs until process-compose exits (or a SIGTERM, which
// goes to process-compose; it stops the processes in order).
export const start = Effect.gen(function* () {
  if (!fs.existsSync(BAKED)) return yield* new BoxError({ message: 'No golden data in /data. Run `box bake` first.' });
  const supervisor = yield* ProcessCompose;
  const { vars } = yield* BoxEnv;
  const started = Date.now();
  yield* prepareRuntime;
  const running = yield* supervisor.up;
  const ready = Effect.gen(function* () {
    yield* waitForHttp(API_HEALTH, 600);
    yield* waitForHttp(WORKER_HEALTH, 600);
    const seconds = (Date.now() - started) / 1000;
    appendTiming('api+worker healthy', seconds, 'start');
    log(`box ready in ${seconds.toFixed(1)}s`);
    // The API keeps the workflows and agents of the last sync; sync again so they match the bridge running now.
    if (fs.existsSync(BRIDGE_SECRET))
      yield* syncBridge.pipe(
        Effect.catch((error) => Effect.sync(() => log(`WARN: bridge sync failed: ${error.message}`)))
      );
    if (vars.NOVU_MANAGED_CLAUDE_API_KEY)
      yield* seedManagedAgent.pipe(
        Effect.catch((error) => Effect.sync(() => log(`WARN: managed agent seed failed: ${error.message}`)))
      );
  });
  // The box lives as long as process-compose, ready or not.
  const exited = Effect.map(running.exitCode.pipe(Effect.orElseSucceed(() => 1)), Number);
  process.exitCode = yield* Effect.raceFirst(exited, Effect.andThen(ready, exited));
}).pipe(Effect.scoped);

// What `box state` prints, as JSON: the baked and applied commits, an apply that didn't finish, and the bake or
// apply that runs now. It reads files only, so it answers before the supervisor is up and after `quiesce`.
export const state = Effect.gen(function* () {
  const report: BoxState = {
    baked: yield* readJson(BAKED, Baked),
    applied: yield* readJson(APPLIED, Applied),
    applying: yield* readJson(APPLYING, Applying),
    lock: lockHolder(),
  };

  return report;
});

// Whether the box is fit to test on, as JSON: no bake or apply running or an apply left half done, every process up
// (and ready, if it has a probe), and the API, dashboard and bridge app answering. `problems` says what isn't; it
// exits 1 if any.
export const doctor = Effect.gen(function* () {
  const supervisor = yield* ProcessCompose;
  const problems: Array<string> = [];
  const { baked, applied, applying, lock } = yield* state;
  if (lock) problems.push(`a ${lock.command} is running (pid ${lock.pid})`);
  if (applying && !lock)
    problems.push(`the apply of ${applying.sha.slice(0, 10)} didn't finish; apply again to finish it`);

  const list = yield* supervisor.list;
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
  problems.push(...processes.flatMap((entry) => processProblem(entry) ?? []));

  const http: Record<string, number> = {};
  const urls = { api: API_HEALTH, dashboard: 'http://127.0.0.1:4200/', bridge: 'http://127.0.0.1:4000/api/novu' };
  for (const [name, url] of Object.entries(urls)) {
    http[name] = yield* httpStatus(url);
    if (http[name] !== 200) problems.push(`${name} answered ${http[name] || 'nothing'} at ${url}`);
  }

  const report: DoctorReport = { ok: !problems.length, problems, baked, applied, http, processes };
  console.log(JSON.stringify(report, null, 2));
  if (problems.length) process.exitCode = 1;
});

// Only migrate runs once; any other process that completed was stopped or exited, whatever its exit code.
function processProblem({ name, status, ready, exitCode }: DoctorReport['processes'][number]): string | undefined {
  if (status === 'Completed' && name !== 'migrate') return `${name} stopped (exit ${exitCode})`;
  if (status === 'Completed' ? exitCode !== 0 : status !== 'Running' || ready === 'Not Ready')
    return `${name} is ${status === 'Running' ? 'not ready' : status}`;
  return undefined;
}

function processTableProblems(names: ReadonlyArray<string>): Array<string> {
  const unknown = names.filter((name) => !PROCESSES[name]);
  const missing = Object.keys(PROCESSES).filter((name) => !names.includes(name));

  return [
    ...(unknown.length ? [`processes.ts's PROCESSES lacks ${unknown.join(', ')} from process-compose.yaml`] : []),
    ...(missing.length ? [`process-compose.yaml lacks ${missing.join(', ')} from processes.ts's PROCESSES`] : []),
  ];
}

// Stops the apply that runs and everything it started, within a minute; CI calls it when a newer push supersedes
// the one being applied. The apply was started detached (src/shared/names.ts), so its pid is its process group. The
// next apply takes over its lock and redoes its files (.applying.json).
export const stopApply = Effect.gen(function* () {
  const holder = lockHolder();
  if (holder?.command !== 'apply') return;
  // An apply started without `setsid` (by hand) has no process group of its own: then only its pid.
  const signal = (name: NodeJS.Signals) => {
    for (const pid of [-holder.pid, holder.pid])
      try {
        process.kill(pid, name);
      } catch {}
  };
  const gone = Effect.sync(() => !isAlive(-holder.pid) && !isAlive(holder.pid));
  signal('SIGTERM');
  yield* poll(60, gone, '').pipe(Effect.catchTag('TimedOut', () => Effect.sync(() => signal('SIGKILL'))));
  yield* poll(10, gone, `the apply ${holder.pid} outlived SIGKILL`);
  log(`stopped the apply of an older push (pid ${holder.pid})`);
});

// Stops every process, the stores last, leaving the supervisor up for a snapshot.
export const quiesce = Effect.gen(function* () {
  const supervisor = yield* ProcessCompose;
  yield* supervisor.stopRunning(APPS);
  yield* supervisor.stopRunning(STORES);
});

// Starts again what `quiesce` stopped, when the box keeps running after all (saving it failed): the stores, then,
// once they are ready, the rest. `migrate` already ran on this data.
export const resume = Effect.gen(function* () {
  const supervisor = yield* ProcessCompose;
  const notRunning = (names: ReadonlyArray<string>) =>
    Effect.map(supervisor.running, (running) => names.filter((name) => !running.has(name)));
  for (const name of yield* notRunning(STORES)) yield* supervisor.pc(['process', 'start', name]);
  yield* poll(120, supervisor.storesReady, 'the stores are not ready after 120s');
  const apps = (yield* runnable(new Set(APPS))).filter((name) => name !== 'migrate');
  for (const name of yield* notRunning(apps)) yield* supervisor.pc(['process', 'start', name]);
  yield* waitForHttp(API_HEALTH, 300);
  log('resumed');
});
