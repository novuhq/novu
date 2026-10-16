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
export const ROUTER = 'novu-box-slack';
const COMPATIBILITY_DATE = '2026-09-29';
// The Novu account's workers.dev subdomain.
export const DOMAIN = process.env.BOX_CLOUD_DOMAIN ?? 'cli-shortener.workers.dev';
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
export const SLACK_ENV = process.env.BOX_SLACK_ENV ?? join(os.homedir(), '.config/novu-box/slack.env');
// #novu-box, the one channel the router posts in besides DMs.
export const SLACK_CHANNEL = process.env.BOX_SLACK_CHANNEL ?? 'C0C9PHBUDR6';
// A first bake takes 11 to 14 minutes on Cloudflare; a wake about 35 s, but the first restore of a snapshot 4 to 6
// minutes (the Slack router waits as long).
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 8 * 60, running: 5 * 60 };

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

  // null only when the box's Worker doesn't exist (Cloudflare's 404 page); a failed request throws.
  async function state() {
    const response = await call('/state');

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
  // With Novu Bot's credentials (SLACK_ENV), the host runs the Slack router with them, and the router's address
  // `novu-box-slack` (thin.js) deploys after it.
  function deployHost() {
    const image = process.env.BOX_IMAGE ?? pushImage();
    const slack = fs.existsSync(SLACK_ENV) && readEnvFile(SLACK_ENV);
    for (const name of ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'])
      if (slack && !slack[name]) throw new Error(`${SLACK_ENV} has no ${name}`);
    if (!slack) log(`no ${SLACK_ENV}, so boxes get no Slack`);
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
          durable_objects: {
            bindings: [
              { name: 'BOX', class_name: 'Box' },
              { name: 'ROUTER', class_name: 'Router' },
            ],
          },
          exports: {
            Box: { type: 'durable-object', storage: 'sqlite' },
            Router: { type: 'durable-object', storage: 'sqlite' },
          },
          observability: { enabled: true },
          vars: {
            // Minutes without requests before a box saves itself and stops; default 60 (worker.js).
            ...(process.env.BOX_IDLE_MINUTES && { IDLE_MINUTES: process.env.BOX_IDLE_MINUTES }),
            ...(slack && { SLACK_ROUTER_URL: `https://${ROUTER}.${DOMAIN}`, SLACK_CHANNEL }),
          },
        })
      );
      const env = readEnvFile(join(BOX_DIR, '.env'));
      const values = Object.fromEntries(SECRETS.filter((k) => env[k]).map((k) => [k, env[k]]));
      if (slack)
        Object.assign(values, {
          SLACK_BOT_TOKEN: slack.SLACK_BOT_TOKEN,
          SLACK_SIGNING_SECRET: slack.SLACK_SIGNING_SECRET,
        });
      fs.writeFileSync(secrets, JSON.stringify(values), { mode: 0o600 });
      log(`deploying ${HOST} with ${image.split('@')[1].slice(0, 19)}; this applies to every box`);
      run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config, '--secrets-file', secrets]);
    });
    if (slack) {
      log(`deploying ${ROUTER}; Novu Bot's request URL is https://${ROUTER}.${DOMAIN}/slack`);
      deployThin(ROUTER, { name: 'BOX', class_name: 'Router', script_name: HOST }, 'router');
    }
  }

  function deployBoxWorker() {
    log(`deploying ${worker}`);
    deployThin(worker, { name: 'BOX', class_name: 'Box', script_name: HOST }, box);
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
      const current = await state().catch(() => null);
      if (current?.lostSnapshot && !current.running && !current.snapshot)
        throw new Error(
          `${worker} couldn't restore snapshot ${current.lostSnapshot.id} (${current.lostSnapshot.message}); snapshots expire 30 days after they were made or last restored. Run \`up\` again to bake it`
        );
      report = await stream({ cmd: ['node', '/opt/box/box.mjs', 'doctor'] }, { capture: true })
        .then(JSON.parse)
        .catch((error) => ({ ok: false, problems: [error.message.slice(0, 200)] }));
      if (report.ok) return;
    }
    throw new Error(`${worker} isn't ready after ${seconds}s: ${report?.problems?.join('; ')}`);
  }

  // 0 once the box stopped with a snapshot other than `previous`, 1 when it stopped without one.
  async function waitUntilAsleep(previous) {
    const deadline = Date.now() + 15 * 60_000;
    for (;;) {
      // A request that fails doesn't mean the box stopped; ask again.
      const current = await state().catch(() => null);
      if (current && !current.running) {
        console.log(JSON.stringify({ state: 'asleep', snapshot: current.snapshot?.id }));
        if (current.snapshot?.id && current.snapshot.id !== previous) return 0;
        log(`${worker} stopped WITHOUT a new snapshot: its next start bakes, or wakes from an older snapshot`);

        return 1;
      }
      if (current && !current.saving && current.saveError)
        throw new Error(`${worker} couldn't save, so it keeps running: ${current.saveError.message}`);
      if (Date.now() > deadline) throw new Error(`${worker} is still saving after 15 minutes`);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
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
      if (redeploy || !(await hostExists())) deployHost();
      if (redeploy || !(await state())) deployBoxWorker();
      const { state: started } = await (await call(`/up?${query}`, { method: 'POST' })).json();
      log(`${worker}: ${started}${started === 'baking' ? ` ${ref} (11 to 14 minutes)` : ''}`);
      await waitUntilReady(READY_WITHIN_SECONDS[started]);
      log(`${worker} is ready`);
      console.log(`box: ${origin}`);
      console.log(`mailpit: ${origin}/mail`);

      return 0;
    },

    // Done when the box stopped with a snapshot newer than the one it had.
    async down() {
      const before = await state();
      if (before && !before.running) {
        log(`${worker} is already asleep (snapshot ${before.snapshot?.id ?? 'none'})`);

        return before.snapshot?.id ? 0 : 1;
      }
      log(
        `${worker}: saving to its snapshot and stopping (3 to 6 minutes, after a bake or apply that runs); the next request wakes it`
      );
      await call('/down', { method: 'POST' });

      return waitUntilAsleep(before?.snapshot?.id);
    },

    // Stops the box and forgets it (snapshot and settings), then deletes its Worker. Other boxes are untouched. When
    // the box can't be asked, this stops before deleting the Worker, which would leave the box running unreachable.
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

// A Worker on workers.dev that forwards everything to one Durable Object in the host: a box's address, or the
// Slack router's (Novu Bot's events, interactivity and /novu-box come to https://novu-box-slack.<workers.dev>/slack).
function deployThin(name, binding, objectName) {
  withTempDir(name, (dir) => {
    const config = join(dir, 'wrangler.json');
    fs.writeFileSync(
      config,
      JSON.stringify({
        name,
        main: join(HERE, 'thin.js'),
        compatibility_date: COMPATIBILITY_DATE,
        workers_dev: true,
        durable_objects: { bindings: [binding] },
        vars: { BOX_NAME: objectName },
        observability: { enabled: true },
      })
    );
    run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config]);
  });
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

export function readEnvFile(file) {
  const entries = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean);

  return Object.fromEntries(entries.map((match) => [match[1], match[2]]));
}
