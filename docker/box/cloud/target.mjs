// cli.mjs `--cloud`: the box runs on Cloudflare in the host Worker `novu-box-host` (worker.js, shared by all boxes)
// and is reached through its own thin Worker `novu-box-<box>` on workers.dev (thin.js). The same commands as for a
// local box, over HTTPS, signed in with your GitHub token (`gh auth token`).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const BOX_DIR = join(HERE, '..');
const WRANGLER = ['npx', '--yes', 'wrangler@4.150.0'];
const HOST = 'novu-box-host';
const ROUTER = 'novu-box-slack';
const COMPATIBILITY_DATE = '2026-09-29';
// The Novu account's workers.dev subdomain.
const DOMAIN = process.env.BOX_CLOUD_DOMAIN ?? 'cli-shortener.workers.dev';
const SECRETS = [
  'CLERK_SECRET_KEY',
  'BOX_SEED_PASSWORD',
  'STRIPE_API_KEY',
  'LAUNCH_DARKLY_SDK_KEY',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
];
const EXIT_MARK = '__BOX_EXIT__';
// Novu Bot's credentials, for the router only (never a box): SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET.
const SLACK_ENV = process.env.BOX_SLACK_ENV ?? join(os.homedir(), '.config/novu-box/slack.env');
// #novu-box, the one channel the router posts in besides DMs.
const SLACK_CHANNEL = process.env.BOX_SLACK_CHANNEL ?? 'C0C9PHBUDR6';
// A first bake takes 11 to 14 minutes on Cloudflare; a wake about 35 s.
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 5 * 60, running: 5 * 60 };

export function cloudTarget({ box, log, githubToken }) {
  const worker = `novu-box-${box}`;
  const origin = `https://${worker}.${DOMAIN}`;

  async function call(path, init = {}) {
    let response;
    // The box answers JSON or plain text; an HTML page is Cloudflare's. Right after a deploy that is a 404 (the new
    // workers.dev name isn't live everywhere yet) or error 1042 (the host's class isn't reachable yet), for up to a
    // minute. A 404 on /state means the box doesn't exist (yet); anything else waits.
    for (let attempt = 0; ; attempt++) {
      response = await fetch(`${origin}/__box${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${githubToken()}`, ...init.headers },
      });
      if (!response.headers.get('content-type')?.includes('text/html')) break;
      if (path === '/state' && response.status === 404) return null;
      if (attempt === 45)
        throw new Error(`${origin}/__box${path} answers Cloudflare's ${response.status} page after 90 s`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!response.ok && response.status !== 409)
      throw new Error(`${worker} ${path} -> ${response.status}: ${(await response.text()).slice(0, 300)}`);

    return response;
  }

  async function state() {
    const response = await call('/state').catch(() => null);

    return response ? response.json() : null;
  }

  // Streams a command's output to stdout (or collects it) and returns its exit code (or its output).
  async function stream(body, { capture = false } = {}) {
    const response = await call('/exec', { method: 'POST', body: JSON.stringify(body) });
    if (response.status === 409) throw new Error(`${worker} isn't running: \`cli.mjs up --cloud --box ${box}\``);
    const decoder = new TextDecoder();
    let text = '';
    let printed = 0;
    for await (const chunk of response.body) {
      text += decoder.decode(chunk, { stream: true });
      if (capture) continue;
      // Holds back the last line, which may be the exit mark.
      const upTo = text.lastIndexOf('\n') + 1;
      if (upTo > printed) {
        process.stdout.write(text.slice(printed, upTo).replace(new RegExp(`\\n?${EXIT_MARK} \\d+\\n$`), ''));
        printed = upTo;
      }
    }
    const match = text.match(new RegExp(`\\n${EXIT_MARK} (\\d+)\\n?$`));
    const exitCode = match ? Number(match[1]) : 1;
    if (!capture) return exitCode;
    const output = text.slice(0, match?.index ?? text.length);
    if (exitCode !== 0) throw new Error(`${body.cmd.join(' ')} exited with ${exitCode}: ${output.slice(-500)}`);

    return output.trim();
  }

  // The image is built for amd64 and pushed once per change; the host Worker pins it by digest.
  function pushImage() {
    log('building the box image for linux/amd64 (cached after the first time)');
    run('docker', ['build', '--platform', 'linux/amd64', '-t', 'novu-box:cloud', BOX_DIR]);
    const tag = `novu-box:${output('docker', ['image', 'inspect', 'novu-box:cloud', '--format', '{{.Id}}']).slice(7, 19)}`;
    output('docker', ['tag', 'novu-box:cloud', tag]);
    log(`pushing ${tag} to the Cloudflare registry (skipped when it's there)`);
    const pushed = output(WRANGLER[0], [...WRANGLER.slice(1), 'containers', 'push', tag]);
    // "<tag>: digest: sha256:<hex> size: …" then "Pushed image: registry.cloudflare.com/<account>/novu-box:<tag>".
    const digest = pushed.match(/digest: (sha256:[0-9a-f]{64})/)?.[1];
    const repository = pushed.match(/Pushed image: (\S+):[^:\s]+\s*$/m)?.[1];
    if (!digest || !repository) throw new Error(`no image digest in the push output:\n${pushed.slice(-600)}`);

    return `${repository}@${digest}`;
  }

  // The image, the secrets and the idle time belong to the host, so they apply to every box. A box's snapshot only
  // restores on the image it was taken on, and an image built in another checkout differs even for the same files
  // (its layer holds their times), so BOX_IMAGE=<image@digest> redeploys the Worker code alone on that image.
  // With Novu Bot's credentials (SLACK_ENV), the Slack router deploys first; it reaches boxes through the host's
  // Box class, so a host's very first deploy goes without it, and the next one adds it.
  async function deployHost() {
    const image = process.env.BOX_IMAGE ?? pushImage();
    // A new workers.dev name can take a minute to answer, so a router deployed here counts without asking.
    let slack = await routerExists();
    if (fs.existsSync(SLACK_ENV) && (await hostExists())) slack = deployRouter(log);
    if (!slack)
      log(`${ROUTER} isn't deployed, so boxes get no Slack; it deploys with the host when ${SLACK_ENV} exists`);
    withTempDir(HOST, (dir) => {
      const config = join(dir, 'wrangler.json');
      const secrets = join(dir, 'secrets.json');
      fs.writeFileSync(
        config,
        JSON.stringify({
          name: HOST,
          main: join(HERE, 'worker.js'),
          compatibility_date: COMPATIBILITY_DATE,
          // Only so `hostExists` can ask cheaply; it answers 404 to everything.
          workers_dev: true,
          containers: [{ class_name: 'Box', scheduling_policy: 'durable_object', images: { box: { image } } }],
          durable_objects: { bindings: [{ name: 'BOX', class_name: 'Box' }] },
          exports: { Box: { type: 'durable-object', storage: 'sqlite' } },
          observability: { enabled: true },
          ...(slack && { services: [{ binding: 'SLACK', service: ROUTER, entrypoint: 'Registry' }] }),
          vars: {
            // Minutes without requests before a box saves itself and stops; default 60 (worker.js).
            ...(process.env.BOX_IDLE_MINUTES && { IDLE_MINUTES: process.env.BOX_IDLE_MINUTES }),
            ...(slack && { SLACK_API_URL: `https://${ROUTER}.${DOMAIN}/api/` }),
          },
        })
      );
      const env = readEnvFile(join(BOX_DIR, '.env'));
      fs.writeFileSync(
        secrets,
        JSON.stringify(Object.fromEntries(SECRETS.filter((k) => env[k]).map((k) => [k, env[k]]))),
        { mode: 0o600 }
      );
      log(`deploying ${HOST} with ${image.split('@')[1].slice(0, 19)}; this applies to every box`);
      run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config, '--secrets-file', secrets]);
    });
  }

  function deployBoxWorker() {
    withTempDir(worker, (dir) => {
      const config = join(dir, 'wrangler.json');
      fs.writeFileSync(
        config,
        JSON.stringify({
          name: worker,
          main: join(HERE, 'thin.js'),
          compatibility_date: COMPATIBILITY_DATE,
          workers_dev: true,
          durable_objects: { bindings: [{ name: 'BOX', class_name: 'Box', script_name: HOST }] },
          vars: { BOX_NAME: box },
          observability: { enabled: true },
        })
      );
      log(`deploying ${worker}`);
      run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config]);
    });
  }

  async function snapshotOf(name) {
    const response = await fetch(`https://novu-box-${name}.${DOMAIN}/__box/state`, {
      headers: { Authorization: `Bearer ${githubToken()}` },
    });

    return response.headers.get('content-type')?.includes('json') ? (await response.json()).snapshot?.id : null;
  }

  // The snapshot a new box starts from: `from`'s, or base's for a branch box that doesn't exist yet; none means bake.
  async function startingSnapshot({ from, fromBase, ref }) {
    if (from) {
      const id = await snapshotOf(from);
      if (!id) throw new Error(`novu-box-${from} has no snapshot to start from`);

      return id;
    }
    if (!fromBase || box === 'base' || (await state())) return null;
    const id = await snapshotOf('base');
    log(id ? `${worker} is new: starting it from novu-box-base` : `no novu-box-base snapshot: baking ${ref}`);

    return id;
  }

  // The host answers its own plain-text 404; Cloudflare's 404 page (HTML) means it isn't deployed.
  async function hostExists() {
    const response = await fetch(`https://${HOST}.${DOMAIN}/`).catch(() => null);

    return response?.status === 404 && response.headers.get('content-type')?.includes('text/plain');
  }

  async function waitUntilReady(seconds) {
    const deadline = Date.now() + seconds * 1000;
    let report;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      report = await stream({ cmd: ['node', '/opt/box/box.mjs', 'doctor'] }, { capture: true })
        .then(JSON.parse)
        .catch((error) => ({ ok: false, problems: [error.message.slice(0, 200)] }));
      if (report.ok) return;
    }
    throw new Error(`${worker} isn't ready after ${seconds}s: ${report?.problems?.join('; ')}`);
  }

  return {
    name: worker,
    mailUrl: `${origin}/mail`,

    // `from`: the first start begins from that box's latest snapshot instead of a bake.
    // `fromBase`: a box that doesn't exist yet starts from the `base` box's snapshot when there is one, else bakes.
    async up({ deploy: redeploy = false, ref = 'next', from, fromBase = false } = {}) {
      const query = new URLSearchParams({ ref });
      const snapshot = await startingSnapshot({ from, fromBase, ref });
      if (snapshot) query.set('from', snapshot);
      // --deploy: a change to docker/box (image or Worker code) goes to the host, so to every box.
      if (redeploy || !(await hostExists())) await deployHost();
      if (redeploy || !(await state())) deployBoxWorker();
      const { state: started } = await (await call(`/up?${query}`, { method: 'POST' })).json();
      log(`${worker}: ${started}${started === 'baking' ? ` ${ref} (11 to 14 minutes)` : ''}`);
      await waitUntilReady(READY_WITHIN_SECONDS[started]);
      log(`${worker} is ready`);
      console.log(`box: ${origin}`);
      console.log(`mailpit: ${origin}/mail`);

      return 0;
    },

    async down() {
      log(`${worker}: saving to its snapshot and stopping (3 to 6 minutes); the next request wakes it`);
      await call('/down', { method: 'POST' });
      const deadline = Date.now() + 15 * 60_000;
      while ((await state())?.running) {
        if (Date.now() > deadline) throw new Error(`${worker} is still saving after 15 minutes`);
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
      console.log(JSON.stringify({ state: 'asleep', snapshot: (await state())?.snapshot?.id }));

      return 0;
    },

    // Stops the box and forgets it (snapshot and settings), then deletes its Worker. Other boxes are untouched.
    async delete() {
      if (await state()) {
        log(`${worker}: stopping and forgetting the box`);
        await call('/destroy', { method: 'POST' });
      }
      log(`deleting ${worker}`);
      run(WRANGLER[0], [...WRANGLER.slice(1), 'delete', '--name', worker, '--force']);

      return 0;
    },

    async ready() {
      const current = await state();
      if (!current) throw new Error(`${worker} doesn't exist: \`cli.mjs up --cloud --box ${box}\``);
      if (current.running) return;
      log(`${worker} is asleep; waking it`);
      await call('/up', { method: 'POST' });
      await waitUntilReady(READY_WITHIN_SECONDS.waking);
    },

    box: (args, { github = false, capture = false } = {}) =>
      stream({ cmd: ['node', '/opt/box/box.mjs', ...args], github }, { capture }),

    exec: (cmd) => stream({ cmd, cwd: '/data/novu' }),

    async put(file, path) {
      await call(`/file?path=${encodeURIComponent(path)}`, { method: 'PUT', body: fs.readFileSync(file) });
    },
  };
}

// The Slack router (slack-router.js), one for every box: Novu Bot's events, interactivity and /novu-box come to
// https://novu-box-slack.<workers.dev>/slack.
function deployRouter(log) {
  const env = readEnvFile(SLACK_ENV);
  for (const name of ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'])
    if (!env[name]) throw new Error(`${SLACK_ENV} has no ${name}`);
  const origin = `https://${ROUTER}.${DOMAIN}`;
  withTempDir(ROUTER, (dir) => {
    const config = join(dir, 'wrangler.json');
    const secrets = join(dir, 'secrets.json');
    fs.writeFileSync(
      config,
      JSON.stringify({
        name: ROUTER,
        main: join(HERE, 'slack-router.js'),
        compatibility_date: COMPATIBILITY_DATE,
        workers_dev: true,
        durable_objects: {
          bindings: [
            { name: 'ROUTER', class_name: 'Router' },
            { name: 'BOX', class_name: 'Box', script_name: HOST },
          ],
        },
        exports: { Router: { type: 'durable-object', storage: 'sqlite' } },
        vars: { ORIGIN: origin, CHANNEL: SLACK_CHANNEL },
        observability: { enabled: true },
      })
    );
    fs.writeFileSync(
      secrets,
      JSON.stringify({ SLACK_BOT_TOKEN: env.SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET: env.SLACK_SIGNING_SECRET }),
      { mode: 0o600 }
    );
    log(`deploying ${ROUTER}; Novu Bot's request URL is ${origin}/slack`);
    run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config, '--secrets-file', secrets]);
  });

  return true;
}

async function routerExists() {
  const response = await fetch(`https://${ROUTER}.${DOMAIN}/`).catch(() => null);

  return response?.ok && (await response.text()).startsWith(ROUTER);
}

function withTempDir(name, fn) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), `${name}-`));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
}

function output(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0)
    throw new Error(`${cmd} ${args.join(' ')} failed: ${(result.stderr || result.stdout).slice(-600)}`);

  return `${result.stdout}\n${result.stderr}`.trim();
}

function readEnvFile(file) {
  const entries = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean);

  return Object.fromEntries(entries.map((match) => [match[1], match[2]]));
}
