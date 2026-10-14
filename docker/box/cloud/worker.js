// Novu Box on Cloudflare: one Worker per box (`novu-box-<box>` on workers.dev) with one Durable Object that owns the
// box's container. `cli.mjs --cloud` deploys and drives it; browsers reach the box through it.
//
//   /__box/*   control, for GitHub users with push access to novuhq/novu (Authorization: Bearer <GitHub token>)
//     GET  /__box/state             the container and its snapshot
//     POST /__box/up?ref=next       start the box: wake it from its snapshot, or bake `ref` into a new one
//     POST /__box/exec              {cmd, cwd?, github?} run a command in the box and stream its output
//     PUT  /__box/file?path=<file>  write the request body to a file in the box
//     POST /__box/down              save the box to its snapshot and stop it
//   anything else                   the box's one address (Caddy :18080): dashboard, API, socket, S3, Mailpit
//
// After an hour without requests the Durable Object saves the box to a snapshot and stops it; the next request
// wakes it (about 35 s). Cloudflare can't see what runs inside, so the Durable Object keeps the time itself, on a
// one-minute alarm, as in Cloudflare's "save a sandbox automatically" recipe.

import { DurableObject } from 'cloudflare:workers';

const PUBLIC_PORT = 18080;
const INSTANCE = 'standard-4';
const ALARM_MS = 60 * 1000;

// How long the box waits without requests before it saves itself and stops (the IDLE_MINUTES var, default 60).
// The backstop, Cloudflare's inactivity timeout, is shorter, as in its autosave recipe: each alarm renews it, so it
// only stops the container (without a snapshot) when the alarms stop.
function idleMs(env) {
  return Number(env.IDLE_MINUTES ?? 60) * 60 * 1000;
}

function backstopMs(env) {
  return Math.min(10 * 60 * 1000, idleMs(env) / 2);
}
const SECRETS = [
  'CLERK_SECRET_KEY',
  'BOX_SEED_PASSWORD',
  'STRIPE_API_KEY',
  'LAUNCH_DARKLY_SDK_KEY',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
];
// exec() passes only PATH from the image, so the rest of its ENV (docker/box/Dockerfile) is repeated here.
const IMAGE_ENV = {
  PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  HOME: '/root',
  COREPACK_HOME: '/data/corepack',
  COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
  WRANGLER_SEND_METRICS: 'false',
  pnpm_config_verify_deps_before_run: 'false',
  BOX_HOME: '/opt/box',
};
const BOX = ['node', '/opt/box/box.mjs'];
const START = ['tini', '--', ...BOX, 'start'];
// The last line of a streamed command, with its exit code; cloud/target.mjs reads it.
const EXIT_MARK = '__BOX_EXIT__';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/__box/') && !(await authorize(request)))
      return new Response('needs `Authorization: Bearer <GitHub token>` with push access to novuhq/novu\n', {
        status: 401,
      });

    return env.BOX.get(env.BOX.idFromName('box')).fetch(request);
  },
};

// Tokens checked in the last 5 minutes, by SHA-256; the token itself is never stored.
const authorized = new Map();

async function authorize(request) {
  const token = bearer(request);
  if (!token) return false;
  const key = await sha256(token);
  if (Date.now() - (authorized.get(key) ?? 0) < 5 * 60 * 1000) return true;
  const response = await fetch('https://api.github.com/repos/novuhq/novu', {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'novu-box' },
  });
  if (!response.ok || !(await response.json()).permissions?.push) return false;
  authorized.set(key, Date.now());

  return true;
}

export class Box extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    this.touch();
    try {
      return url.pathname.startsWith('/__box/') ? await this.control(request, url) : await this.serve(request, url);
    } catch (error) {
      return new Response(`${error?.stack ?? error}\n`, { status: 500 });
    }
  }

  async serve(request, url) {
    const container = this.ctx.container;
    if (!container.running) {
      if (!(await this.ctx.storage.get('snapshot')))
        return new Response('This box is not set up yet: run `node docker/box/cli.mjs up --cloud`.\n', { status: 503 });
      await this.wake(url.origin);

      return waking(request);
    }
    // The port speaks plain HTTP. The host stays the public one, which S3 signatures and Clerk check.
    const inside = new URL(request.url);
    inside.protocol = 'http:';
    try {
      return await container.getTcpPort(PUBLIC_PORT).fetch(new Request(inside, request));
    } catch (error) {
      // The container is up but the box isn't serving yet (it starts in about 35 s).
      console.log(`box not serving yet: ${error}`);

      return waking(request);
    }
  }

  async control(request, url) {
    const route = `${request.method} ${url.pathname}`;
    if (route === 'GET /__box/state') return json(await this.state());
    if (route === 'POST /__box/up') return json(await this.up(url, request));
    if (route === 'POST /__box/down') return json(await this.sleep('down'));
    if (!this.ctx.container.running)
      return new Response('the box is not running: `cli.mjs up --cloud`\n', { status: 409 });
    if (route === 'POST /__box/exec') {
      const { cmd, cwd, github } = await request.json();

      return streamed(await this.run(cmd, { cwd, github: github ? bearer(request) : undefined }));
    }
    if (route === 'PUT /__box/file') {
      const path = url.searchParams.get('path');
      const process = await this.run(['sh', '-c', 'cat > "$0"', path], { stdin: request.body });
      const exitCode = await process.exitCode;

      return json({ path, exitCode }, exitCode === 0 ? 200 : 500);
    }

    return new Response('not found\n', { status: 404 });
  }

  async state() {
    const snapshot = await this.ctx.storage.get('snapshot');

    return {
      running: this.ctx.container.running,
      snapshot: snapshot
        ? { id: snapshot.id, name: snapshot.name, gigabytes: snapshot.size ? +(snapshot.size / 1e9).toFixed(2) : null }
        : null,
      lastActivity: new Date(this.lastActivity ?? (await this.ctx.storage.get('lastActivity')) ?? 0).toISOString(),
      origin: await this.ctx.storage.get('origin'),
    };
  }

  // Wakes the box from its snapshot. The first time, it starts from another box's snapshot (`from`, its id) or
  // bakes `ref`. The GitHub token of the caller is in the bake's environment only; `box start` runs without it.
  async up(url, request) {
    await this.ctx.storage.put('origin', url.origin);
    if (this.ctx.container.running) return { state: 'running' };
    const from = url.searchParams.get('from');
    if (from && !(await this.ctx.storage.get('snapshot')))
      await this.ctx.storage.put('snapshot', { id: from, name: `from ${from}` });
    if (await this.ctx.storage.get('snapshot')) {
      await this.wake(url.origin);

      return { state: 'waking' };
    }
    const ref = url.searchParams.get('ref') ?? 'next';
    await this.start({ image: this.ctx.container.images.box, entrypoint: ['tini', '--', 'sleep', 'infinity'] });
    const bake = `mkdir -p /data/logs && nohup sh -c 'node /opt/box/box.mjs bake "$0" && exec env -u GITHUB_TOKEN node /opt/box/box.mjs start' "$0" > /data/logs/up.log 2>&1 &`;
    await (await this.run(['sh', '-c', bake, ref], { github: bearer(request) })).exitCode;

    return { state: 'baking', ref };
  }

  async wake(origin) {
    if (this.ctx.container.running) return;
    await this.start({ containerSnapshot: await this.ctx.storage.get('snapshot'), entrypoint: START }, origin);
  }

  async start(options, origin) {
    this.ctx.container.start({
      instance: INSTANCE,
      enableInternet: true,
      env: await this.boxEnv(origin),
      ...options,
    });
    await this.ctx.container.setInactivityTimeout(backstopMs(this.env));
    await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
    this.touch();
  }

  // Every 60 s while the box runs: after an hour without requests, and with no bake or apply running, it sleeps.
  async alarm() {
    if (!this.ctx.container.running) return;
    await this.ctx.container.setInactivityTimeout(backstopMs(this.env));
    await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
    const last = Math.max(this.lastActivity ?? 0, (await this.ctx.storage.get('lastActivity')) ?? 0);
    if (Date.now() - last < idleMs(this.env) || (await this.busy())) return;
    await this.sleep('idle');
  }

  // Stops the apps and databases so their files are whole, saves the disk to a snapshot, then stops the container.
  // A box whose first bake never finished has nothing worth saving.
  async sleep(reason) {
    const container = this.ctx.container;
    if (!container.running) return { state: 'stopped' };
    await this.ctx.storage.deleteAlarm();
    const baked = (await (await this.run(['test', '-f', '/data/.baked.json'])).exitCode) === 0;
    if (baked) {
      await (await this.run([...BOX, 'quiesce'])).exitCode;
      const snapshot = await container.snapshotContainer({ name: 'box' });
      await this.ctx.storage.put('snapshot', snapshot);
    }
    await container.destroy(reason);

    return { state: baked ? 'asleep' : 'stopped without a snapshot (never baked)' };
  }

  async busy() {
    const process = await this.run(['sh', '-c', 'ps -eo args | grep -c -E "^node /opt/box/box.mjs (bake|apply)"']);
    const { stdout } = await process.output();

    return Number(new TextDecoder().decode(stdout).trim()) > 0;
  }

  async run(cmd, { cwd, github, stdin } = {}) {
    return this.ctx.container.exec(cmd, {
      env: { ...IMAGE_ENV, ...(await this.boxEnv()), ...(github && { GITHUB_TOKEN: github }) },
      cwd,
      stderr: 'combined',
      ...(stdin && { stdin }),
    });
  }

  // The secrets and the box's public URLs, for the box and for every command run in it (an apply that rebuilds the
  // dashboard writes these URLs into it).
  async boxEnv(origin) {
    const base = origin ?? (await this.ctx.storage.get('origin'));
    const secrets = Object.fromEntries(SECRETS.filter((name) => this.env[name]).map((name) => [name, this.env[name]]));
    if (!base) return secrets;

    return {
      ...secrets,
      API_ROOT_URL: base,
      FRONT_BASE_URL: base,
      DASHBOARD_URL: base,
      VITE_API_HOSTNAME: base,
      VITE_DASHBOARD_URL: base,
      VITE_WEBSOCKET_HOSTNAME: `${base.replace(/^http/, 'ws')}/ws`,
      S3_LOCAL_STACK: base,
      CDN_URL: `${base}/cdn`,
    };
  }

  touch() {
    const now = Date.now();
    this.lastActivity = now;
    if (now - (this.persistedActivity ?? 0) > 60 * 1000) {
      this.persistedActivity = now;
      this.ctx.storage.put('lastActivity', now);
    }
  }
}

// The command's output as it comes, then a last line with its exit code, which cli.mjs reads.
function streamed(process) {
  const { readable, writable } = new TransformStream();
  const finish = async () => {
    await process.stdout.pipeTo(writable, { preventClose: true }).catch(() => {});
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(`\n${EXIT_MARK} ${await process.exitCode}\n`));
    await writer.close();
  };
  // A client that disconnects only stops the stream; the command keeps running.
  finish().catch(() => {});

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function waking(request) {
  if (request.headers.get('Accept')?.includes('text/html'))
    return new Response(
      '<!doctype html><meta http-equiv="refresh" content="5"><title>Waking up</title><p>This Novu Box is waking up (about 35 s). The page reloads by itself.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html', 'Retry-After': '5' } }
    );

  return new Response('the box is waking up\n', { status: 503, headers: { 'Retry-After': '10' } });
}

function bearer(request) {
  return request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200) {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
