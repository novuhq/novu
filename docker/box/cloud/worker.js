// Novu Box on Cloudflare, the host Worker `novu-box-host`: the Box class, one Durable Object per box that owns the
// box's container. Every box shares this class, its image and its secrets, so a new box starts from another box's
// snapshot as Cloudflare documents it (within one class). The host's own address only answers 404; each box has a
// thin Worker `novu-box-<box>` on workers.dev (thin.js) that checks /__box/* callers and forwards to Box(<box>).
// `cli.mjs --cloud` deploys and drives them; browsers reach a box through its thin Worker.
//
//   /__box/*   control, for GitHub users with push access to novuhq/novu (checked by thin.js)
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
// The Slack router (slack-router.js) runs here too, as the Router Durable Object. With its secrets and
// SLACK_ROUTER_URL set, each start also connects the box's agents to Slack through it (see `connectSlack`), the
// router hands the box its agents' Slack events (`slackEvent`), and deleting the box disconnects them.

import { DurableObject } from 'cloudflare:workers';

export { Router } from './slack-router.js';

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
// Prints the API key and the agents the bridge app serves now, signed as box.mjs signs discover. An agent the
// bridge no longer serves keeps its bridge URL in the API, so the API's list can't tell.
const DISCOVER = `
const key = require('fs').readFileSync('/data/bridge/secret-key', 'utf8').trim();
const t = Date.now();
const v1 = require('crypto').createHmac('sha256', key).update(t + '.{}').digest('hex');
fetch('http://127.0.0.1:4000/api/novu?action=discover', { headers: { 'novu-signature': 't=' + t + ',v1=' + v1 } })
  .then((response) => response.json())
  .then(({ agents = [] }) => console.log(JSON.stringify({ key, served: agents.map((agent) => agent.agentId) })));
`;
const START = ['tini', '--', ...BOX, 'start'];
// The last line of a streamed command, with its exit code; cloud/target.mjs reads it.
const EXIT_MARK = '__BOX_EXIT__';

export default {
  async fetch() {
    return new Response('novu-box-host: reach a box through its own Worker, novu-box-<box>\n', { status: 404 });
  },
};

export class Box extends DurableObject {
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
    if (route === 'POST /__box/down') return json(await this.sleepSoon());
    if (route === 'POST /__box/destroy') return json(await this.destroy());
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
      // The last Slack events the router handed to the box's agents, newest last.
      slackEvents: (await this.ctx.storage.get('slackEvents')) ?? [],
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
    await this.ctx.storage.delete('slackConnected');
    this.slackLinked = new Set();
    this.apiKey = null;
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

  // Every 60 s while the box runs: after an hour without requests, and with no bake or apply running, it sleeps.
  async alarm() {
    const tries = await this.ctx.storage.get('sleepNow');
    if (tries) {
      try {
        await this.sleep('down');
        await this.ctx.storage.delete('sleepNow');
      } catch (error) {
        console.log(`saving failed (try ${tries}): ${error.message}`);
        if (tries < 5) await this.ctx.storage.put('sleepNow', tries + 1);
        else await this.ctx.storage.delete('sleepNow');
        await this.ctx.storage.setAlarm(Date.now() + 10_000);
      }

      return;
    }
    if (!this.ctx.container.running) return;
    await this.ctx.container.setInactivityTimeout(backstopMs(this.env));
    await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
    await this.connectSlack().catch((error) => console.log(`slack not connected yet: ${error.message}`));
    const last = Math.max(this.lastActivity ?? 0, (await this.ctx.storage.get('lastActivity')) ?? 0);
    if (Date.now() - last < idleMs(this.env) || (await this.busy())) return;
    await this.sleep('idle');
  }

  // Saving can outlast the request that asked for it (a big disk takes over 5 minutes), and a cancelled request
  // would stop the box without its snapshot; an alarm runs for up to 15 minutes on its own.
  async sleepSoon() {
    if (!this.ctx.container.running) return { state: 'stopped' };
    await this.ctx.storage.put('sleepNow', 1);
    await this.ctx.storage.setAlarm(Date.now() + 1000);

    return { state: 'saving' };
  }

  // Stops the apps and databases so their files are whole, saves the disk to a snapshot, then stops the container.
  // A box whose first bake never finished has nothing worth saving. Anything that goes wrong keeps the box running
  // (with its alarm, to try again): stopping without a snapshot loses everything since the last one.
  async sleep(reason) {
    const container = this.ctx.container;
    if (!container.running) return { state: 'stopped' };
    const started = Date.now();
    const step = (what) => console.log(`sleep(${reason}) ${what} at ${Math.round((Date.now() - started) / 1000)}s`);
    await this.ctx.storage.deleteAlarm();
    try {
      // `test -f` exits 1 when the file is missing; any other result says nothing about the bake.
      const bakedCheck = await (await this.run(['test', '-f', '/data/.baked.json'])).exitCode;
      step(`baked check exited ${bakedCheck}`);
      if (bakedCheck !== 0 && bakedCheck !== 1) throw new Error(`the baked check exited ${bakedCheck}`);
      const baked = bakedCheck === 0;
      if (baked) {
        step(`quiesce exited ${await (await this.run([...BOX, 'quiesce'])).exitCode}`);
        const snapshot = await container.snapshotContainer({ name: 'box' });
        step(`snapshot ${snapshot.id} (${snapshot.size ?? '?'} bytes)`);
        await this.ctx.storage.put('snapshot', snapshot);
      }
      await container.destroy(reason);
      step('stopped');

      return { state: baked ? 'asleep' : 'stopped without a snapshot (never baked)' };
    } catch (error) {
      step(`failed, the box keeps running: ${error.message}`);
      if (container.running) await this.ctx.storage.setAlarm(Date.now() + ALARM_MS);
      throw error;
    }
  }

  // For a deleted box: the Durable Object's storage goes too, so the name starts from nothing if it's used again.
  async destroy() {
    const origin = await this.ctx.storage.get('origin');
    if (this.env.SLACK_ROUTER_URL && origin)
      await this.router()
        .unregister(boxName(origin))
        .catch((error) => console.log(`slack: ${error.message}`));
    if (this.ctx.container.running) await this.ctx.container.destroy('deleted');
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();

    return { state: 'deleted' };
  }

  async busy() {
    const process = await this.run(['sh', '-c', 'ps -eo args | grep -c -E "^node /opt/box/box.mjs (bake|apply)"']);
    const { stdout } = await process.output();

    return Number(new TextDecoder().decode(stdout).trim()) > 0;
  }

  // When the box is up, and again when the agents its bridge serves change (an apply): every one of them gets a
  // Slack integration, linked to it, with the signing secret and a bot token the router minted for this box, and a
  // workspace connection for Novu Bot's workspace. Then the router posts (or refreshes) the box's ready message in
  // #novu-box. It goes through the box's API from here, not from box.mjs, because a box keeps the box.mjs of the
  // snapshot it started from. A box started from another box's snapshot has that box's credentials until this
  // replaces them.
  async connectSlack() {
    if (!this.env.SLACK_ROUTER_URL) return;
    const origin = await this.ctx.storage.get('origin');
    const process = await this.run(['sh', '-c', 'test -f /data/.baked.json && node -e "$0"', DISCOVER]);
    const output = new TextDecoder().decode((await process.output()).stdout).trim();
    if (!origin || !output) return;
    const { key, served } = JSON.parse(output);
    this.apiKey = key;
    const api = (path, init) => this.api(origin, path, init);

    const box = boxName(origin);
    // In storage: the Durable Object doesn't stay in memory between alarms.
    if (!served.length || served.sort().join(',') === (await this.ctx.storage.get('slackConnected'))) return;
    // An agent the bridge serves may not be in the API yet (a sync creates it); the next alarm connects it.
    const agents = (await api('/v1/agents?limit=50')).data.filter((agent) => served.includes(agent.identifier));
    const router = this.router();
    const slack = await router.register(
      box,
      origin,
      agents.map((agent) => agent.identifier)
    );
    const integrations = (await api('/v1/integrations')).data;
    const ready = [];
    for (const agent of agents) {
      const identifier = `box-slack-${agent.identifier}`;
      const credentials = { signingSecret: slack.signingSecret };
      const integration = integrations.find((item) => item.identifier === identifier);
      if (integration)
        await api(`/v1/integrations/${integration._id}`, {
          method: 'PUT',
          body: JSON.stringify({ credentials, check: false }),
        });
      else
        await api('/v1/integrations', {
          method: 'POST',
          body: JSON.stringify({
            providerId: 'slack',
            channel: 'chat',
            name: `Slack via the Novu Box router (${agent.identifier})`,
            identifier,
            active: true,
            check: false,
            credentials,
          }),
        });
      await api(`/v1/agents/${agent.identifier}/integrations`, {
        method: 'POST',
        body: JSON.stringify({ integrationIdentifier: identifier }),
      });
      const connection = {
        workspace: { id: slack.team.id, name: slack.team.name, botUserId: slack.botUserId },
        auth: { accessToken: slack.tokens[agent.identifier] },
      };
      const [existing] = (await api(`/v1/channel-connections?integrationIdentifier=${identifier}`)).data;
      if (existing)
        await api(`/v1/channel-connections/${existing.identifier}`, {
          method: 'PATCH',
          body: JSON.stringify(connection),
        });
      else
        await api('/v1/channel-connections', {
          method: 'POST',
          body: JSON.stringify({
            identifier,
            integrationIdentifier: identifier,
            connectionMode: 'shared',
            context: { 'novu-box': 'slack' },
            ...connection,
          }),
        });
      ready.push({ identifier: agent.identifier, id: agent._id, integrationIdentifier: identifier });
    }
    await router.ready(box, ready);
    const connected = ready
      .map((agent) => agent.identifier)
      .sort()
      .join(',');
    await this.ctx.storage.put('slackConnected', connected);
    console.log(`slack: ${box} connected ${connected}`);
  }

  // The Slack router hands the box an event for one of its agents, signed with the box's secret, and gets the
  // agent's answer; null while the box is asleep (this wakes it) or starting, and the router tries again. The
  // bridge agents answer only people linked to a subscriber (subscriberAccess `restricted`), so a person's first
  // event links them to subscriber slack-<user> in the box, as a customer's app does with <ConnectChat>.
  async slackEvent({ id, agent, user, headers, body, timeoutMs }) {
    this.touch();
    const origin = await this.ctx.storage.get('origin');
    if (!this.ctx.container.running) {
      if (await this.ctx.storage.get('snapshot')) await this.wake(origin);

      return null;
    }
    this.slackLinked ??= new Set();
    const integrationIdentifier = agent.integrationIdentifier;
    try {
      if (user && !this.slackLinked.has(`${integrationIdentifier}:${user}`)) {
        await this.api(origin, '/v1/channel-endpoints', {
          method: 'POST',
          body: JSON.stringify({
            identifier: `${integrationIdentifier}-${user}`,
            subscriberId: `slack-${user}`,
            createSubscriberIfMissing: true,
            integrationIdentifier,
            connectionIdentifier: integrationIdentifier,
            type: 'slack_user',
            endpoint: { userId: user },
          }),
        });
        this.slackLinked.add(`${integrationIdentifier}:${user}`);
      }
      const webhook = `${origin.replace(/^https:/, 'http:')}/v1/agents/${agent.id}/webhook/${integrationIdentifier}`;
      const response = await this.ctx.container.getTcpPort(PUBLIC_PORT).fetch(
        new Request(webhook, {
          method: 'POST',
          headers,
          body,
          ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }),
        })
      );
      // From the box's proxy while the API restarts.
      if (response.status === 502 || response.status === 504) return null;
      const answer = {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') ?? 'application/json',
        text: await response.text(),
      };
      const events = (await this.ctx.storage.get('slackEvents')) ?? [];
      events.push({ id, agent: agent.identifier, user, status: answer.status, at: new Date().toISOString() });
      await this.ctx.storage.put('slackEvents', events.slice(-20));

      return answer;
    } catch (error) {
      console.log(`slack: ${agent.identifier} isn't answering yet: ${error.message}`);

      return null;
    }
  }

  router() {
    return this.env.ROUTER.get(this.env.ROUTER.idFromName('router'));
  }

  // The box's own API over its port, with the environment's secret key. 409 counts as done: the thing exists.
  async api(origin, path, init = {}) {
    if (!this.apiKey) {
      const process = await this.run(['cat', '/data/bridge/secret-key']);
      this.apiKey = new TextDecoder().decode((await process.output()).stdout).trim();
    }
    const response = await this.ctx.container.getTcpPort(PUBLIC_PORT).fetch(
      new Request(`${origin.replace(/^https:/, 'http:')}${path}`, {
        ...init,
        headers: { Authorization: `ApiKey ${this.apiKey}`, 'Content-Type': 'application/json' },
      })
    );
    const text = await response.text();
    if (!response.ok && response.status !== 409)
      throw new Error(`${init.method ?? 'GET'} ${path} -> ${response.status}: ${text.slice(0, 200)}`);

    return text ? JSON.parse(text) : null;
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
  // SLACK_API_URL sends the box's Slack calls to the router, which swaps its fake tokens for the real one.
  async boxEnv(origin) {
    const base = origin ?? (await this.ctx.storage.get('origin'));
    const secrets = Object.fromEntries(SECRETS.filter((name) => this.env[name]).map((name) => [name, this.env[name]]));
    if (this.env.SLACK_ROUTER_URL) secrets.SLACK_API_URL = `${this.env.SLACK_ROUTER_URL}/api/`;
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

// https://novu-box-<box>.<workers.dev subdomain> -> <box>
function boxName(origin) {
  return new URL(origin).hostname.split('.')[0].replace(/^novu-box-/, '');
}

function bearer(request) {
  return request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
}

function json(body, status = 200) {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
