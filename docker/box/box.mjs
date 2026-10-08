#!/usr/bin/env node
// Novu Box CLI. Plain Node, no npm dependencies.
//
//   box bake [ref]      clone ref (default next), install, build, migrate, seed  -> golden /data
//   box start           boot every process (the image's default command)
//   box apply-pr <ref>  on a running box: check out a PR number or SHA, rebuild and restart what changed
//   box quiesce         stop apps, then databases, leaving the supervisor up for a snapshot
//   box status          list processes
//   box migrate         replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket
//                       (run by process-compose before the apps)

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { clerk, findSeedUser, SEED, seedUserToken } from './clerk.mjs';

const BOX = process.env.BOX_HOME ?? '/opt/box';
const DATA = '/data';
const REPO = `${DATA}/novu`;
const BAKED = `${DATA}/.baked.json`;
const APPLIED = `${DATA}/.applied.json`;
const MIGRATED = `${DATA}/.migrated`;
const RUN = `${DATA}/run`;
const PC_SOCKET = `${RUN}/process-compose.sock`;
const DEPLOY = `${DATA}/deploy`;
const BULLMQ_PRO = `${DATA}/bullmq-pro`;
const REDIS_TLS = `${DATA}/redis/tls`;
const REDIS_PORTS = [7000, 7001, 7002];
const MAIL_HOST = 'mail.box.internal';
const REPO_URL = process.env.BOX_REPO_URL ?? 'https://github.com/novuhq/novu.git';
const APPS = ['api', 'worker', 'socket', 'dashboard'];
const DATABASES = ['mongo', ...REDIS_PORTS.map((port) => `redis-${port}`), 'clickhouse', 's3', 'mail'];
const PROJECT_PROCESSES = { '@novu/api-service': 'api', '@novu/worker': 'worker', '@novu/dashboard': 'dashboard' };
const DEPLOYED_APPS = { api: '@novu/api-service', worker: '@novu/worker' };

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

// GITHUB_TOKEN is only read from the environment of this command; it is never written to disk.
function gitWithToken(args) {
  if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required to fetch the private enterprise submodule');
  run('git', [
    '-c',
    'url.https://github.com/.insteadOf=git@github.com:',
    '-c',
    'credential.helper=',
    '-c',
    'credential.helper=!f() { echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f',
    ...args,
  ]);
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
  if (merge.status !== 0) throw new Error(`${ref} conflicts with the baked ${baked.slice(0, 10)}; rebase it:\n${merge.stdout}`);
  const identity = { GIT_AUTHOR_NAME: 'box', GIT_AUTHOR_EMAIL: 'box@box.internal', GIT_COMMITTER_NAME: 'box', GIT_COMMITTER_EMAIL: 'box@box.internal' };
  const tree = merge.stdout.split('\n')[0];

  return output('git', ['commit-tree', tree, '-p', baked, '-p', prHead, '-m', `box: ${ref} on ${baked.slice(0, 10)}`], {
    env: { ...env, ...identity },
  });
}

function pnpmInstall() {
  run('pnpm', ['install', '--frozen-lockfile', '--store-dir', `${DATA}/pnpm-store`], {
    env: { ...env, NODE_OPTIONS: '', CI: 'true', HUSKY: '0', CYPRESS_INSTALL_BINARY: '0' },
  });
  run('pnpm', ['symlink:submodules']);
}

// The dashboard builds on its own so `--sourcemap false` reaches only vite: sourcemaps take its peak from ~2.5 GB to ~4 GB.
// Its dependency chain runs serially: parallel tsup DTS builds next to the running services get OOM-killed in 8 GB.
function build(projects) {
  const others = projects.filter((project) => project !== '@novu/dashboard');
  const buildEnv = { env: { ...env, NODE_OPTIONS: '' } };
  if (others.length) run('pnpm', ['nx', 'run-many', '-t', 'build', `--projects=${others.join(',')}`, '--parallel=2'], buildEnv);
  if (others.length < projects.length) {
    run('pnpm', ['nx', 'run', '@novu/dashboard:build', '--parallel=1', '--', '--sourcemap', 'false'], buildEnv);
  }
}

// Same layout as the production images: `pnpm deploy --prod` output, dist with its .env files,
// metadata.js paths rewritten for the flat layout, and BullMQ Pro dropped in when it was installed.
function deployApp(name) {
  const target = `${DEPLOY}/${name}`;
  const dist = `${target}/dist`;
  const src = `${REPO}/apps/${name}/src`;
  fs.rmSync(target, { recursive: true, force: true });
  run('pnpm', ['--filter', DEPLOYED_APPS[name], 'deploy', '--legacy', '--prod', '--store-dir', `${DATA}/pnpm-store`, target], {
    env: { ...env, NODE_OPTIONS: '--max-old-space-size=4096', CI: 'true', HUSKY: '0' },
  });
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

// Self-signed CA and server cert for the Redis Cluster; the apps trust it through NODE_EXTRA_CA_CERTS.
function ensureRedisTls() {
  if (fs.existsSync(`${REDIS_TLS}/redis.crt`)) return;
  fs.mkdirSync(REDIS_TLS, { recursive: true });
  const openssl = (args) => run('openssl', args, { cwd: REDIS_TLS, stdio: 'ignore' });
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '3650', '-subj', '/CN=novu-box-ca', '-keyout', 'ca.key', '-out', 'ca.crt']);
  openssl(['req', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=localhost', '-keyout', 'redis.key', '-out', 'redis.csr']);
  fs.writeFileSync(`${REDIS_TLS}/san.ext`, 'subjectAltName=IP:127.0.0.1,DNS:localhost\n');
  openssl(['x509', '-req', '-in', 'redis.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-days', '3650', '-extfile', 'san.ext', '-out', 'redis.crt']);
}

function prepareRuntime() {
  for (const dir of ['logs', 'run', 'mongo', ...REDIS_PORTS.map((port) => `redis/${port}`), 'clickhouse', 's3', 'sqs', 'mail', 'pnpm-store']) {
    fs.mkdirSync(`${DATA}/${dir}`, { recursive: true });
  }

  // A filesystem snapshot keeps lock and socket files of processes that are no longer running.
  const pm2Homes = fs.readdirSync(RUN).filter((name) => name.startsWith('pm2-')).map((name) => `${RUN}/${name}`);
  for (const file of [`${DATA}/mongo/mongod.lock`, `${DATA}/clickhouse/status`, PC_SOCKET, ...pm2Homes]) {
    fs.rmSync(file, { recursive: true, force: true });
  }

  ensureRedisTls();
  const bundle = `${RUN}/ca-bundle.pem`;
  const platformCa = process.env.NODE_EXTRA_CA_CERTS;
  fs.writeFileSync(
    bundle,
    [fs.readFileSync(`${REDIS_TLS}/ca.crt`, 'utf8'), platformCa && fs.existsSync(platformCa) ? fs.readFileSync(platformCa, 'utf8') : '']
      .join('\n')
  );
  env.NODE_EXTRA_CA_CERTS = bundle;

  // S3 keys are new on every start and exist only in the env of this process tree, so nobody outside the box
  // can sign S3 requests. Browsers only ever get presigned URLs, and stored objects don't depend on the keys.
  env.AWS_ACCESS_KEY_ID = randomBytes(10).toString('hex');
  env.AWS_SECRET_ACCESS_KEY = randomBytes(20).toString('hex');

  // The signing secret of `stripe listen` (the `stripe` process) for this key; Stripe returns the same one every time.
  env.STRIPE_CONNECT_SECRET = output('stripe', ['listen', '--print-secret', '--skip-update']);

  // The SMTP SSRF guard rejects literal private IPs, so Mailpit is reached by a name in NOVU_SAFE_OUTBOUND_ALLOW.
  const hosts = fs.readFileSync('/etc/hosts', 'utf8');
  if (!hosts.includes(` ${MAIL_HOST}`)) fs.appendFileSync('/etc/hosts', `127.0.0.1 ${MAIL_HOST}\n`);

  prepareDashboard();

  fs.writeFileSync(
    `${REPO}/enterprise/workers/socket/.dev.vars`,
    `JWT_SECRET=${env.JWT_SECRET}\nINTERNAL_API_KEY=${env.INTERNAL_SERVICES_API_KEY}\n`
  );
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
    ['up', '--tui=false', '--keep-project', '--config', `${BOX}/process-compose.yaml`, '--use-uds', '--unix-socket', PC_SOCKET],
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
    if (!fs.existsSync(`${REPO}/.git`)) run('git', ['clone', '--filter=blob:none', '--no-checkout', REPO_URL, REPO], { cwd: DATA });
    sha = fetchRef(ref);
    run('git', ['checkout', '--force', '--detach', sha]);
  });
  await step('enterprise submodule', () => gitWithToken(['submodule', 'update', '--init', '--depth', '1', '.source']));
  await step('pnpm install', pnpmInstall);
  if (env.BULL_MQ_PRO_NPM_TOKEN) await step('bullmq pro', installBullMqPro);
  else log('WARN: no BULL_MQ_PRO_NPM_TOKEN; the box runs open-source BullMQ without NOVU_MANAGED_SERVICE');
  await step('build', () => build(Object.keys(PROJECT_PROCESSES)));
  await step('deploy api worker', () => Object.keys(DEPLOYED_APPS).forEach(deployApp));
  prepareRuntime();

  const supervisor = startSupervisor();
  await step('first boot', () => waitForHttp('http://127.0.0.1:3000/v1/health-check', 300));
  const token = await step('seed Clerk user and org', seedClerk);
  await step('seed Mailpit email integration', () => seedEmailIntegration(token));
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
  fs.writeFileSync(`${DATA}/logs/boot.started`, new Date().toISOString());
  prepareRuntime();
  const supervisor = startSupervisor();
  supervisor.on('exit', (code) => process.exit(code ?? 1));
  await waitForHttp('http://127.0.0.1:3000/v1/health-check', 600);
  await waitForHttp('http://127.0.0.1:3004/v1/health-check', 600);
  const seconds = (Date.now() - Date.parse(fs.readFileSync(`${DATA}/logs/boot.started`, 'utf8'))) / 1000;
  fs.appendFileSync(
    `${DATA}/logs/timings.jsonl`,
    `${JSON.stringify({ at: new Date().toISOString(), command: 'start', step: 'api+worker healthy', seconds })}\n`
  );
  log(`box ready in ${seconds.toFixed(1)}s`);
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
// A bake starts with an empty Mongo, so the org link left by the previous bake is dropped first; boxes
// from an older bake then lose the seeded org. The user keeps its Novu ID, which Clerk still holds.
async function seedClerk() {
  let { user, org } = await findSeedUser();
  user ??= await clerk('/users', {
    method: 'POST',
    body: {
      email_address: [SEED.email],
      password: SEED.password,
      first_name: SEED.firstName,
      last_name: SEED.lastName,
      skip_password_checks: true,
      skip_legal_checks: true,
    },
  });
  org ??= await clerk('/organizations', { method: 'POST', body: { name: SEED.orgName, created_by: user.id } });
  await clerk(`/organizations/${org.id}/metadata`, { method: 'PATCH', body: { public_metadata: { externalOrgId: null } } });
  const token = await seedUserToken({ userId: user.id, orgId: org.id });
  const { body } = await api('/v1/organizations/me', { headers: { Authorization: `Bearer ${token}` } });
  log(`seeded ${SEED.email} in ${body.data.name} (${body.data._id})`);

  return token;
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
        credentials: { host: MAIL_HOST, port: '1025', secure: false, ignoreTls: true, from: 'no-reply@novu-box.local', senderName: 'Novu Box' },
      }),
    });
    await api(`/v1/integrations/${body.data._id}/set-primary`, { method: 'POST', headers });
    log(`Mailpit is the primary email integration in ${environment.name}`);
  }
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
  const { data: customers } = await stripe(`/customers?email=${encodeURIComponent(SEED.email)}&limit=100&expand[]=data.subscriptions`);
  const customer = customers.find((candidate) => candidate.metadata.organizationId === org.data._id);
  const [subscription] = customer.subscriptions.data;
  const { data: prices } = await stripe('/prices?lookup_keys[]=business_flat_monthly&lookup_keys[]=business_usage_notifications');

  const card = await stripe('/payment_methods/pm_card_visa/attach', { customer: customer.id });
  await stripe(`/customers/${customer.id}`, { 'invoice_settings[default_payment_method]': card.id });
  const items = {};
  subscription.items.data.forEach((item, index) => {
    items[`items[${index}][id]`] = item.id;
    items[`items[${index}][price]`] = prices.find((price) => price.recurring.usage_type === item.price.recurring.usage_type).id;
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
    if (second % 15 === 0) await stripe(`/subscriptions/${subscription.id}`, { 'metadata[box_seeded_at]': new Date().toISOString() });
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

async function createRedisCluster() {
  const cli = (port, args) => output('redis-cli', ['--tls', '--cacert', `${REDIS_TLS}/ca.crt`, '-p', String(port), ...args], { cwd: RUN });
  if (/cluster_slots_assigned:0\b/.test(cli(REDIS_PORTS[0], ['cluster', 'info']))) {
    log('creating Redis Cluster');
    cli(REDIS_PORTS[0], ['--cluster', 'create', ...REDIS_PORTS.map((port) => `127.0.0.1:${port}`), '--cluster-replicas', '0', '--cluster-yes']);
  }
  for (let attempt = 0; !/cluster_state:ok/.test(cli(REDIS_PORTS[0], ['cluster', 'info'])); attempt++) {
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

// Sorts the diff the way the README describes: dependencies -> install, migrations -> migrate,
// code -> nx affected build, then restart only the processes whose project was rebuilt.
async function applyPr(ref) {
  if (!ref) throw new Error('usage: box apply-pr <pr-number|sha>');
  const base = (readJson(APPLIED) ?? readJson(BAKED)).sha;
  let prHead;
  let head;
  let files;
  await step('fetch', () => {
    prHead = fetchRef(ref);
    head = mergeOntoBaked(ref, prHead);
    files = output('git', ['diff', '--name-only', base, head]).split('\n').filter(Boolean);
  });
  log(`${files.length} files changed between ${base.slice(0, 10)} and ${head.slice(0, 10)}`);
  if (files.some((file) => file.startsWith('docker/box/'))) log('WARN: docker/box changed; this PR needs a new base image');

  const restart = new Set();
  await step('checkout', () => {
    run('git', ['checkout', '--force', '--detach', head]);
    if (files.includes('.source')) gitWithToken(['submodule', 'update', '--init', '--depth', '1', '.source']);
  });
  if (files.some((file) => file === 'pnpm-lock.yaml' || file.endsWith('package.json') || file === '.source')) {
    await step('pnpm install', pnpmInstall);
    APPS.forEach((name) => restart.add(name));
  }

  let affected;
  await step('nx affected', () => {
    affected = JSON.parse(
      output('pnpm', ['-s', 'nx', 'show', 'projects', '--affected', `--base=${base}`, `--head=${head}`, '--json'])
    ).filter((project) => PROJECT_PROCESSES[project]);
  });
  if (affected.length) await step(`build ${affected.join(' ')}`, () => build(affected));
  affected.forEach((project) => restart.add(PROJECT_PROCESSES[project]));
  if (files.some((file) => file.startsWith('enterprise/workers/socket/'))) restart.add('socket');
  const redeploy = Object.keys(DEPLOYED_APPS).filter((name) => restart.has(name));
  if (redeploy.length) await step(`deploy ${redeploy.join(' ')}`, () => redeploy.forEach(deployApp));
  await step('migrate', migrate);

  fs.writeFileSync(APPLIED, JSON.stringify({ ref, sha: head, prHead, base, files: files.length, at: new Date().toISOString() }, null, 2));
  await step(`restart ${[...restart].join(' ') || 'nothing'}`, () => {
    if (restart.delete('dashboard')) prepareDashboard();
    else fs.writeFileSync(`${RUN}/dashboard/__box.json`, JSON.stringify({ baked: readJson(BAKED), applied: readJson(APPLIED) }));
    for (const name of restart) pc(['process', 'restart', name]);
  });
  await waitForHttp('http://127.0.0.1:3000/v1/health-check', 300);
  log(`applied ${ref} at ${head}`);
}

async function quiesce() {
  await step('stop apps', () => pc(['process', 'stop', ...APPS]));
  await step('stop databases', () => pc(['process', 'stop', ...DATABASES]));
}

const commands = {
  bake: () => bake(process.argv[3]),
  start,
  migrate,
  'apply-pr': () => applyPr(process.argv[3]),
  quiesce,
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
