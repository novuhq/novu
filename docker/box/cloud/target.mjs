// cli.mjs `--cloud`: the box runs on Cloudflare as the Worker `novu-box-<box>` (worker.js), on workers.dev. The same
// commands as for a local box, over HTTPS, signed in with your GitHub token (`gh auth token`).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const BOX_DIR = join(HERE, '..');
const WRANGLER = ['npx', '--yes', 'wrangler@4.150.0'];
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
// A first bake takes 11 to 14 minutes on Cloudflare; a wake about 35 s.
const READY_WITHIN_SECONDS = { baking: 25 * 60, waking: 5 * 60, running: 5 * 60 };

export function cloudTarget({ box, log, githubToken }) {
  const worker = `novu-box-${box}`;
  const origin = `https://${worker}.${DOMAIN}`;

  async function call(path, init = {}) {
    const response = await fetch(`${origin}/__box${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${githubToken()}`, ...init.headers },
    });
    if (response.status === 404 && path === '/state' && !response.headers.get('content-type')?.includes('json'))
      return null;
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

  // The image is built for amd64 and pushed once per change; every box Worker pins it by digest.
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

  function deploy() {
    const image = pushImage();
    const dir = fs.mkdtempSync(join(os.tmpdir(), `${worker}-`));
    const config = join(dir, 'wrangler.json');
    const secrets = join(dir, 'secrets.json');
    try {
      fs.writeFileSync(
        config,
        JSON.stringify({
          name: worker,
          main: join(HERE, 'worker.js'),
          compatibility_date: '2026-09-29',
          workers_dev: true,
          containers: [{ class_name: 'Box', scheduling_policy: 'durable_object', images: { box: { image } } }],
          durable_objects: { bindings: [{ name: 'BOX', class_name: 'Box' }] },
          exports: { Box: { type: 'durable-object', storage: 'sqlite' } },
          observability: { enabled: true },
          // Minutes without requests before the box saves itself and stops; default 60 (worker.js).
          ...(process.env.BOX_IDLE_MINUTES && { vars: { IDLE_MINUTES: process.env.BOX_IDLE_MINUTES } }),
        })
      );
      const env = readEnvFile(join(BOX_DIR, '.env'));
      fs.writeFileSync(
        secrets,
        JSON.stringify(Object.fromEntries(SECRETS.filter((k) => env[k]).map((k) => [k, env[k]]))),
        {
          mode: 0o600,
        }
      );
      log(`deploying ${worker} with ${image.split('@')[1].slice(0, 19)}`);
      run(WRANGLER[0], [...WRANGLER.slice(1), 'deploy', '-c', config, '--secrets-file', secrets]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
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

    // `from`: the first start begins from that box's latest snapshot instead of a bake.
    async up({ deploy: redeploy = false, ref = 'next', from } = {}) {
      const query = new URLSearchParams({ ref });
      if (from) {
        const source = await (
          await fetch(`https://novu-box-${from}.${DOMAIN}/__box/state`, {
            headers: { Authorization: `Bearer ${githubToken()}` },
          })
        ).json();
        if (!source.snapshot?.id) throw new Error(`novu-box-${from} has no snapshot to start from`);
        query.set('from', source.snapshot.id);
      }
      if (redeploy || !(await state())) {
        deploy();
        // A new workers.dev name answers 404 for a few seconds.
        for (let attempt = 0; !(await state()); attempt++) {
          if (attempt === 30) throw new Error(`${origin} doesn't answer a minute after the deploy`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      const { state: started } = await (await call(`/up?${query}`, { method: 'POST' })).json();
      log(`${worker}: ${started}${started === 'baking' ? ` ${ref} (11 to 14 minutes)` : ''}`);
      await waitUntilReady(READY_WITHIN_SECONDS[started]);
      log(`${worker} is ready`);
      console.log(`box: ${origin}`);
      console.log(`mailpit: ${origin}/mail`);

      return 0;
    },

    async down() {
      log(`${worker}: saving to its snapshot and stopping (about 3 minutes); the next request wakes it`);
      console.log(JSON.stringify(await (await call('/down', { method: 'POST' })).json()));

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
