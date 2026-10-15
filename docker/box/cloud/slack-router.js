// Novu Box on Cloudflare, the Slack router `novu-box-slack`: one Slack app (Novu Bot) for every box. It holds the
// real bot token and signing secret; boxes get fake ones, minted here per box and agent, so PR code never sees the
// real ones. One Durable Object, Router("router"), keeps the boxes, each person's selection, and who owns each
// thread and message. Slack's events, interactivity and the /novu-box command all come to POST /slack.
//
//   POST /slack          from Slack: check its signature, ack at once, then forward the event to the box that owns
//                        it, re-signed with that box's fake secret (Box(<box>) in novu-box-host, so a sleeping box
//                        wakes; the Durable Object retries until it answers)
//   POST /api/<method>   from boxes (their SLACK_API_URL): a fake token gets the real one for the allowed methods,
//                        only in #novu-box and in DMs people started; any other token goes to slack.com unchanged
//   GET  /files/<path>   files.slack.com downloads (image and PDF input) with the real token
//   POST /upload?url=    file uploads to the upload_url Slack returned, with the real token
//
// The host Worker registers its boxes through the `Registry` entrypoint (a service binding, so no shared secret):
// `register` mints a box's credentials, `ready` posts its "ready" message, `unregister` deletes both.

import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';

const SLACK_API = 'https://slack.com/api/';
const SLACK_FILES = 'https://files.slack.com/';
const RETRY_MS = 10 * 1000;
// A first restore of a new snapshot takes 4 to 6 minutes; a wake about 40 s.
const GIVE_UP_MS = 8 * 60 * 1000;
const ROUTER_NAME = 'Novu Box';

// The Slack methods the playground agents use through @chat-adapter/slack and Novu's native delivery, with the
// parameter that names the channel (null: none). Everything else is refused.
const METHODS = {
  'chat.postMessage': 'channel',
  'chat.postEphemeral': 'channel',
  'chat.update': 'channel',
  'chat.delete': 'channel',
  'chat.startStream': 'channel',
  'chat.appendStream': 'channel',
  'chat.stopStream': 'channel',
  'reactions.add': 'channel',
  'reactions.remove': 'channel',
  'conversations.history': 'channel',
  'conversations.replies': 'channel',
  'conversations.info': 'channel',
  'assistant.threads.setStatus': 'channel_id',
  'files.completeUploadExternal': 'channel_id',
  'files.getUploadURLExternal': null,
  'conversations.open': null,
  'users.info': null,
  'views.open': null,
  'views.update': null,
  'views.push': null,
};
// Only on the box's own messages, so one box can't change another's.
const OWN_MESSAGE = new Set(['chat.update', 'chat.delete', 'chat.appendStream', 'chat.stopStream']);

export default {
  async fetch(request, env) {
    if (request.method === 'GET' && new URL(request.url).pathname === '/')
      return new Response('novu-box-slack: the Slack router for Novu Boxes\n');

    return router(env).fetch(request);
  },
};

export class Registry extends WorkerEntrypoint {
  register(box, origin, agents) {
    return router(this.env).register(box, origin, agents);
  }

  ready(box, agents) {
    return router(this.env).ready(box, agents);
  }

  unregister(box) {
    return router(this.env).unregister(box);
  }
}

function router(env) {
  return env.ROUTER.get(env.ROUTER.idFromName('router'));
}

export class Router extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/slack') return await this.inbound(request);
      if (url.pathname.startsWith('/api/')) return await this.outbound(request, url.pathname.slice('/api/'.length));
      if (url.pathname.startsWith('/files/')) return await this.download(request, url);
      if (request.method === 'POST' && url.pathname === '/upload') return await this.upload(request, url);
    } catch (error) {
      console.log(`${request.method} ${url.pathname}: ${error?.stack ?? error}`);

      return new Response('router error\n', { status: 500 });
    }

    return new Response('not found\n', { status: 404 });
  }

  // --- registry ---

  // A box's credentials: one signing secret, and a bot token per agent, so the router knows which box and agent
  // every outbound call comes from. A box that registers again (every start) gets the same ones.
  async register(name, origin, identifiers) {
    const box = (await this.get(`box:${name}`)) ?? { name, signingSecret: random(16), agents: [] };
    box.origin = origin;
    for (const gone of box.agents.filter((agent) => !identifiers.includes(agent.identifier)))
      await this.ctx.storage.delete(`token:${gone.token}`);
    box.agents = box.agents.filter((agent) => identifiers.includes(agent.identifier));
    for (const identifier of identifiers) {
      if (box.agents.some((agent) => agent.identifier === identifier)) continue;
      const token = `xoxb-novu-box-${random(18)}`;
      box.agents.push({ identifier, token });
      await this.put(`token:${token}`, { box: name, agent: identifier });
    }
    await this.put(`box:${name}`, box);
    // The box registers on every start, maybe from another snapshot whose database never saw these people.
    await this.ctx.storage.delete([...(await this.ctx.storage.list({ prefix: `linked:${name}:` })).keys()]);
    const me = await this.identity();

    return {
      signingSecret: box.signingSecret,
      tokens: Object.fromEntries(box.agents.map((agent) => [agent.identifier, agent.token])),
      team: me.team,
      botUserId: me.botUserId,
    };
  }

  // The box's agents are seeded: they get their webhook IDs, and #novu-box gets (or keeps) the box's ready message.
  async ready(name, ready) {
    const box = await this.get(`box:${name}`);
    if (!box) throw new Error(`${name} isn't registered`);
    box.agents = box.agents.map((agent) => ({
      ...agent,
      ...ready.find((item) => item.identifier === agent.identifier),
    }));
    const message = {
      channel: this.env.CHANNEL,
      text: `${name} ready`,
      blocks: talkBlocks(box),
      username: ROUTER_NAME,
    };
    const updated = box.message && (await this.slack('chat.update', { ...message, ts: box.message.ts })).ok;
    if (!updated) {
      const posted = await this.slack('chat.postMessage', message);
      if (posted.ok) box.message = { channel: posted.channel, ts: posted.ts };
    }
    await this.put(`box:${name}`, box);
  }

  async unregister(name) {
    const box = await this.get(`box:${name}`);
    if (!box) return;
    if (box.message) await this.slack('chat.delete', box.message);
    await this.ctx.storage.delete(box.agents.map((agent) => `token:${agent.token}`));
    for (const [key, selection] of await this.ctx.storage.list({ prefix: 'sel:' }))
      if (selection.box === name) await this.ctx.storage.delete(key);
    await this.ctx.storage.delete([...(await this.ctx.storage.list({ prefix: `linked:${name}:` })).keys()]);
    await this.ctx.storage.delete(`box:${name}`);
  }

  async boxes() {
    return [...(await this.ctx.storage.list({ prefix: 'box:' })).values()].filter((box) =>
      box.agents.some((a) => a.id)
    );
  }

  // The real bot's workspace and user, which boxes need for mention detection (`<@U…>`).
  async identity() {
    let me = await this.get('identity');
    if (!me) {
      const auth = await this.slack('auth.test', {});
      if (!auth.ok) throw new Error(`auth.test: ${auth.error}`);
      me = { team: { id: auth.team_id, name: auth.team }, botUserId: auth.user_id, botId: auth.bot_id, url: auth.url };
      await this.put('identity', me);
    }

    return me;
  }

  // --- Slack -> box ---

  async inbound(request) {
    const raw = await request.text();
    if (!(await verified(request.headers, raw, this.env.SLACK_SIGNING_SECRET)))
      return new Response('bad signature\n', { status: 401 });
    // Every first delivery is acked at once, so a retry is a duplicate.
    if (request.headers.get('x-slack-retry-num')) return ack();
    if (request.headers.get('content-type')?.includes('json')) {
      const body = JSON.parse(raw);
      if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
      if (body.type === 'event_callback') await this.event(body);

      return ack();
    }
    const form = new URLSearchParams(raw);
    if (form.get('command')) return Response.json(await this.command(form));

    return this.interaction(JSON.parse(form.get('payload')), raw);
  }

  // New things (a top-level mention, a main-DM message) go to the sender's selection; continued ones (a thread
  // reply, a reaction, an edit or delete of a known message) go to the box that owns the thread or message.
  async event(body) {
    const event = body.event;
    const me = await this.identity();
    if (event.type === 'app_home_opened') {
      if (event.tab === 'home') this.later(this.publishHome(event.user));

      return;
    }
    const reaction = event.type === 'reaction_added' || event.type === 'reaction_removed';
    const edit = event.subtype === 'message_changed' || event.subtype === 'message_deleted';
    const message = event.subtype === 'message_changed' ? event.message : (event.previous_message ?? event);
    const user = reaction ? event.user : message?.user;
    if (!user || user === me.botUserId || message?.bot_id) return;
    const channel = reaction ? event.item?.channel : event.channel;
    const dm = channel?.startsWith('D');
    if (!dm && channel !== this.env.CHANNEL) return;
    if (dm && event.type === 'message') await this.put(`dm:${channel}`, user);

    const forward = {
      contentType: 'application/json',
      user,
      body: JSON.stringify(body).replaceAll(SLACK_FILES, `${this.env.ORIGIN}/files/`),
      notice: { channel, ts: message?.thread_ts ?? (dm ? undefined : (message?.ts ?? event.item?.ts)) },
    };
    if (reaction || edit) {
      const ts = reaction ? event.item.ts : (message?.ts ?? event.deleted_ts);
      const owner =
        (await this.get(`msg:${channel}:${ts}`)) ??
        (message?.thread_ts && (await this.threadOwner(channel, message.thread_ts))) ??
        (reaction ? await this.get(`sel:${user}`) : null);
      if (owner) this.later(this.forward(owner, forward));

      return;
    }
    if (
      event.type !== 'app_mention' &&
      !(event.type === 'message' && [undefined, 'file_share', 'thread_broadcast'].includes(event.subtype))
    )
      return;

    const thread = event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : undefined;
    const inbound = { channel, ts: event.ts, thread, dm, forward };
    const owner = thread && (await this.threadOwner(channel, thread));
    if (owner) {
      await this.claim(owner, inbound);
      if (!dm) await this.noteOtherSelection(owner, user, channel, thread);
      this.later(this.forward(owner, forward));

      return;
    }
    const mentioned = event.type === 'app_mention' || event.text?.includes(`<@${me.botUserId}>`);
    if (!dm && !mentioned) return;
    const selection = await this.get(`sel:${user}`);
    if (!selection) return this.pick(user, inbound);
    await this.claim(selection, inbound);
    this.later(this.forward(selection, forward));
  }

  async threadOwner(channel, ts) {
    return (await this.get(`thread:${channel}:${ts}`)) ?? (await this.get(`msg:${channel}:${ts}`));
  }

  // The first forwarded message of a thread decides its owner for good. The main DM has none: it follows the
  // person's selection, so switching boxes starts a new conversation on the new one.
  async claim(owner, { channel, ts, thread, dm }) {
    await this.put(`msg:${channel}:${ts}`, owner);
    const root = thread ?? (dm ? undefined : ts);
    if (root && !(await this.get(`thread:${channel}:${root}`))) await this.put(`thread:${channel}:${root}`, owner);
  }

  async noteOtherSelection(owner, user, channel, thread) {
    const selection = await this.get(`sel:${user}`);
    if (!selection || (selection.box === owner.box && selection.agent === owner.agent)) return;
    const key = `noted:${channel}:${thread}:${user}`;
    if (await this.get(key)) return;
    await this.put(key, true);
    this.later(
      this.ephemeral(channel, user, {
        thread_ts: thread,
        text: `This thread talks to *${label(owner)}*. Mention <@${(await this.identity()).botUserId}> in a new message to talk to *${label(selection)}*.`,
      })
    );
  }

  // Nobody picked a box yet: the message waits while the sender picks one.
  async pick(user, inbound) {
    const key = `pending:${inbound.channel}:${inbound.ts}`;
    const pending = (await this.get(key)) ?? [];
    pending.push(inbound);
    await this.put(key, pending);
    if (pending.length > 1) return;
    const boxes = await this.boxes();
    const thread_ts = inbound.thread ?? (inbound.dm ? undefined : inbound.ts);
    this.later(
      this.ephemeral(
        inbound.channel,
        user,
        boxes.length
          ? { thread_ts, text: 'Which box should answer?', blocks: boxes.flatMap((box) => talkBlocks(box, key)) }
          : { thread_ts, text: 'No Novu Box is running: start one with `node docker/box/cli.mjs up --cloud`.' }
      )
    );
  }

  async interaction(payload, raw) {
    const action = payload.actions?.[0];
    if (payload.type === 'block_actions' && action?.action_id?.startsWith('novubox_'))
      return this.routerAction(payload, action);
    const channel = payload.channel?.id ?? payload.container?.channel_id;
    const ts = payload.container?.message_ts ?? payload.message?.ts;
    const inView = payload.view?.id && (payload.type !== 'block_actions' || payload.container?.type === 'view');
    const owner = inView
      ? await this.get(`view:${payload.view.id}`)
      : ((await this.get(`msg:${channel}:${ts}`)) ??
        (payload.message?.thread_ts && (await this.threadOwner(channel, payload.message.thread_ts))));
    if (!owner) return ack();
    const forward = {
      contentType: 'application/x-www-form-urlencoded',
      user: payload.user?.id,
      body: raw,
      notice: channel && { channel, ts: payload.message?.thread_ts ?? (channel.startsWith('D') ? undefined : ts) },
    };
    // A modal submission and an options request answer with the box's response; there is no time to wake it.
    if (payload.type === 'view_submission' || payload.type === 'block_suggestion') {
      const response = await this.deliver({ ...forward, box: owner.box, agent: owner.agent }, { answer: true });

      return response instanceof Response ? response : ack();
    }
    this.later(this.forward(owner, forward));

    return ack();
  }

  // The router's own buttons: Talk to (ready message, App Home, /novu-box) and the picker.
  async routerAction(payload, action) {
    if (!action.action_id.startsWith('novubox_talk')) return ack();
    const user = payload.user.id;
    const { box, agent, pending } = JSON.parse(action.value);
    const selection = await this.select(user, box, agent);
    const text = selection
      ? `You're talking to *${label(selection)}*. Mention <@${(await this.identity()).botUserId}> in <#${this.env.CHANNEL}>, or write to me here in a DM.`
      : `${box} isn't running any more.`;
    if (payload.container?.type === 'view') this.later(this.publishHome(user));
    else if (payload.response_url)
      this.later(
        fetch(payload.response_url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ response_type: 'ephemeral', replace_original: Boolean(pending), text }),
        })
      );
    if (selection && pending) {
      const waiting = (await this.get(pending)) ?? [];
      await this.ctx.storage.delete(pending);
      for (const inbound of waiting) {
        await this.claim(selection, inbound);
        this.later(this.forward(selection, inbound.forward));
      }
    }

    return ack();
  }

  async select(user, name, identifier) {
    const box = await this.get(`box:${name}`);
    const agent =
      box?.agents.find(
        (item) => item.id && (item.identifier === identifier || short(item.identifier) === identifier)
      ) ?? (!identifier ? box?.agents.find((item) => item.id) : undefined);
    if (!agent) return null;
    const selection = { box: name, agent: agent.identifier };
    await this.put(`sel:${user}`, selection);

    return selection;
  }

  // /novu-box [box [agent]]: lists the boxes, or talks to one (its first agent unless named).
  async command(form) {
    const [name, agent] = (form.get('text') ?? '').trim().split(/\s+/).filter(Boolean);
    const boxes = await this.boxes();
    const running = boxes.map((box) => box.name).join(', ') || 'none';
    if (!name)
      return boxes.length
        ? { response_type: 'ephemeral', text: 'Novu Boxes', blocks: boxes.flatMap((box) => talkBlocks(box)) }
        : {
            response_type: 'ephemeral',
            text: 'No Novu Box is running: start one with `node docker/box/cli.mjs up --cloud`.',
          };
    const selection = await this.select(form.get('user_id'), name, agent);
    if (!selection)
      return {
        response_type: 'ephemeral',
        text: `No box ${name}${agent ? ` with agent ${agent}` : ''}. Running: ${running}.`,
      };

    return {
      response_type: 'ephemeral',
      text: `You're talking to *${label(selection)}*. Mention <@${(await this.identity()).botUserId}> in <#${this.env.CHANNEL}>, or write to me in a DM.`,
    };
  }

  async publishHome(user) {
    const selection = await this.get(`sel:${user}`);
    const boxes = await this.boxes();
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: 'Novu Box' } },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: selection
              ? `You're talking to *${label(selection)}*. Mention me in <#${this.env.CHANNEL}> or write to me in Messages.`
              : 'Pick a box and an agent to talk to.',
          },
        ],
      },
      ...(boxes.length
        ? boxes.flatMap((box) => [{ type: 'divider' }, ...talkBlocks(box)])
        : [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: 'No box is running: `node docker/box/cli.mjs up --cloud`.' },
            },
          ]),
    ];
    await this.slack('views.publish', { user_id: user, view: { type: 'home', blocks } });
  }

  // Forwards now when the box answers; otherwise queues it behind the box's other waiting events and the alarm
  // retries. Only a box that was asleep gets the "Waking" notice: a running box can miss once (its API restarting
  // after an apply, a redeploy) and answers on the next try.
  async forward(owner, forward) {
    const item = { ...forward, box: owner.box, agent: owner.agent, at: Date.now() };
    const { running } = await this.env.BOX.get(this.env.BOX.idFromName(owner.box))
      .state()
      .catch(() => ({ running: true }));
    if (!running) await this.wakingNotice(item);
    const waiting = (await this.ctx.storage.list({ prefix: `q:${owner.box}:`, limit: 1 })).size > 0;
    if (!waiting && (await this.deliver(item))) {
      if (!running) await this.endNotices(owner.box);

      return;
    }
    await this.put(`q:${owner.box}:${String(item.at).padStart(15, '0')}:${random(4)}`, item);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
  }

  // True once the box took the event (or refused it for good); false while it's asleep or starting.
  async deliver(item, { answer = false } = {}) {
    const box = await this.get(`box:${item.box}`);
    const agent = box?.agents.find((candidate) => candidate.identifier === item.agent && candidate.id);
    if (!agent) {
      console.log(`dropped an event for ${item.box} · ${item.agent}: not registered`);

      return true;
    }
    const stub = this.env.BOX.get(this.env.BOX.idFromName(item.box));
    // The agents answer only people linked to a subscriber in the box; the host links one on first contact.
    const linked = `linked:${item.box}:${agent.integrationIdentifier}:${item.user}`;
    if (item.user && !(await this.get(linked))) {
      if (!(await stub.linkSlackUser(item.user, agent.integrationIdentifier).catch(() => false))) return false;
      await this.put(linked, true);
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const started = Date.now();
    try {
      const response = await stub.fetch(`${box.origin}/v1/agents/${agent.id}/webhook/${agent.integrationIdentifier}`, {
        method: 'POST',
        headers: {
          'content-type': item.contentType,
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': `v0=${await hmacHex(box.signingSecret, `v0:${timestamp}:${item.body}`)}`,
        },
        body: item.body,
        ...(answer && { signal: AbortSignal.timeout(2500) }),
      });
      // 502 and 504 come from the box's proxy while the API restarts; 503 is the host's "waking up".
      if ([502, 503, 504].includes(response.status)) return false;
      const text = await response.text();
      console.log(`${item.box} · ${item.agent} took the event in ${Date.now() - started} ms: ${response.status}`);
      if (!response.ok) console.log(`${item.box} answered ${response.status}: ${text.slice(0, 300)}`);
      if (answer && response.ok && text)
        return new Response(text, {
          headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
        });

      return true;
    } catch (error) {
      console.log(`${item.box} didn't answer: ${error}`);

      return false;
    }
  }

  // Retries every waiting event, oldest first per box, until its box answers or GIVE_UP_MS passes.
  async alarm() {
    const byBox = new Map();
    for (const [key, item] of await this.ctx.storage.list({ prefix: 'q:' }))
      byBox.set(item.box, [...(byBox.get(item.box) ?? []), [key, item]]);
    await Promise.all(
      [...byBox].map(async ([box, entries]) => {
        for (const [key, item] of entries) {
          if (Date.now() - item.at > GIVE_UP_MS) {
            await this.ctx.storage.delete(key);
            await this.endNotices(box, `${box} didn't wake within ${GIVE_UP_MS / 60000} minutes; try again later.`);
            continue;
          }
          if (!(await this.deliver(item))) return;
          await this.ctx.storage.delete(key);
        }
        await this.endNotices(box);
      })
    );
    if ((await this.ctx.storage.list({ prefix: 'q:', limit: 1 })).size)
      await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
  }

  async wakingNotice(item) {
    if (!item.notice?.channel) return;
    const key = `notice:${item.box}:${item.notice.channel}:${item.notice.ts ?? ''}`;
    if (await this.get(key)) return;
    await this.put(key, { at: Date.now() });
    const posted = await this.slack('chat.postMessage', {
      channel: item.notice.channel,
      thread_ts: item.notice.ts,
      text: `Waking ${item.box} (about 40 s)…`,
      username: `${item.box} · ${ROUTER_NAME}`,
    });
    if (posted.ok) await this.put(key, { at: Date.now(), channel: posted.channel, ts: posted.ts });
  }

  async endNotices(box, failure) {
    for (const [key, notice] of await this.ctx.storage.list({ prefix: `notice:${box}:` })) {
      await this.ctx.storage.delete(key);
      if (!notice.ts) continue;
      const text = failure ?? `Woke ${box} in ${Math.round((Date.now() - notice.at) / 1000)} s.`;
      await this.slack('chat.update', { channel: notice.channel, ts: notice.ts, text });
    }
  }

  // --- box -> Slack ---

  async outbound(request, method) {
    const raw = await request.text();
    const json = request.headers.get('content-type')?.includes('json');
    const params = json ? (raw ? JSON.parse(raw) : {}) : Object.fromEntries(new URLSearchParams(raw));
    const token = bearer(request) ?? params.token;
    const owner = token && (await this.get(`token:${token}`));
    // Not a token the router minted (a person's own Slack app, connected in the box's dashboard): Slack decides.
    if (!owner) {
      const headers = new Headers({
        'content-type': request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
      });
      if (request.headers.get('authorization')) headers.set('authorization', request.headers.get('authorization'));

      return fetch(`${SLACK_API}${method}${new URL(request.url).search}`, {
        method: request.method,
        headers,
        body: request.method === 'GET' ? undefined : raw,
      });
    }
    delete params.token;
    if (method === 'auth.test') {
      const me = await this.identity();

      return Response.json({
        ok: true,
        url: me.url,
        team: me.team.name,
        team_id: me.team.id,
        user_id: me.botUserId,
        bot_id: me.botId,
      });
    }
    const refuse = (error) => {
      console.log(`refused ${method} from ${label(owner)}: ${error}`);

      return Response.json({ ok: false, error });
    };
    if (!(method in METHODS)) return refuse('method_not_allowed_by_novu_box');
    const channelParam = METHODS[method];
    const channel = channelParam && params[channelParam];
    if (channelParam && !(await this.allowedChannel(channel))) return refuse('channel_not_allowed_by_novu_box');
    if (OWN_MESSAGE.has(method)) {
      const messageOwner = await this.get(`msg:${channel}:${params.ts}`);
      if (messageOwner?.box !== owner.box) return refuse('message_not_owned_by_this_box');
    }
    if (method === 'chat.postMessage' || method === 'chat.postEphemeral') params.username = label(owner);

    const response = await fetch(`${SLACK_API}${method}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.env.SLACK_BOT_TOKEN}`,
        'content-type': json ? 'application/json; charset=utf-8' : 'application/x-www-form-urlencoded',
      },
      body: json ? JSON.stringify(params) : new URLSearchParams(params).toString(),
    });
    const body = await response.json();
    if (body.ok) await this.record(method, params, body, owner);
    else console.log(`${label(owner)} ${method}: ${body.error}`);
    const headers = { 'content-type': 'application/json' };
    if (response.headers.get('retry-after')) headers['retry-after'] = response.headers.get('retry-after');

    return new Response(JSON.stringify(body), { status: response.status, headers });
  }

  async allowedChannel(channel) {
    if (channel === this.env.CHANNEL) return true;

    return Boolean(channel?.startsWith('D') && (await this.get(`dm:${channel}`)));
  }

  // Message and view owners, from what the box posted, so replies, reactions, edits and clicks find the box.
  async record(method, params, body, owner) {
    if (method === 'chat.postMessage' || method === 'chat.startStream') {
      await this.put(`msg:${body.channel}:${body.ts}`, owner);
      if (!params.thread_ts && !body.channel.startsWith('D'))
        await this.put(`thread:${body.channel}:${body.ts}`, owner);
    }
    if (method === 'chat.postEphemeral' && body.message_ts)
      await this.put(`msg:${params.channel}:${body.message_ts}`, owner);
    if (method.startsWith('views.') && body.view?.id) await this.put(`view:${body.view.id}`, owner);
    if (method === 'files.getUploadURLExternal' && body.upload_url)
      body.upload_url = `${this.env.ORIGIN}/upload?url=${encodeURIComponent(body.upload_url)}`;
  }

  async download(request, url) {
    if (!(await this.get(`token:${bearer(request)}`))) return new Response('unknown token\n', { status: 403 });
    const response = await fetch(`${SLACK_FILES}${url.pathname.slice('/files/'.length)}${url.search}`, {
      headers: { authorization: `Bearer ${this.env.SLACK_BOT_TOKEN}` },
    });

    return new Response(response.body, { status: response.status, headers: copyHeaders(response.headers) });
  }

  async upload(request, url) {
    const target = new URL(url.searchParams.get('url') ?? '');
    if (target.origin !== new URL(SLACK_FILES).origin) return new Response('not a Slack upload URL\n', { status: 400 });
    if (!(await this.get(`token:${bearer(request)}`))) return new Response('unknown token\n', { status: 403 });
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.env.SLACK_BOT_TOKEN}`,
        'content-type': request.headers.get('content-type') ?? 'application/octet-stream',
      },
      body: request.body,
    });

    return new Response(response.body, { status: response.status, headers: copyHeaders(response.headers) });
  }

  // --- helpers ---

  async slack(method, params) {
    const response = await fetch(`${SLACK_API}${method}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.env.SLACK_BOT_TOKEN}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(params),
    });
    const body = await response.json();
    if (!body.ok) console.log(`router ${method}: ${body.error} ${JSON.stringify(body.response_metadata ?? {})}`);

    return body;
  }

  ephemeral(channel, user, message) {
    return this.slack('chat.postEphemeral', { channel, user, username: ROUTER_NAME, ...message });
  }

  // Work that outlives the request (Slack wants its ack within 3 s); a Durable Object keeps running it.
  later(promise) {
    promise.catch((error) => console.log(`background: ${error?.stack ?? error}`));
  }

  get(key) {
    return this.ctx.storage.get(key);
  }

  put(key, value) {
    return this.ctx.storage.put(key, value);
  }
}

// "<box> ready · Talk to: custom-code | ai-sdk | langchain", with a link to its dashboard. `pending`: the picker,
// which then forwards the waiting message.
function talkBlocks(box, pending) {
  const agents = box.agents.filter((agent) => agent.id);

  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${box.name}* ready · Talk to:` } },
    {
      type: 'actions',
      elements: [
        ...agents.map((agent, index) => ({
          type: 'button',
          action_id: `novubox_talk_${index}`,
          text: { type: 'plain_text', text: short(agent.identifier) },
          value: JSON.stringify({ box: box.name, agent: agent.identifier, ...(pending && { pending }) }),
        })),
        {
          type: 'button',
          action_id: 'novubox_open',
          text: { type: 'plain_text', text: 'Open dashboard' },
          url: box.origin,
        },
      ],
    },
  ];
}

function label({ box, agent }) {
  return `${box} · ${short(agent)}`;
}

function short(identifier) {
  return identifier.replace(/-agent$/, '');
}

function ack() {
  return new Response(null, { status: 200 });
}

function bearer(request) {
  return request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
}

function copyHeaders(headers) {
  return Object.fromEntries(
    ['content-type', 'content-length', 'content-disposition']
      .filter((name) => headers.get(name))
      .map((name) => [name, headers.get(name)])
  );
}

function random(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret, text) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);

  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Slack's request signature: v0=HMAC-SHA256(signing secret, "v0:<timestamp>:<body>"), within 5 minutes.
async function verified(headers, raw, secret) {
  const timestamp = headers.get('x-slack-request-timestamp');
  const signature = headers.get('x-slack-signature') ?? '';
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = new TextEncoder().encode(`v0=${await hmacHex(secret, `v0:${timestamp}:${raw}`)}`);
  const given = new TextEncoder().encode(signature);

  return expected.length === given.length && crypto.subtle.timingSafeEqual(expected, given);
}
