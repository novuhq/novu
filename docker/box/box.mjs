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

import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { clerk, findSeedUser, SEED, seedPassword, seedUserToken } from './clerk.mjs';

const BOX = process.env.BOX_HOME ?? '/opt/box';
const DATA = '/data';
const REPO = `${DATA}/novu`;
// nx itself, not through `pnpm nx`, which adds a pnpm start to every call.
const NX = 'node_modules/.bin/nx';
const BAKED = `${DATA}/.baked.json`;
const APPLIED = `${DATA}/.applied.json`;
// Written before an apply checks out its commit and removed when it succeeds; see `apply`.
const APPLYING = `${DATA}/.applying.json`;
const MIGRATED = `${DATA}/.migrated`;
const RUN = `${DATA}/run`;
const APPLY_LOCK = `${RUN}/apply.lock`;
const PC_SOCKET = `${RUN}/process-compose.sock`;
const DEPLOY = `${DATA}/deploy`;
const BULLMQ_PRO = `${DATA}/bullmq-pro`;
const REDIS_TLS = `${DATA}/redis/tls`;
const REDIS_PORTS = [7000, 7001, 7002];
const MAIL_HOST = 'mail.box.internal';
const SINK_URL = 'http://sink.box.internal:8026';
const BRIDGE_URL = 'http://bridge.box.internal:4000/api/novu';
const BRIDGE_SECRET = `${DATA}/bridge/secret-key`;
const MANAGED_AGENT = 'box-managed';
const REPO_URL = process.env.BOX_REPO_URL ?? 'https://github.com/novuhq/novu.git';
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
const CODE_PROCESSES = processesWhere((entry) => entry.projects || entry.paths);
const PROJECT_PROCESSES = Object.fromEntries(
  Object.entries(PROCESSES).flatMap(([name, entry]) => (entry.projects ?? []).map((project) => [project, name]))
);
const PATH_PROCESSES = Object.fromEntries(
  Object.entries(PROCESSES).flatMap(([name, entry]) => (entry.paths ?? []).map((path) => [path, name]))
);
const DEPLOYED_APPS = Object.fromEntries(
  processesWhere((entry) => entry.deploy).map((name) => [name, PROCESSES[name].deploy])
);

// The caller's token can push to novuhq/novu, and the box runs PR code (install scripts, builds, the apps), so it is
// taken out of the environment every child gets and passed only to the git calls that need it and the CI lookup.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
delete process.env.GITHUB_TOKEN;
const env = loadEnv();

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

function log(message) {
  console.log(`[box] ${new Date().toISOString()} ${message}`);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env, cwd: REPO, ...options });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
}

function runAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: REPO, ...options });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code ?? signal}`))
    );
  });
}

function output(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', env, cwd: REPO, ...options });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${result.stderr}`);

  return result.stdout.trim();
}

async function step(name, fn) {
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

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function pc(args, options) {
  run('process-compose', [...args, '--use-uds', '--unix-socket', PC_SOCKET], { cwd: RUN, ...options });
}

// process-compose writes every process's output to one file, a JSON line each ({process, message}); its own lines
// have no process. The apps (pino) and Caddy log JSON themselves. This prints `name | LEVEL context: message`.
const PC_LOG = `${DATA}/logs/process-compose.log`;
const PINO_LEVELS = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };
// For lines that aren't pino: what Mongo, Redis, ClickHouse, Caddy and the rest print for a problem.
const PROBLEM = /\b(error|errors|fatal|panic|exception|uncaught|unhandled|warn|warning)\b|<(Error|Warning|Fatal)>/i;
// Terminal colours, which wrangler prints even into a file.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function logLine(raw) {
  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    return { name: '?', text: raw, problem: PROBLEM.test(raw) };
  }
  const name = entry.process ?? 'process-compose';
  const message = String(entry.message ?? '').replace(ANSI, '');
  if (!entry.process) return { name, text: message, problem: entry.level === 'error' || entry.level === 'warn' };

  return { name, ...(jsonLine(message) ?? { text: message, problem: PROBLEM.test(message) }) };
}

// An app's JSON log line as `LEVEL context: msg (error)`, or null when the message isn't one. pino levels are
// numbers (40 is warn); Caddy's are words.
function jsonLine(message) {
  if (!message.startsWith('{')) return null;
  let app;
  try {
    app = JSON.parse(message);
  } catch {
    return null;
  }
  const pino = typeof app.level === 'number';
  if (!pino && typeof app.level !== 'string') return null;
  const level = pino ? (PINO_LEVELS[app.level] ?? String(app.level)) : app.level.toUpperCase();
  const error = app.err?.message ?? app.error?.message ?? (typeof app.error === 'string' ? app.error : '');
  const context = app.context ?? app.logger;

  return {
    text: `${level} ${context ? `${context}: ` : ''}${app.msg ?? ''}${error ? ` (${error})` : ''}`,
    problem: pino ? app.level >= 40 : ['WARN', 'ERROR', 'FATAL', 'PANIC'].includes(level),
  };
}

function logs({ name, tail, follow, errors }) {
  const names = processList().map((p) => p.name);
  if (name && !names.includes(name)) throw new Error(`no process ${name}; the processes: ${names.sort().join(', ')}`);
  const width = Math.max(...names.map((n) => n.length));
  const wanted = (line) => line.text.trim() && (!name || line.name === name) && (!errors || line.problem);
  const print = (line) => process.stdout.write(`${line.name.padEnd(width)} | ${line.text}\n`);
  const show = (raw) => {
    const line = logLine(raw);
    if (wanted(line)) print(line);
  };
  // The last element is '' or a line process-compose is still writing.
  const lines = fs.existsSync(PC_LOG) ? fs.readFileSync(PC_LOG, 'utf8').split('\n').slice(0, -1) : [];
  for (const line of lines.map(logLine).filter(wanted).slice(-tail)) print(line);
  if (!follow) return;
  // Lines appended from now on, until the caller stops.
  const child = spawn('tail', ['-n', '0', '-F', PC_LOG], { stdio: ['ignore', 'pipe', 'ignore'] });
  let rest = '';
  child.stdout.on('data', (chunk) => {
    const parts = (rest + chunk).split('\n');
    rest = parts.pop();
    for (const raw of parts) if (raw) show(raw);
  });

  return new Promise((resolve) => child.on('close', resolve));
}

function processList() {
  return JSON.parse(
    output('process-compose', ['process', 'list', '-o', 'json', '--use-uds', '--unix-socket', PC_SOCKET], { cwd: RUN })
  );
}

// GITHUB_TOKEN is only read from the environment of this command; it is never written to disk. No hooks, so no
// checked-out code runs with it.
function gitWithToken(args) {
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

function fetchRef(ref) {
  const refspec = /^\d+$/.test(ref) ? `pull/${ref}/head` : ref;
  run('git', ['fetch', '--filter=blob:none', 'origin', refspec]);

  return output('git', ['rev-parse', 'FETCH_HEAD']);
}

// A PR runs on top of the baked commit, like CI's merge ref, so a branch cut from an older `next`
// doesn't roll the box back. GitHub's own merge ref can lag behind `next`, so the merge is local.
function mergeOntoBaked(ref, prHead) {
  const baked = readJson(BAKED).sha;
  if (spawnSync('git', ['merge-base', '--is-ancestor', baked, prHead], { cwd: REPO }).status === 0) return prHead;
  const merge = spawnSync('git', ['merge-tree', '--write-tree', baked, prHead], { encoding: 'utf8', env, cwd: REPO });
  if (merge.status !== 0)
    throw new Error(`${ref} conflicts with the baked ${baked.slice(0, 10)}; rebase it:\n${merge.stdout}`);
  const identity = {
    GIT_AUTHOR_NAME: 'box',
    GIT_AUTHOR_EMAIL: 'box@box.internal',
    GIT_COMMITTER_NAME: 'box',
    GIT_COMMITTER_EMAIL: 'box@box.internal',
  };
  const tree = merge.stdout.split('\n')[0];

  return output('git', ['commit-tree', tree, '-p', baked, '-p', prHead, '-m', `box: ${ref} on ${baked.slice(0, 10)}`], {
    env: { ...env, ...identity },
  });
}

// A bundle from `cli.mjs sync` holds one commit: a snapshot of a checkout, committed or not, on top of its HEAD.
// Its prerequisites are in the baked commit's history, which the box always has.
function unbundle(file) {
  const [head, ...others] = output('git', ['bundle', 'unbundle', file]).split('\n');
  if (others.length) throw new Error(`${file} has ${others.length + 1} heads; expected the one from cli.mjs sync`);
  const sha = head.split(' ')[0];

  return { sha, subject: output('git', ['log', '-1', '--format=%s', sha]) };
}

function pnpmInstall() {
  run('pnpm', ['install', '--frozen-lockfile', '--store-dir', `${DATA}/pnpm-store`], {
    env: { ...env, NODE_OPTIONS: '', CI: 'true', HUSKY: '0', CYPRESS_INSTALL_BINARY: '0' },
  });
  run('pnpm', ['symlink:submodules']);
}

// The API, the worker and the dashboard build in their own runs to get their own arguments (`--sourcemap false` takes
// vite's peak from ~4 GB to ~2.5 GB). Their dependencies build once, in the first run. nx can't hash the enterprise
// packages (their src links into the nxignored submodule), so it rebuilds them every time (~25 s); without
// `enterprise` they are left out and their last dist is reused.
// Libraries first, 4 at a time (the box has 4 vCPUs; peak memory measured 4.2 of 12 GiB). Then the worker, and the
// API's metadata and build, at the same time.
async function build(projects, { enterprise = true } = {}) {
  const nxEnv = { env: { ...env, NODE_OPTIONS: '' } };
  const nx = (args) => run(NX, args, nxEnv);
  const graph = projectGraph();
  const own = ['@novu/api-service', '@novu/worker', '@novu/dashboard'].filter((project) => projects.includes(project));
  const first = new Set(projects.filter((project) => !own.includes(project)));
  for (const project of own) {
    const { devDependencies = {} } = readJson(`${REPO}/${graph.nodes[project].data.root}/package.json`);
    for (const { target } of graph.dependencies[project])
      if (graph.nodes[target] && !(target in devDependencies)) first.add(target);
  }
  const closure = new Set();
  const visit = (project) => {
    if (closure.has(project) || !graph.nodes[project]) return;
    closure.add(project);
    graph.dependencies[project].forEach(({ target }) => visit(target));
  };
  first.forEach(visit);
  const libs = [...closure].filter(
    (project) =>
      graph.nodes[project].data.targets?.build &&
      (enterprise || !graph.nodes[project].data.root.startsWith('enterprise/packages/'))
  );
  if (libs.length)
    nx(['run-many', '-t', 'build', `--projects=${libs.join(',')}`, '--excludeTaskDependencies', '--parallel=4']);
  const apps = [];
  if (own.includes('@novu/worker'))
    apps.push(
      runAsync(
        NX,
        ['run', '@novu/worker:build', '--excludeTaskDependencies', '--', '-c', nestConfigWithoutTypeCheck('worker')],
        nxEnv
      )
    );
  if (own.includes('@novu/api-service'))
    apps.push(
      (async () => {
        await runAsync(NX, ['run', '@novu/api-service:build-metadata', '--excludeTaskDependencies'], nxEnv);
        await runAsync(
          NX,
          [
            'run',
            '@novu/api-service:build',
            '--excludeTaskDependencies',
            '--',
            '-c',
            nestConfigWithoutTypeCheck('api'),
          ],
          nxEnv
        );
      })()
    );
  await Promise.all(apps);
  if (own.includes('@novu/dashboard'))
    nx(['run', '@novu/dashboard:build', '--excludeTaskDependencies', '--', '--sourcemap', 'false']);
}

// An app's nest-cli.json without `typeCheck`: the same swc output without a full type-check (API ~6 s instead of
// ~57 s, worker ~4 s instead of ~14 s). CI's build type-checks every PR.
function nestConfigWithoutTypeCheck(app) {
  const config = readJson(`${REPO}/apps/${app}/nest-cli.json`);
  config.compilerOptions.typeCheck = false;
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(`${RUN}/${app}-nest-cli.json`, JSON.stringify(config));

  return relative(`${REPO}/apps/${app}`, `${RUN}/${app}-nest-cli.json`);
}

// `compile` mode skips the type check and the static prerender, which the playground doesn't pass; every page
// renders on request, as under `next dev`. Turbopack takes ~45 s and ~2.4 GB, webpack ~110 s.
function buildBridge() {
  run('node_modules/.bin/next', ['build', '--turbopack', '--experimental-build-mode', 'compile'], {
    cwd: `${REPO}/playground/nextjs`,
    env: { ...env, NODE_OPTIONS: '', NEXT_TELEMETRY_DISABLED: '1' },
  });
}

function projectGraph() {
  const file = `${RUN}/nx-graph.json`;
  fs.mkdirSync(RUN, { recursive: true });
  output(NX, ['graph', `--file=${file}`]);

  return readJson(file).graph;
}

function workspacePackages() {
  return new Map(
    JSON.parse(output('pnpm', ['-s', 'ls', '-r', '--depth', '-1', '--json'])).map((pkg) => [pkg.name, pkg.path])
  );
}

// nx counts devDependencies as build inputs, so the dashboard's test-only helpers (@novu/dal, @novu/ee-auth) make
// every backend change rebuild it. Its bundle reads apps/dashboard, its runtime dependencies, and everything those
// depend on, devDependencies included (libraries bundle some of theirs).
function dashboardBundleChanged(files) {
  const workspace = workspacePackages();
  const dirs = new Set();
  const visit = (name, isDashboard = false) => {
    const dir = workspace.get(name);
    if (!dir || dirs.has(dir)) return;
    dirs.add(dir);
    const pkg = readJson(`${dir}/package.json`);
    Object.keys({ ...pkg.dependencies, ...(isDashboard ? {} : pkg.devDependencies) }).forEach((dep) => visit(dep));
  };
  visit('@novu/dashboard', true);

  return files.some((file) => [...dirs].some((dir) => `${REPO}/${file}`.startsWith(`${dir}/`)));
}

// Same layout as the production images: `pnpm deploy --prod` output, dist with its .env files,
// metadata.js paths rewritten for the flat layout, and BullMQ Pro dropped in when it was installed.
function deployApp(name, { dependenciesChanged = true } = {}) {
  const target = `${DEPLOY}/${name}`;
  const dist = `${target}/dist`;
  const src = `${REPO}/apps/${name}/src`;
  if (!dependenciesChanged && fs.existsSync(`${target}/node_modules/.pnpm`)) refreshWorkspacePackages(target);
  else {
    fs.rmSync(target, { recursive: true, force: true });
    run(
      'pnpm',
      ['--filter', DEPLOYED_APPS[name], 'deploy', '--legacy', '--prod', '--store-dir', `${DATA}/pnpm-store`, target],
      {
        env: { ...env, NODE_OPTIONS: '--max-old-space-size=4096', CI: 'true', HUSKY: '0' },
      }
    );
  }
  fs.rmSync(dist, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/${name}/dist`, dist, { recursive: true });
  fs.copyFileSync(`${src}/.example.env`, `${dist}/.env`);
  fs.copyFileSync(`${src}/.env.development`, `${dist}/.env.development`);
  fs.copyFileSync(`${src}/.env.production`, `${dist}/.env.production`);
  fs.rmSync(`${dist}/.env.test`, { force: true });
  fs.rmSync(`${dist}/.env.ci`, { force: true });

  const metadata = `${dist}/metadata.js`;
  if (fs.existsSync(metadata)) {
    fs.writeFileSync(
      metadata,
      fs
        .readFileSync(metadata, 'utf8')
        .replaceAll('../../../packages/shared/dist', '../node_modules/@novu/shared/dist')
        .replaceAll('../../../libs/application-generic/build', '../node_modules/@novu/application-generic/build')
        .replaceAll('../../../libs/dal/dist', '../node_modules/@novu/dal/dist')
    );
  }

  if (env.NOVU_MANAGED_SERVICE) {
    const modules = `${target}/node_modules/@taskforcesh`;
    fs.rmSync(modules, { recursive: true, force: true });
    fs.cpSync(`${BULLMQ_PRO}/node_modules/@taskforcesh`, modules, { recursive: true });
    fs.cpSync(`${BULLMQ_PRO}/node_modules`, `${modules}/bullmq-pro/node_modules`, {
      recursive: true,
      filter: (source) => !source.startsWith(`${BULLMQ_PRO}/node_modules/@taskforcesh`),
    });
  }
}

// With the same dependencies, a new `pnpm deploy` (~60 s: it re-resolves the whole workspace) differs from the
// previous one only in the workspace packages it copied in, so re-copy just those (`file+<path>` entries).
function refreshWorkspacePackages(target) {
  const workspace = workspacePackages();
  const store = `${target}/node_modules/.pnpm`;
  for (const entry of fs.readdirSync(store).filter((name) => name.includes('@file+'))) {
    const name = entry.slice(0, entry.indexOf('@file+', 1)).replace('+', '/');
    const copy = `${store}/${entry}/node_modules/${name}`;
    for (const file of fs.readdirSync(copy).filter((file) => file !== 'node_modules')) {
      const source = `${workspace.get(name)}/${file}`;
      fs.rmSync(`${copy}/${file}`, { recursive: true, force: true });
      if (fs.existsSync(source)) fs.cpSync(source, `${copy}/${file}`, { recursive: true });
    }
  }
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
function prepareDashboard() {
  const target = `${RUN}/dashboard`;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/dashboard/dist`, target, { recursive: true });

  const viteEnv = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('VITE_')));
  const script = `<script>window._env_ = ${JSON.stringify(viteEnv).replace(/</g, '\\u003c')};</script>`;
  const indexFile = `${target}/index.html`;
  const html = fs.readFileSync(indexFile, 'utf8').replace('<script type="module"', `${script}\n<script type="module"`);
  fs.writeFileSync(indexFile, html);
  fs.writeFileSync(`${target}/__box.json`, JSON.stringify({ baked: readJson(BAKED), applied: readJson(APPLIED) }));
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

async function waitForHttp(url, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${url} not healthy after ${timeoutSeconds}s`);
}

async function bake(ref = 'next') {
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

async function api(path, { headers = {}, ...init } = {}) {
  const res = await fetch(`http://127.0.0.1:3000${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Origin: env.FRONT_BASE_URL, ...headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);

  return { res, body: text ? JSON.parse(text) : null };
}

// The API creates the Novu user and org from the Clerk ones on their first request, as in production.
// The user keeps the Novu ID Clerk holds for it. The org gets a random one, and the Clerk org every box shares
// would then link to this box only, so the seed moves it to SEED.novuOrgId, which is the same in every box.
// The password is set on every bake, so BOX_SEED_PASSWORD is the one place it changes.
async function seedClerk() {
  let { user, org } = await findSeedUser();
  const password = seedPassword();
  if (user) await clerk(`/users/${user.id}`, { method: 'PATCH', body: { password, skip_password_checks: true } });
  else
    user = await clerk('/users', {
      method: 'POST',
      body: {
        email_address: [SEED.email],
        password,
        first_name: SEED.firstName,
        last_name: SEED.lastName,
        skip_password_checks: true,
        skip_legal_checks: true,
      },
    });
  org ??= await clerk('/organizations', { method: 'POST', body: { name: SEED.orgName, created_by: user.id } });
  const linkOrg = (externalOrgId) =>
    clerk(`/organizations/${org.id}/metadata`, { method: 'PATCH', body: { public_metadata: { externalOrgId } } });
  const me = async () => {
    const token = await seedUserToken({ userId: user.id, orgId: org.id });
    const { body } = await api('/v1/organizations/me', { headers: { Authorization: `Bearer ${token}` } });

    return { token, org: body.data };
  };
  // The API trusts a link in the token without looking the org up, so it only creates the org without one.
  // Meanwhile other boxes find theirs by the Clerk org ID.
  await linkOrg(null);
  const created = await me();
  await step('move the seed org to its fixed ID', () => moveSeedOrg(created.org._id));
  await linkOrg(SEED.novuOrgId);
  const seeded = await me();
  if (seeded.org._id !== SEED.novuOrgId) throw new Error(`the seed org is ${seeded.org._id}, not ${SEED.novuOrgId}`);
  log(`seeded ${SEED.email} in ${seeded.org.name} (${seeded.org._id})`);

  return seeded.token;
}

// The bake's Mongo holds only what creating the org wrote, and every reference to the org in it is its ObjectId
// or that ID as a string. The org's Stripe customer is found by its metadata, so it moves too, or the box reuses
// the one an earlier bake moved. Redis may cache the old ID, and the API and worker have nothing else in it yet.
async function moveSeedOrg(oldId) {
  pc(['process', 'stop', 'api', 'worker']);
  const { MongoClient, ObjectId } = createRequire(`${REPO}/libs/dal/package.json`)('mongoose').mongo;
  const from = new ObjectId(oldId);
  const to = new ObjectId(SEED.novuOrgId);
  let found = 0;
  const swap = (value) => {
    if (value?._bsontype === 'ObjectId') return value.equals(from) ? (found++, to) : value;
    if (value === oldId) return found++, SEED.novuOrgId;
    if (Array.isArray(value)) return value.map(swap);
    if (value?.constructor === Object)
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, swap(item)]));

    return value;
  };
  const client = await MongoClient.connect(env.MONGO_URL);
  try {
    const db = client.db();
    let moved = 0;
    for (const { name } of await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray()) {
      const collection = db.collection(name);
      for (const doc of await collection.find().toArray()) {
        found = 0;
        const next = swap(doc);
        if (!found) continue;
        if (from.equals(doc._id)) {
          await collection.deleteOne({ _id: from });
          await collection.insertOne(next);
        } else await collection.replaceOne({ _id: doc._id }, next);
        moved++;
      }
    }
    const organizations = db.collection('organizations');
    const query = encodeURIComponent(`metadata['organizationId']:'${SEED.novuOrgId}'`);
    const [previous] = (await stripe(`/customers/search?query=${query}`)).data;
    const { stripeCustomerId } = await organizations.findOne({ _id: to });
    if (previous) await organizations.updateOne({ _id: to }, { $set: { stripeCustomerId: previous.id } });
    else if (stripeCustomerId)
      await stripe(`/customers/${stripeCustomerId}`, { 'metadata[organizationId]': SEED.novuOrgId });
    const customer = previous ? `${previous.id} (from an earlier bake)` : (stripeCustomerId ?? 'none yet');
    log(`moved ${moved} documents from ${oldId} to ${SEED.novuOrgId}; Stripe customer ${customer}`);
  } finally {
    await client.close();
  }
  for (const port of REDIS_PORTS) redis(port, ['flushall']);
  for (const name of ['api', 'worker']) pc(['process', 'start', name]);
  await waitForHttp('http://127.0.0.1:3000/v1/health-check', 300);
  await waitForHttp('http://127.0.0.1:3004/v1/health-check', 300);
}

// Every environment of the seeded org sends email through Mailpit (UI on :8025).
async function seedEmailIntegration(token) {
  const { body: environments } = await api('/v1/environments', { headers: { Authorization: `Bearer ${token}` } });
  for (const environment of environments.data) {
    const headers = { Authorization: `ApiKey ${environment.apiKeys[0].key}` };
    const { body } = await api('/v1/integrations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        providerId: 'nodemailer',
        channel: 'email',
        name: 'Mailpit',
        identifier: 'mailpit',
        active: true,
        check: false,
        credentials: {
          host: MAIL_HOST,
          port: '1025',
          secure: false,
          ignoreTls: true,
          from: 'no-reply@novu-box.local',
          senderName: 'Novu Box',
        },
      }),
    });
    await api(`/v1/integrations/${body.data._id}/set-primary`, { method: 'POST', headers });
    log(`Mailpit is the primary email integration in ${environment.name}`);
  }
}

// SMS, push and chat go to sink.mjs, which shows them in Mailpit. Every environment gets the three HTTP
// providers, and the seeded user's subscriber (the default target of the dashboard's Test Workflow) gets
// a phone number, a push device token and a chat webhook, so a test run reaches all channels.
async function seedChannels(token) {
  const auth = { Authorization: `Bearer ${token}` };
  const { body: me } = await api('/v1/users/me', { headers: auth });
  const { body: environments } = await api('/v1/environments', { headers: auth });
  const integrations = [
    {
      providerId: 'generic-sms',
      channel: 'sms',
      name: 'Box SMS (sink)',
      identifier: 'box-sms',
      credentials: {
        baseUrl: `${SINK_URL}/sms`,
        apiKeyRequestHeader: 'x-box-key',
        apiKey: 'box',
        idPath: 'id',
        datePath: 'date',
        from: 'Novu Box',
      },
    },
    {
      providerId: 'push-webhook',
      channel: 'push',
      name: 'Box Push (sink)',
      identifier: 'box-push',
      credentials: { webhookUrl: `${SINK_URL}/push`, secretKey: 'box-fake-push-hmac' },
    },
    {
      providerId: 'chat-webhook',
      channel: 'chat',
      name: 'Box Chat (sink)',
      identifier: 'box-chat',
      credentials: { secretKey: 'box-fake-chat-hmac' },
    },
  ];

  for (const environment of environments.data) {
    const headers = { Authorization: `ApiKey ${environment.apiKeys[0].key}` };
    for (const integration of integrations) {
      const { body } = await api('/v1/integrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...integration, active: true, check: false }),
      });
      if (integration.channel === 'sms')
        await api(`/v1/integrations/${body.data._id}/set-primary`, { method: 'POST', headers });
    }

    const subscriberId = me.data._id;
    await api('/v1/subscribers', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscriberId,
        email: me.data.email,
        firstName: me.data.firstName,
        lastName: me.data.lastName,
        phone: '+15550001',
      }),
    });
    for (const [providerId, credentials] of [
      ['push-webhook', { deviceTokens: ['box-device-token'] }],
      ['chat-webhook', { webhookUrl: `${SINK_URL}/chat` }],
    ]) {
      await api(`/v1/subscribers/${subscriberId}/credentials`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ providerId, credentials }),
      });
    }
    log(`SMS, push and chat go to the sink in ${environment.name}`);
  }
}

// The bridge app serves the Development environment, so it signs with that environment's secret key. The key
// belongs to this box's own Mongo data, like every other seeded record.
async function seedBridge(token) {
  const { body: environments } = await api('/v1/environments', { headers: { Authorization: `Bearer ${token}` } });
  const development = environments.data.find((environment) => environment.name === 'Development');
  fs.mkdirSync(dirname(BRIDGE_SECRET), { recursive: true });
  fs.writeFileSync(BRIDGE_SECRET, development.apiKeys[0].key, { mode: 0o600 });
  await syncBridge();
}

// Same requests as `npx novu sync`: the API discovers the workflows from the bridge and stores them, then
// every agent the bridge serves gets the bridge URL. An agent the bridge serves for the first time (a PR can
// add one) is created and published to web chat, as a customer does in the dashboard before syncing.
async function syncBridge() {
  const headers = { Authorization: `ApiKey ${fs.readFileSync(BRIDGE_SECRET, 'utf8').trim()}` };
  const { agents = [] } = await discoverBridge();
  const { body } = await api('/v1/bridge/sync?source=box', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bridgeUrl: BRIDGE_URL }),
  });
  for (const { agentId } of agents) {
    if (
      !(await api(`/v1/agents/${agentId}`, { headers }).then(
        () => true,
        () => false
      ))
    ) {
      await api('/v1/agents', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: agentId, identifier: agentId }),
      });
      await api(`/v1/agents/${agentId}/integrations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ providerId: 'novu-web-chat' }),
      });
      log(`agent ${agentId} is on web chat`);
    }
    await api(`/v1/agents/${agentId}/bridge`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ bridgeUrl: BRIDGE_URL }),
    });
  }
  log(`bridge synced: ${body.data.length} workflows and ${agents.length} agents from ${BRIDGE_URL}`);
}

// Managed agents run on Anthropic with the key from the start env, so this runs at start, not at bake, and only
// with a key. The Novu-managed Claude integration is the one Novu adds to new Development environments when the
// key is set; it stores no key. The agent gets Haiku and only the bash tool, which asks for approval before it runs.
async function seedManagedAgent() {
  pc(['process', 'start', 'thalamus']);
  await waitForHttp('http://127.0.0.1:8788/health', 120);
  const headers = { Authorization: `ApiKey ${fs.readFileSync(BRIDGE_SECRET, 'utf8').trim()}` };
  if (
    await api(`/v1/agents/${MANAGED_AGENT}`, { headers }).then(
      () => true,
      () => false
    )
  )
    return;
  const { body: environment } = await api('/v1/environments/me', { headers });
  const { body: integrations } = await api('/v1/integrations', { headers });
  let integration = integrations.data.find(
    (item) => item.providerId === 'novu-anthropic' && item._environmentId === environment.data._id
  );
  integration ??= (
    await api('/v1/integrations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        providerId: 'novu-anthropic',
        kind: 'agent',
        name: 'Novu Managed Claude',
        active: true,
        check: false,
      }),
    })
  ).body.data;
  await api('/v1/agents', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Box managed agent',
      identifier: MANAGED_AGENT,
      runtime: 'managed',
      managedRuntime: {
        providerId: 'novu-anthropic',
        integrationId: integration._id,
        model: 'claude-haiku-4-5',
        systemPrompt: 'You are the Novu Box test agent. Keep answers to one short sentence.',
        tools: ['bash'],
      },
    }),
  });
  await api(`/v1/agents/${MANAGED_AGENT}/integrations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ providerId: 'novu-web-chat' }),
  });
  log(`managed agent ${MANAGED_AGENT} is on web chat`);
}

// The CLI calls discover unsigned, which a bridge with strictAuthentication rejects; the box signs it like the API.
async function discoverBridge() {
  await waitForHttp(`${BRIDGE_URL}?action=health-check`, 120);
  const timestamp = Date.now();
  const signature = createHmac('sha256', fs.readFileSync(BRIDGE_SECRET, 'utf8').trim())
    .update(`${timestamp}.{}`)
    .digest('hex');
  const res = await fetch(`${BRIDGE_URL}?action=discover`, {
    headers: { 'novu-signature': `t=${timestamp},v1=${signature}` },
  });
  if (!res.ok) throw new Error(`bridge discover -> ${res.status}: ${(await res.text()).slice(0, 300)}`);

  return res.json();
}

async function stripe(path, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${env.STRIPE_API_KEY}`, 'Stripe-Version': '2022-11-15' },
    body: body && new URLSearchParams(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} -> ${res.status}: ${json.error?.message}`);

  return json;
}

// The seeded org buys the Team tier the way a customer would: a test card on file and its subscription moved to
// the business prices. Novu's webhook handler, fed by the `stripe` process, then sets the tier in Mongo.
async function seedTeamTier(token) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const { body: org } = await api('/v1/organizations/me', auth);
  // Creates the Stripe customer and its Pro trial if creating the org didn't.
  await api('/v1/billing/subscription', auth);
  const { data: customers } = await stripe(
    `/customers?email=${encodeURIComponent(SEED.email)}&limit=100&expand[]=data.subscriptions`
  );
  const customer = customers.find((candidate) => candidate.metadata.organizationId === org.data._id);
  const [subscription] = customer.subscriptions.data;
  const { data: prices } = await stripe(
    '/prices?lookup_keys[]=business_flat_monthly&lookup_keys[]=business_usage_notifications'
  );

  const card = await stripe('/payment_methods/pm_card_visa/attach', { customer: customer.id });
  await stripe(`/customers/${customer.id}`, { 'invoice_settings[default_payment_method]': card.id });
  const items = {};
  subscription.items.data.forEach((item, index) => {
    items[`items[${index}][id]`] = item.id;
    items[`items[${index}][price]`] = prices.find(
      (price) => price.recurring.usage_type === item.price.recurring.usage_type
    ).id;
  });
  await stripe(`/subscriptions/${subscription.id}`, { ...items, trial_end: 'now', proration_behavior: 'none' });

  for (let second = 1; second <= 60; second++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { body } = await api('/v1/billing/subscription', auth);
    if (body.data.apiServiceLevel === 'business' && body.data.status === 'active') {
      log(`${SEED.orgName} is on Team (customer ${customer.id})`);
      return;
    }
    // The first event can go out before `stripe listen` is connected; any update sends a new one.
    if (second % 15 === 0)
      await stripe(`/subscriptions/${subscription.id}`, { 'metadata[box_seeded_at]': new Date().toISOString() });
  }
  throw new Error('the org is not on Team after 60s; check the stripe process in /data/logs/process-compose.log');
}

// Atlas runs a replica set even for one node; transactions and change streams need it.
async function initReplicaSet(MongoClient) {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/?directConnection=true');
  try {
    const admin = client.db('admin');
    await admin.command({ replSetGetStatus: 1 }).catch(async (error) => {
      if (error.codeName !== 'NotYetInitialized') throw error;
      log('initiating replica set rs0');
      await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] } });
    });
    for (let attempt = 0; !(await admin.command({ hello: 1 })).isWritablePrimary; attempt++) {
      if (attempt === 120) throw new Error('replica set has no writable primary after 60s');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    await client.close();
  }
}

function redis(port, args) {
  return output('redis-cli', ['--tls', '--cacert', `${REDIS_TLS}/box.crt`, '-p', String(port), ...args], { cwd: RUN });
}

async function createRedisCluster() {
  if (/cluster_slots_assigned:0\b/.test(redis(REDIS_PORTS[0], ['cluster', 'info']))) {
    log('creating Redis Cluster');
    redis(REDIS_PORTS[0], [
      '--cluster',
      'create',
      ...REDIS_PORTS.map((port) => `127.0.0.1:${port}`),
      '--cluster-replicas',
      '0',
      '--cluster-yes',
    ]);
  }
  for (let attempt = 0; !/cluster_state:ok/.test(redis(REDIS_PORTS[0], ['cluster', 'info'])); attempt++) {
    if (attempt === 60) throw new Error('Redis Cluster not ok after 30s');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// Production runs with MONGO_AUTO_CREATE_INDEXES=false, so the box applies the indexes declared in
// the checked-out schemas explicitly and logs every difference, which is what a PR's index change does.
async function syncIndexes(mongoose, requireDal) {
  Object.assign(process.env, env);
  requireDal('./dist/index.js');
  await mongoose.connect(env.MONGO_URL, { autoIndex: false });
  try {
    for (const model of Object.values(mongoose.models)) {
      await model.init();
      const { toCreate, toDrop } = await model.diffIndexes({ indexOptionsToCreate: true });
      if (!toCreate.length && !toDrop.length) continue;
      await model.cleanIndexes({ toDrop });
      // One at a time: a schema that declares conflicting indexes must not skip the rest of its collection.
      let created = 0;
      for (const spec of toCreate) {
        try {
          await model.createIndexes({ toCreate: [spec] });
          created++;
        } catch (err) {
          log(`WARN: index conflict on ${model.collection.collectionName} ${JSON.stringify(spec)}: ${err.message}`);
        }
      }
      log(`indexes ${model.collection.collectionName}: created ${created} dropped ${JSON.stringify(toDrop)}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

async function migrate() {
  const head = output('git', ['rev-parse', 'HEAD']);
  if (fs.existsSync(MIGRATED) && fs.readFileSync(MIGRATED, 'utf8') === head) {
    log(`already migrated at ${head.slice(0, 10)}`);
    return;
  }
  const requireDal = createRequire(`${REPO}/libs/dal/package.json`);
  const mongoose = requireDal('mongoose');
  await initReplicaSet(mongoose.mongo.MongoClient);
  await createRedisCluster();
  await syncIndexes(mongoose, requireDal);
  fs.mkdirSync(`${DATA}/s3/${env.S3_BUCKET_NAME}`, { recursive: true });
  run(
    'node_modules/.bin/clickhouse-migrations',
    [
      'migrate',
      `--host=${env.CLICK_HOUSE_URL}`,
      `--user=${env.CLICK_HOUSE_USER}`,
      `--password=${env.CLICK_HOUSE_PASSWORD}`,
      `--db=${env.CLICK_HOUSE_DATABASE}`,
      '--migrations-home=./migrations/clickhouse-migrations',
    ],
    { cwd: `${REPO}/apps/api` }
  );
  fs.writeFileSync(MIGRATED, head);
}

// Puts changes on a running box: a PR, branch or SHA from GitHub, or a bundle from `cli.mjs sync` (a checkout's
// changes). Either is merged onto the baked commit, then the same steps run: diff against what the box runs, plan,
// build, restart. `--full` plans everything, like a bake, for when the incremental plan is in doubt.
//
// An apply that fails after its checkout leaves APPLYING behind. The next apply then also plans for the files the
// failed one changed, so nothing it half-built stays in place.
async function apply({ ref, bundle, full = false }) {
  if (!ref === !bundle) throw new Error('usage: box apply <pr-number|branch|sha> | --bundle <file> [--full]');
  const releaseLock = lockApply();
  try {
    const base = (readJson(APPLIED) ?? readJson(BAKED)).sha;
    const interrupted = readJson(APPLYING)?.sha;
    const target = await step('fetch', () => {
      const fetched = bundle ? unbundle(bundle) : { sha: fetchRef(ref), subject: ref };

      return {
        ref: fetched.subject,
        source: bundle ? 'sync' : 'github',
        head: fetched.sha,
        sha: mergeOntoBaked(fetched.subject, fetched.sha),
      };
    });
    const changed = (to) => output('git', ['diff', '--name-only', base, to]).split('\n').filter(Boolean);
    const files = [...new Set([...changed(target.sha), ...(interrupted ? changed(interrupted) : [])])];
    log(`${files.length} files changed between ${base.slice(0, 10)} and ${target.sha.slice(0, 10)}`);
    if (interrupted) log(`the last apply (${interrupted.slice(0, 10)}) didn't finish; its files are planned too`);
    if (files.some((file) => file.startsWith('docker/box/')))
      log("WARN: docker/box changed; the box keeps running its image's copy until the image is rebuilt");
    if (target.source === 'github') await logCiResult(target.head);

    fs.writeFileSync(APPLYING, JSON.stringify({ sha: target.sha, at: new Date().toISOString() }));
    await step('checkout', () => {
      run('git', ['checkout', '--force', '--detach', target.sha]);
      if (files.includes('.source')) gitWithToken(['submodule', 'update', '--init', '--depth', '1', '.source']);
    });
    const plan = await step('plan', () => (full ? fullPlan() : planFor(files)));
    log(
      `plan: install ${plan.install ? 'yes' : 'no'}, build ${plan.build.join(' ') || 'nothing'}, restart ${plan.restart.join(' ') || 'nothing'}`
    );
    await applyPlan(plan);

    fs.writeFileSync(
      APPLIED,
      JSON.stringify({ ...target, base, files: files.length, full, at: new Date().toISOString() }, null, 2)
    );
    fs.rmSync(APPLYING);
    fs.writeFileSync(
      `${RUN}/dashboard/__box.json`,
      JSON.stringify({ baked: readJson(BAKED), applied: readJson(APPLIED) })
    );
    log(`applied ${target.ref} at ${target.sha}`);
  } finally {
    releaseLock();
  }
}

// One apply at a time: a PR push and a sync landing together would build over each other's checkout. A lock whose
// process is gone (a killed apply) is taken over, and the APPLYING it left makes the next apply redo its files.
function lockApply() {
  fs.mkdirSync(RUN, { recursive: true });
  const take = () => fs.writeFileSync(APPLY_LOCK, String(process.pid), { flag: 'wx' });
  const running = (holder) => new Error(`another apply is running (pid ${holder}); wait for it to finish`);
  try {
    take();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const holder = Number(fs.readFileSync(APPLY_LOCK, 'utf8'));
    if (isAlive(holder)) throw running(holder);
    log(`taking over the lock of apply ${holder}, which is gone`);
    fs.rmSync(APPLY_LOCK, { force: true });
    // Another apply that found the same dead holder may have taken the lock in between.
    try {
      take();
    } catch (retryError) {
      if (retryError.code !== 'EEXIST') throw retryError;
      throw running(fs.readFileSync(APPLY_LOCK, 'utf8'));
    }
  }

  return () => fs.rmSync(APPLY_LOCK, { force: true });
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

// What a diff needs: new dependencies -> install and restart everything; code -> build the apps nx says are
// affected; files under PATH_PROCESSES -> restart that process. The enterprise packages rebuild only when they or
// the dependencies changed, because nx can't tell (their src links into the nxignored submodule).
function planFor(files) {
  const install = files.some(
    (file) => file === 'pnpm-lock.yaml' || file.endsWith('package.json') || file === '.source'
  );
  const build = affectedApps(files, { install });
  const restart = new Set(install ? CODE_PROCESSES : build.map((project) => PROJECT_PROCESSES[project]));
  for (const [prefix, name] of Object.entries(PATH_PROCESSES))
    if (files.some((file) => file.startsWith(prefix))) restart.add(name);

  return {
    install,
    build,
    enterprise: install || files.some((file) => file.startsWith('enterprise/packages/')),
    restart: runnable(restart),
  };
}

function fullPlan() {
  return {
    install: true,
    build: Object.keys(PROJECT_PROCESSES),
    enterprise: true,
    restart: runnable(new Set(CODE_PROCESSES)),
  };
}

// Thalamus only runs with the managed-agent key (see `box start`).
function runnable(processes) {
  if (!env.NOVU_MANAGED_CLAUDE_API_KEY) processes.delete('thalamus');

  return [...processes];
}

function affectedApps(files, { install }) {
  if (!files.length) return [];
  // Not --base/--head: nx diffs from their merge base, which for two box merge commits is an older bake.
  let apps = JSON.parse(output(NX, ['show', 'projects', '--affected', `--files=${files.join(',')}`, '--json'])).filter(
    (project) => PROJECT_PROCESSES[project]
  );
  if (!install && !dashboardBundleChanged(files)) apps = apps.filter((project) => project !== '@novu/dashboard');
  // nx can't see inside the submodule, so a `.source` bump affects nothing; the enterprise code runs in the API and worker.
  if (files.includes('.source')) apps = [...new Set([...apps, '@novu/api-service', '@novu/worker'])];

  return apps;
}

async function applyPlan({ install, build: projects, enterprise, restart }) {
  // Building next to the running apps gets OOM-killed in 8 GB. The dashboard is static files, so it keeps serving.
  // An apply killed mid-build leaves some of them stopped, and process-compose fails to stop a stopped process;
  // `restart` below starts those too.
  const stop = restart.filter((name) => name !== 'dashboard');
  const running = new Set(
    processList()
      .filter((entry) => entry.is_running)
      .map((entry) => entry.name)
  );
  const stopRunning = stop.filter((name) => running.has(name));
  if (stopRunning.length) await step(`stop ${stopRunning.join(' ')}`, () => pc(['process', 'stop', ...stopRunning]));
  if (install) await step('pnpm install', pnpmInstall);
  if (projects.length) await step(`build ${projects.join(' ')}`, () => build(projects, { enterprise }));
  if (restart.includes('bridge')) await step('build bridge', buildBridge);
  const redeploy = Object.keys(DEPLOYED_APPS).filter((name) => restart.includes(name));
  if (redeploy.length)
    await step(`deploy ${redeploy.join(' ')}`, () => {
      for (const name of redeploy) deployApp(name, { dependenciesChanged: install });
    });
  await step('migrate', migrate);
  if (restart.includes('dashboard')) prepareDashboard();
  if (stop.length)
    await step(`restart ${stop.join(' ')}`, () => {
      for (const name of stop) pc(['process', 'restart', name]);
    });
  await waitForHttp('http://127.0.0.1:3000/v1/health-check', 300);
  // A new framework can discover the same workflows differently (schemas, step options).
  if (restart.includes('bridge')) await step('sync bridge', syncBridge);
}

// The box runs code CI may have rejected (it skips type checks, for one), so it says what CI concluded.
// `PR Checks Passed` is the required check that gates every other job in on-pr.yml.
async function logCiResult(sha) {
  const repo = REPO_URL.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=PR%20Checks%20Passed`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const [check] = (await response.json()).check_runs;
    if (!check) log(`CI: no "PR Checks Passed" result for ${sha.slice(0, 10)}`);
    else if (check.status !== 'completed') log(`CI: still running on ${sha.slice(0, 10)}`);
    else if (check.conclusion === 'success') log(`CI: passed on ${sha.slice(0, 10)}`);
    else log(`WARN: CI ${check.conclusion} on ${sha.slice(0, 10)}; the box may run code CI rejects: ${check.html_url}`);
  } catch (error) {
    log(`WARN: couldn't read the CI result: ${error.message}`);
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
  const others = [...runningProcesses()].filter((name) => !STORES.includes(name));
  if (others.length) await step(`stop ${others.join(' ')}`, () => pc(['process', 'stop', ...others]));
  const running = runningProcesses();
  const stores = STORES.filter((name) => running.has(name));
  if (stores.length) await step(`stop ${stores.join(' ')}`, () => pc(['process', 'stop', ...stores]));
  const left = [...runningProcesses()];
  if (left.length) throw new Error(`still running after the stop: ${left.join(' ')}`);
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
