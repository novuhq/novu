// Novu Box on Cloudflare, the host Worker `novu-box-host`: the Box class, one Durable Object per box that owns the
// box's container. Every box shares this class, its image and its secrets, so a new box starts from another box's
// snapshot as Cloudflare documents it (within one class). The host's own address only answers 404; each box has a
// thin Worker `novu-box-<box>` on workers.dev (thin.js) that checks /__box/* callers and forwards to Box(<box>).
// `cli.mjs --cloud` deploys and drives them; browsers reach a box through its thin Worker. The host's address also
// answers /__box/boxes, which lists, creates and deletes boxes' Workers for CI (boxes.js).
//
//   /__box/*   control, for GitHub users with push access to novuhq/novu and the Novu Box workflow (auth.mjs)
//     GET  /__box/state             the container and its snapshot; doesn't count as activity
//     POST /__box/up?ref=next       start the box: wake it from its snapshot, or bake `ref` into a new one
//     POST /__box/exec              {cmd, cwd?, github?} run a command in the box and stream its output
//     PUT  /__box/file?path=<file>  write the request body to a file in the box
//     POST /__box/down              save the box to its snapshot and stop it
//     POST /__box/destroy           stop the box and forget it (its snapshot and settings)
//   anything else                   the box's one address (Caddy :18080): dashboard, API, socket, S3, Mailpit
//
// After an hour without requests the Durable Object saves the box to a snapshot and stops it; the next request
// wakes it (about 35 s). Cloudflare can't see what runs inside, so the Durable Object keeps the time itself, on a
// one-minute alarm, as in Cloudflare's "save a sandbox automatically" recipe.
//
// Slack: the router (slack-router.js) runs here too, as the Router Durable Object, and each Box does its part through
// box-slack.js, at the hooks marked `Slack:` below. A host deployed without the router's settings has no Slack.

import { DurableObject } from 'cloudflare:workers';
import { isOidc } from './auth.mjs';
import { BoxSlack } from './box-slack.js';
import { boxes } from './boxes.js';
import { BOX_CLI, bearer, detached, EXIT_MARK, HOST, SECRETS, within } from './shared.mjs';

// Slack: the router's Durable Object class.
export { Router } from './slack-router.js';

const PUBLIC_PORT = 18080;
const INSTANCE = 'standard-4';
const ALARM_MS = 60 * 1000;
// Past the longest save seen (over 6 minutes for a big disk): while the box saves, its alarm and inactivity timeout are
// set this far ahead, so neither stops it half saved.
const SAVE_MS = 20 * 60 * 1000;
// What the alarm gives a call into the box (a command, its API): a hung bridge or API mustn't stall the idle check.
const CALL_MS = 30 * 1000;

// How long the box waits without requests before it saves itself and stops (the IDLE_MINUTES var, default 60).
// The backstop, Cloudflare's inactivity timeout, is shorter, as in its autosave recipe: each alarm renews it, so it
// only stops the container (without a snapshot) when the alarms stop.
function idleMs(env) {
  return Number(env.IDLE_MINUTES ?? 60) * 60 * 1000;
}

function backstopMs(env) {
  return Math.min(10 * 60 * 1000, idleMs(env) / 2);
}
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
const START = ['tini', '--', ...BOX_CLI, 'start'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/__box/boxes' || url.pathname.startsWith('/__box/boxes/'))
      return boxes(request, env, url).catch((error) => new Response(`${error?.stack ?? error}\n`, { status: 500 }));

    return new Response(`${HOST}: reach a box through its own Worker, novu-box-<box>\n`, { status: 404 });
  },
};

// The GitHub token a box's git fetches and CI lookup get: the host's read-only GITHUB_READ_TOKEN when it has one, so
// no caller's push-capable token reaches a box; else the caller's own. A workflow's OIDC token is no GitHub token.
function readToken(request, env) {
  if (env.GITHUB_READ_TOKEN) return env.GITHUB_READ_TOKEN;
  const token = bearer(request);
  if (isOidc(token)) throw new Error('the host has no GITHUB_READ_TOKEN; deploy it with ~/.config/novu-box/github.env');

  return token;
}

export class Box extends DurableObject {
  // The inactivity timeout doesn't survive a restart of this object, and every deploy restarts it: without this, a
  // running box would be stopped without a snapshot before its next alarm. An alarm a restart cut off (a save sets it
  // SAVE_MS ahead) is brought within a minute, since the timeout is shorter.
  constructor(ctx, env) {
    super(ctx, env);
    this.slack = new BoxSlack(this);
    if (ctx.container?.running)
      ctx.blockConcurrencyWhile(async () => {
        await ctx.container.setInactivityTimeout(backstopMs(env));
        const alarm = await ctx.storage.getAlarm();
        if (!alarm || alarm > Date.now() + ALARM_MS) await ctx.storage.setAlarm(Date.now() + ALARM_MS);
      });
  }

  async fetch(request) {
    const url = new URL(request.url);
    // Asking for the state isn't using the box; a poller would otherwise keep it awake forever.
    if (!(request.method === 'GET' && url.pathname === '/__box/state')) this.touch();
    try {
      return url.pathname.startsWith('/__box/') ? await this.control(request, url) : await this.serve(request, url);
    } catch (error) {
      return new Response(`${error?.stack ?? error}\n`, { status: 500 });
    }
  }

  async serve(request, url) {
    const container = this.ctx.container;
    if (!container.running) {
      const lost = await this.ctx.storage.get('lostSnapshot');
      if (lost && !(await this.ctx.storage.get('snapshot')))
        return new Response(
          `This box's snapshot ${lost.id} couldn't be restored (snapshots expire 30 days after they were made or last restored). Bake it again: run \`node docker/box/cli.mjs up --cloud\`.\n`,
          { status: 503 }
        );
      if (!(await this.ctx.storage.get('snapshot')))
        return new Response('This box is not set up yet: run `node docker/box/cli.mjs up --cloud`.\n', { status: 503 });
      await this.wake(url.origin);

      return waking(request);
    }
    // The port speaks plain HTTP. The host stays the public one, which S3 signatures and Clerk check.
    const inside = new URL(request.url);
    inside.protocol = 'http:';
    try {
      return await this.port().fetch(new Request(inside, request));
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
    if (route === 'POST /__box/down') return json(await this.sleepSoon());
    if (route === 'POST /__box/destroy') return json(await this.destroy());
    if (!this.ctx.container.running)
      return new Response('the box is not running: `cli.mjs up --cloud`\n', { status: 409 });
    if (route === 'POST /__box/exec') {
      const { cmd, cwd, github } = await request.json();

      return streamed(await this.run(cmd, { cwd, github: github ? readToken(request, this.env) : undefined }));
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
    const gigabytes = snapshot?.size ? +(snapshot.size / 1e9).toFixed(2) : null;

    return {
      running: this.ctx.container.running,
      snapshot: snapshot ? { id: snapshot.id, name: snapshot.name, gigabytes } : null,
      lastActivity: new Date(this.lastActivity ?? (await this.ctx.storage.get('lastActivity')) ?? 0).toISOString(),
      // A `down` that hasn't saved yet (it waits for a bake or apply, or tries again), and why the last save failed.
      saving: Boolean(await this.ctx.storage.get('sleepNow')),
      saveError: (await this.ctx.storage.get('saveError')) ?? null,
      // A snapshot that couldn't be restored (expired, or invalid); `up` bakes again.
      lostSnapshot: (await this.ctx.storage.get('lostSnapshot')) ?? null,
      origin: await this.ctx.storage.get('origin'),
      // Slack: the events the router handed to the box.
      ...(await this.slack.state()),
    };
  }

  // Wakes the box from its snapshot. The first time, it starts from another box's snapshot (`from`, its id) or
  // bakes `ref`. The GitHub token (readToken) is in the bake's environment only; `box start` runs without it.
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
    await this.ctx.storage.delete('lostSnapshot');
    await this.start({ image: this.ctx.container.images.box, entrypoint: ['tini', '--', 'sleep', 'infinity'] });
    const bake = detached([...BOX_CLI, 'bake', ref, '--start'], '/data/logs/up.log');
    await (await this.run(bake, { github: readToken(request, this.env) })).exitCode;

    return { state: 'baking', ref };
  }

  async wake(origin) {
    if (this.ctx.container.running) return;
    const snapshot = await this.ctx.storage.get('snapshot');
    await this.start({ containerSnapshot: snapshot, entrypoint: START }, origin);
    this.watchRestore(snapshot);
  }

  // Snapshots expire 30 days after they were made or last restored, and nothing extends them. A restore that fails
  // stops the container before the box ever answers, without an exit code; then the snapshot is forgotten (kept as
  // `lostSnapshot`) so `up` bakes again instead of retrying a dead id forever. Once the box has answered (`run`), its
  // snapshot was restored, and a later stop says nothing about it.
  watchRestore(snapshot) {
    this.restoring = snapshot.id;
    this.ctx.container.monitor().catch(async (error) => {
      if (this.restoring !== snapshot.id || !(error instanceof Error) || typeof error.exitCode === 'number') return;
      if ((await this.ctx.storage.get('snapshot'))?.id !== snapshot.id) return;
      console.log(`restoring snapshot ${snapshot.id} failed, so it is forgotten: ${error.message}`);
      await this.ctx.storage.delete('snapshot');
      await this.ctx.storage.put('lostSnapshot', {
        id: snapshot.id,
        at: new Date().toISOString(),
        message: error.message,
      });
    });
  }

  async start(options, origin) {
    // Slack: what the box's agents had in the last container.
    await this.slack.reset();
    // Before the start: a first restore can outlast the caller (4 to 6 minutes), and the alarm is what puts the box
    // to sleep.
    await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
    this.ctx.container.start({
      instance: INSTANCE,
      enableInternet: true,
      env: await this.boxEnv(origin),
      ...options,
    });
    await this.ctx.container.setInactivityTimeout(backstopMs(this.env));
    this.touch();
  }

  // Every 60 s while the box runs: after an hour without requests, and with no bake or apply running, it sleeps; after
  // a `down`, it sleeps once no bake or apply runs. The alarm and the inactivity timeout are renewed first, so nothing
  // below can leave the box to the timeout, which stops it without a snapshot.
  async alarm() {
    if (!this.ctx.container.running) {
      await this.ctx.storage.delete('sleepNow');

      return;
    }
    await this.ctx.container.setInactivityTimeout(backstopMs(this.env));
    await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
    const tries = await this.ctx.storage.get('sleepNow');
    if (tries) {
      if (await this.busy()) {
        console.log('down waits for the bake or apply that is running');

        return;
      }
      try {
        await this.sleep('down');
        await this.ctx.storage.delete('sleepNow');
      } catch (error) {
        console.log(`saving failed (try ${tries}): ${error.message}`);
        if (tries < 5) {
          await this.ctx.storage.put('sleepNow', tries + 1);
          await this.ctx.storage.setAlarm(Date.now() + 10_000);
        } else await this.ctx.storage.delete('sleepNow');
      }

      return;
    }
    // Slack: connect the agents the bridge serves now.
    await within(4 * CALL_MS, this.slack.connect(), 'connecting Slack').catch((error) =>
      console.log(`slack not connected yet: ${error.message}`)
    );
    const last = Math.max(this.lastActivity ?? 0, (await this.ctx.storage.get('lastActivity')) ?? 0);
    if (Date.now() - last < idleMs(this.env) || (await this.busy())) return;
    await this.sleep('idle').catch((error) => console.log(`saving failed: ${error.message}`));
  }

  // Saving can outlast the request that asked for it (a big disk takes over 5 minutes), and a cancelled request
  // would stop the box without its snapshot; an alarm runs for up to 15 minutes on its own.
  async sleepSoon() {
    if (!this.ctx.container.running) return { state: 'stopped' };
    await this.ctx.storage.delete('saveError');
    await this.ctx.storage.put('sleepNow', 1);
    await this.ctx.storage.setAlarm(Date.now() + 1000);

    return { state: 'saving' };
  }

  // Stops every process, the data stores last, so their files are whole, saves the disk to a snapshot, then stops the
  // container. A box whose first bake never finished has nothing worth saving. Anything that goes wrong starts the
  // stopped processes again and keeps the box running (with its alarm, to try again): stopping without a snapshot
  // loses everything since the last one.
  async sleep(reason) {
    const container = this.ctx.container;
    if (!container.running) return { state: 'stopped' };
    const started = Date.now();
    const step = (what) => console.log(`sleep(${reason}) ${what} at ${Math.round((Date.now() - started) / 1000)}s`);
    // Kept set, not deleted: deleting the alarm inside alarm() can cancel its retry.
    await this.ctx.storage.setAlarm(Date.now() + SAVE_MS);
    await container.setInactivityTimeout(SAVE_MS);
    let quiesced = false;
    try {
      // `test -f` exits 1 when the file is missing; any other result says nothing about the bake.
      const bakedCheck = await (await this.run(['test', '-f', '/data/.baked.json'])).exitCode;
      step(`baked check exited ${bakedCheck}`);
      if (bakedCheck !== 0 && bakedCheck !== 1) throw new Error(`the baked check exited ${bakedCheck}`);
      if (bakedCheck === 1) {
        await container.destroy(reason);
        step('stopped');

        return { state: 'stopped without a snapshot (never baked)' };
      }
      quiesced = true;
      const quiesce = await (await this.run([...BOX_CLI, 'quiesce'])).exitCode;
      step(`quiesce exited ${quiesce}`);
      if (quiesce !== 0) throw new Error(`quiesce exited ${quiesce}`);
      const snapshot = await container.snapshotContainer({ name: 'box' });
      if (!snapshot?.id) throw new Error('the snapshot came back without an id');
      step(`snapshot ${snapshot.id} (${snapshot.size ?? '?'} bytes)`);
      await this.ctx.storage.put('snapshot', snapshot);
      await container.destroy(reason);
      step('stopped');

      return { state: 'asleep', snapshot: snapshot.id };
    } catch (error) {
      step(`failed, the box keeps running: ${error.message}`);
      await this.ctx.storage.put('saveError', { at: new Date().toISOString(), message: error.message });
      if (container.running) {
        if (quiesced) {
          const resumed = await within(
            10 * 60 * 1000,
            this.run([...BOX_CLI, 'resume']).then((p) => p.exitCode),
            'resume'
          ).catch((resumeError) => resumeError.message);
          step(`resume exited ${resumed}`);
        }
        await container.setInactivityTimeout(backstopMs(this.env));
        await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
      }
      throw error;
    }
  }

  // For a deleted box: the Durable Object's storage goes too, so the name starts from nothing if it's used again.
  async destroy() {
    // Slack: the router forgets the box and its agents.
    await this.slack.unregister();
    if (this.ctx.container.running) await this.ctx.container.destroy('deleted');
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();

    return { state: 'deleted' };
  }

  // Whether a bake or apply holds the box's lock; when the box doesn't say in time, it counts as busy, so nothing
  // quiesces under one.
  async busy() {
    return within(CALL_MS, this.boxState(), 'the busy check').then(
      ({ lock }) => Boolean(lock),
      (error) => {
        console.log(`${error.message}; counted as busy`);

        return true;
      }
    );
  }

  // Slack: the router's RPC for an event to one of the box's agents.
  slackEvent(event) {
    return this.slack.event(event);
  }

  // The box's one address (Caddy), from inside the Worker.
  port() {
    return this.ctx.container.getTcpPort(PUBLIC_PORT);
  }

  // What `box state` says: the baked and applied commits, and the bake or apply holding the lock.
  async boxState() {
    return JSON.parse(await this.output([...BOX_CLI, 'state']));
  }

  async output(cmd) {
    const process = await this.run(cmd);

    return new TextDecoder().decode((await process.output()).stdout).trim();
  }

  async run(cmd, { cwd, github, stdin } = {}) {
    const process = await this.ctx.container.exec(cmd, {
      env: { ...IMAGE_ENV, ...(await this.boxEnv()), ...(github && { GITHUB_TOKEN: github }) },
      cwd,
      stderr: 'combined',
      ...(stdin && { stdin }),
    });
    this.restoring = null;

    return process;
  }

  // The secrets and the box's public URLs, for the box and for every command run in it (an apply that rebuilds the
  // dashboard writes these URLs into it).
  async boxEnv(origin) {
    const base = origin ?? (await this.ctx.storage.get('origin'));
    const secrets = {
      ...Object.fromEntries(SECRETS.filter((name) => this.env[name]).map((name) => [name, this.env[name]])),
      // Slack: the box's Slack API, the router.
      ...this.slack.env(),
    };
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

function json(body, status = 200) {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
