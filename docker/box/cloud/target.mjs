// cli.mjs `--cloud`: the box runs on Cloudflare in the host Worker `novu-box-host` (worker.js, shared by all boxes)
// and is reached through its own thin Worker `novu-box-<box>` on workers.dev (thin.js). The same commands as for a
// local box, over HTTPS, signed in with your GitHub token (`gh auth token`).

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { output, readEnvFile, run } from '../node.mjs';
import { BOX_CLI, boxWorker, COMPATIBILITY_DATE, EXIT_MARK, HOST, ROUTER, SECRETS, THIN_MODULES } from './shared.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const BOX_DIR = join(HERE, '..');
const WRANGLER = ['npx', '--yes', 'wrangler@4.150.0'];
// The Novu account and its workers.dev subdomain.
const ACCOUNT_ID = '33ec6e8088201ace372678be50170681';
export const DOMAIN = process.env.BOX_CLOUD_DOMAIN ?? 'cli-shortener.workers.dev';
// Novu Bot's credentials, for the router only (never a box): SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET.
export const SLACK_ENV = process.env.BOX_SLACK_ENV ?? join(os.homedir(), '.config/novu-box/slack.env');
// The host's own keys, which no box gets: GITHUB_READ_TOKEN (fine-grained, read-only: Contents and Checks on
// novuhq/novu and novuhq/packages-enterprise), for the boxes' git fetches and CI lookups instead of the caller's
// token; CLOUDFLARE_API_TOKEN (Workers Scripts: Edit on the Novu account), for /__box/boxes (boxes.js).
const GITHUB_ENV = join(os.homedir(), '.config/novu-box/github.env');
const CLOUDFLARE_ENV = join(os.homedir(), '.config/novu-box/cloudflare.env');
// #novu-box, the one channel the router posts in besides DMs.
export const SLACK_CHANNEL = process.env.BOX_SLACK_CHANNEL ?? 'C0C9PHBUDR6';
// A first bake takes 11 to 14 minutes on Cloudflare; a wake about 35 s, but the first restore of a snapshot 4 to 6
// minutes (the Slack router waits as long).
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 8 * 60, running: 5 * 60 };

// A request to a box's Worker or the host's routes, through what Cloudflare and the box answer while they can't yet:
// right after a deploy, an HTML page, a 404 (the new workers.dev name isn't live everywhere yet) or error 1042 (the
// host's class isn't reachable yet), for up to a minute; while a box saves, 503 with X-Box-Phase: saving, for up to
// 15 minutes. Cloudflare's 404 page means the Worker doesn't exist: null when `missing` is null.
async function boxFetch(url, init, { githubToken, log, missing = undefined }) {
  const savingUntil = Date.now() + 15 * 60_000;
  for (let pages = 0; ; ) {
    const response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${await githubToken()}`, ...init.headers },
    });
    if (response.headers.get('content-type')?.includes('text/html')) {
      if (response.status === 404 && missing === null) return null;
      if (++pages === 45) throw new Error(`${url} answers Cloudflare's ${response.status} page after 90 s`);
      await sleep(2000);
    } else if (response.status === 503 && response.headers.get('x-box-phase') === 'saving') {
      if (Date.now() > savingUntil) throw new Error(`${new URL(url).hostname} is still saving after 15 minutes`);
      log(`${new URL(url).hostname} is saving to its snapshot; waiting`);
      await sleep(15_000);
    } else return response;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The host's routes (boxes.js): list, create and delete boxes' Workers, and the Slack router's.
export async function hostBoxes(path, { method = 'GET', githubToken, log = () => {} }) {
  const response = await boxFetch(`https://${HOST}.${DOMAIN}/__box/${path}`, { method }, { githubToken, log });
  const body = await response.text();
  if (!response.ok) throw new Error(`${method} ${HOST}/__box/${path} -> ${response.status}: ${body.slice(0, 300)}`);

  return JSON.parse(body);
}

// `mayDeployHost`: whether `up` deploys the host when it's missing (with wrangler, Docker and Cloudflare's login); CI
// can't. `deadline`: no wait runs past it (CI's job time).
export function cloudTarget({ box, log, githubToken, mayDeployHost = true, deadline = Infinity }) {
  const worker = boxWorker(box);
  const origin = `https://${worker}.${DOMAIN}`;

  async function call(path, init = {}) {
    const response = await boxFetch(`${origin}/__box${path}`, init, {
      githubToken,
      log,
      ...(path === '/state' && { missing: null }),
    });
    if (response && !response.ok && response.status !== 409)
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
    const pushed = output(WRANGLER[0], [...WRANGLER.slice(1), 'containers', 'push', tag], { combined: true });
    // "<tag>: digest: sha256:<hex> size: …" then "Pushed image: registry.cloudflare.com/<account>/novu-box:<tag>".
    const digest = pushed.match(/digest: (sha256:[0-9a-f]{64})/)?.[1];
    const repository = pushed.match(/Pushed image: (\S+):[^:\s]+\s*$/m)?.[1];
    if (!digest || !repository) throw new Error(`no image digest in the push output:\n${pushed.slice(-600)}`);

    return `${repository}@${digest}`;
  }

  // The image, the secrets and the idle time belong to the host, so they apply to every box. A box's snapshot only
  // restores on the image it was taken on, and an image built in another checkout differs even for the same files
  // (its layer holds their times), so BOX_IMAGE=<image@digest> redeploys the Worker code alone on that image.
  // With Novu Bot's credentials (SLACK_ENV), the host runs the Slack router with them, and has the router's address
  // `novu-box-slack` (thin.js) uploaded after it.
  // GITHUB_ENV and CLOUDFLARE_ENV go to the host the same way, as secrets outside SECRETS, so no box gets them.
  async function deployHost() {
    const image = process.env.BOX_IMAGE ?? pushImage();
    const slack = readKeys(SLACK_ENV, ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']);
    if (!slack) log(`no ${SLACK_ENV}, so boxes get no Slack`);
    const github = readKeys(GITHUB_ENV, ['GITHUB_READ_TOKEN']);
    if (!github) log(`no ${GITHUB_ENV}, so boxes fetch with their caller's token, and CI can't apply`);
    const cloudflare = readKeys(CLOUDFLARE_ENV, ['CLOUDFLARE_API_TOKEN']);
    if (!cloudflare)
      throw new Error(`${CLOUDFLARE_ENV} is missing; the host creates and deletes boxes' Workers with it`);
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
          // The box Worker's modules, which the host uploads for every box (boxes.js).
          define: {
            THIN_SOURCES: JSON.stringify(
              Object.fromEntries(THIN_MODULES.map((file) => [file, fs.readFileSync(join(HERE, file), 'utf8')]))
            ),
          },
          vars: {
            // Minutes without requests before a box saves itself and stops; default 60 (worker.js).
            ...(process.env.BOX_IDLE_MINUTES && { IDLE_MINUTES: process.env.BOX_IDLE_MINUTES }),
            ...(slack && { SLACK_ROUTER_URL: `https://${ROUTER}.${DOMAIN}`, SLACK_CHANNEL }),
            CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
          },
        })
      );
      const env = readEnvFile(join(BOX_DIR, '.env'));
      const values = Object.fromEntries(SECRETS.filter((k) => env[k]).map((k) => [k, env[k]]));
      Object.assign(values, slack, github, cloudflare);
      fs.writeFileSync(secrets, JSON.stringify(values), { mode: 0o600 });
      log(`deploying ${HOST} with ${image.split('@')[1].slice(0, 19)}; this applies to every box`);
      run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config, '--secrets-file', secrets]);
    });
    if (slack) {
      log(`deploying ${ROUTER}; Novu Bot's request URL is https://${ROUTER}.${DOMAIN}/slack`);
      await hostBoxes('router', { method: 'PUT', githubToken, log });
    }
  }

  async function snapshotOf(name) {
    const response = await fetch(`https://${boxWorker(name)}.${DOMAIN}/__box/state`, {
      headers: { Authorization: `Bearer ${await githubToken()}` },
    });

    return response.headers.get('content-type')?.includes('json') ? (await response.json()).snapshot?.id : null;
  }

  // The snapshot a new box starts from: `from`'s, or base's for a branch box that is new; none means bake.
  async function startingSnapshot({ from, fromBase, ref }) {
    if (from) {
      const id = await snapshotOf(from);
      if (!id) throw new Error(`${boxWorker(from)} has no snapshot to start from`);

      return id;
    }
    const phase = (await state())?.phase ?? 'new';
    if (!fromBase || box === 'base' || !['new', 'lost'].includes(phase)) return null;
    const id = await snapshotOf('base');
    log(
      id ? `${worker} is new: starting it from ${boxWorker('base')}` : `no ${boxWorker('base')} snapshot: baking ${ref}`
    );

    return id;
  }

  // The host answers its own plain-text 404; Cloudflare's 404 page (HTML) means it isn't deployed.
  async function hostExists() {
    const response = await fetch(`https://${HOST}.${DOMAIN}/`).catch(() => null);

    return response?.status === 404 && response.headers.get('content-type')?.includes('text/plain');
  }

  // The box's doctor report, or null while it can't give one (baking, starting).
  async function doctor() {
    return stream({ cmd: ['sh', '-c', `${BOX_CLI.join(' ')} doctor || true`] }, { capture: true })
      .then(JSON.parse)
      .catch(() => null);
  }

  // Why the box won't get ready, when its phase says so: its snapshot is lost, or it stopped (its bake failed).
  async function stuck() {
    const current = await state().catch(() => null);
    if (current?.phase === 'lost')
      return `${worker} couldn't restore snapshot ${current.lost.id} (${current.lost.message}); snapshots expire 30 days after they were made or last restored. Run \`up\` again to bake it`;
    if (current?.phase === 'new') return `${worker} stopped: ${current.error?.message ?? 'never started'}`;

    return null;
  }

  // Asks the doctor every 10 s until `accept` takes its report, and returns that; throws when the box won't get there
  // (`stuck`), and after `seconds` or at the deadline. `orLast`: return the last report then instead (null if there
  // was none).
  async function waitFor(seconds, accept, { orLast = false } = {}) {
    const until = Math.min(Date.now() + seconds * 1000, deadline);
    let report = null;
    for (;;) {
      const why = await stuck();
      if (why) throw new Error(why);
      report = (await doctor()) ?? report;
      if (report && accept(report)) return report;
      if (Date.now() > until) break;
      await sleep(10_000);
    }
    if (orLast) return report;
    const when = until === deadline ? "the job's time is up" : `after ${seconds}s`;
    throw new Error(`${worker} isn't ready (${when}): ${report?.problems?.join('; ') ?? 'no doctor report'}`);
  }

  // 0 once the box stopped with a snapshot other than `previous`, 1 when it stopped without one.
  async function waitUntilAsleep(previous) {
    const until = Date.now() + 15 * 60_000;
    for (;;) {
      // A request that fails doesn't mean the box stopped; ask again.
      const current = await state().catch(() => null);
      if (current && !current.running && current.phase !== 'saving') {
        console.log(JSON.stringify({ state: current.phase, snapshot: current.snapshot?.id }));
        if (current.snapshot?.id && current.snapshot.id !== previous) return 0;
        log(`${worker} stopped WITHOUT a new snapshot: its next start bakes, or wakes from an older snapshot`);

        return 1;
      }
      if (current?.phase === 'running' && !current.saveTries && current.error)
        throw new Error(`${worker} couldn't save, so it keeps running: ${current.error.message}`);
      if (Date.now() > until) throw new Error(`${worker} is still saving after 15 minutes`);
      await sleep(10_000);
    }
  }

  return {
    name: worker,
    mailUrl: `${origin}/mail`,

    // `from`: the first start begins from that box's latest snapshot instead of a bake.
    // `fromBase`: a box that is new starts from the `base` box's snapshot when there is one, else bakes.
    async up({ deploy: redeploy = false, ref = 'next', from, fromBase = false } = {}) {
      const query = new URLSearchParams({ ref });
      const snapshot = await startingSnapshot({ from, fromBase, ref });
      if (snapshot) query.set('from', snapshot);
      // --deploy: a change to docker/box (image or Worker code) goes to the host, so to every box.
      if (redeploy || !(await hostExists())) {
        if (!mayDeployHost) throw new Error(`${HOST} isn't deployed; deploy it with \`cli.mjs up --cloud --deploy\``);
        await deployHost();
      }
      // Uploading the box's Worker is idempotent and takes about 2 s.
      log(`deploying ${worker}`);
      await hostBoxes(`boxes/${box}`, { method: 'PUT', githubToken, log });
      const { state: started } = await (await call(`/up?${query}`, { method: 'POST' })).json();
      log(`${worker}: ${started}${started === 'baking' ? ` ${ref} (11 to 14 minutes)` : ''}`);
      await waitFor(READY_WITHIN_SECONDS[started] ?? READY_WITHIN_SECONDS.running, (report) => report.ok);
      log(`${worker} is ready`);
      console.log(`box: ${origin}`);
      console.log(`mailpit: ${origin}/mail`);

      return 0;
    },

    // Done when the box stopped with a snapshot newer than the one it had.
    async down() {
      const before = await state();
      if (!before) throw new Error(`${worker} doesn't exist`);
      if (!before.running) {
        log(`${worker} is already ${before.phase} (snapshot ${before.snapshot?.id ?? 'none'})`);

        return before.snapshot?.id ? 0 : 1;
      }
      log(
        `${worker}: saving to its snapshot and stopping (3 to 6 minutes, after a bake or apply that runs); the next request wakes it`
      );
      await call('/down', { method: 'POST' });

      return waitUntilAsleep(before.snapshot?.id);
    },

    // The host stops the box and forgets it (snapshot and settings), then deletes its Worker; when the box can't be
    // stopped, its Worker stays, so the box isn't left running unreachable. Other boxes are untouched.
    async delete() {
      log(`${worker}: stopping and forgetting the box, then deleting its Worker`);
      await hostBoxes(`boxes/${box}`, { method: 'DELETE', githubToken, log });

      return 0;
    },

    // Wakes the box if it sleeps, and waits for its doctor to pass; a running box passes at once. `reachable`: any
    // doctor answer will do, even a running box's, for an apply, which fixes or replaces what the doctor finds.
    async ready({ reachable = false } = {}) {
      const current = await state();
      if (!current) throw new Error(`${worker} doesn't exist: \`cli.mjs up --cloud --box ${box}\``);
      if (['new', 'lost'].includes(current.phase))
        throw new Error(`${worker} isn't set up (${current.phase}): \`cli.mjs up --cloud --box ${box}\``);
      if (current.phase === 'running' && current.running && !reachable) return;
      if (!current.running || current.phase === 'saving') {
        log(`${worker} is ${current.phase}; waking it`);
        await call('/up', { method: 'POST' });
      }
      const wait = current.phase === 'baking' ? 'baking' : current.running ? 'running' : 'waking';
      await waitFor(READY_WITHIN_SECONDS[wait], reachable ? () => true : (report) => report.ok);
    },

    // The doctor's report once the box is fit, or its last one after `seconds`: what an apply left behind.
    settled: (seconds) => waitFor(seconds, (report) => report.ok, { orLast: true }),

    state,

    run: (cmd, { github = false, capture = false } = {}) => stream({ cmd, github }, { capture }),

    box: (args, { github = false, capture = false } = {}) =>
      stream({ cmd: [...BOX_CLI, ...args], github }, { capture }),

    exec: (cmd) => stream({ cmd, cwd: '/data/novu' }),

    async put(file, path) {
      await call(`/file?path=${encodeURIComponent(path)}`, { method: 'PUT', body: fs.readFileSync(file) });
    },
  };
}

function withTempDir(name, fn) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), `${name}-`));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// The named keys from one of ~/.config/novu-box/*.env, or null when the file isn't there.
function readKeys(file, names) {
  if (!fs.existsSync(file)) return null;
  const keys = readEnvFile(file);
  for (const name of names) if (!keys[name]) throw new Error(`${file} has no ${name}`);

  return Object.fromEntries(names.map((name) => [name, keys[name]]));
}
