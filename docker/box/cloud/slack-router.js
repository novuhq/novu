// Novu Box on Cloudflare, the Slack router: one Slack app (Novu Bot) for every box. It runs in the host Worker
// (worker.js exports it), as one Durable Object, Router("router"), that keeps the boxes, each person's selection,
// and who owns each thread and message. Its address is the Worker `novu-box-slack` (thin.js, bound to it). It holds
// the real bot token and signing secret; boxes get fake ones, minted here per box and agent, so PR code never sees
// the real ones. Slack's events, interactivity and the /novu-box command all come to POST /slack.
//
//   POST /slack          from Slack: check its signature, queue the event for the box that owns it, ack, then hand
//                        it to Box(<box>), re-signed with that box's fake secret (a sleeping box wakes; the queue
//                        retries until it answers)
//   POST /api/<method>   from boxes (their SLACK_API_URL): a fake token gets the real one for the allowed methods,
//                        only in #novu-box and in DMs people started; any other token goes to slack.com unchanged
//   GET  /files/<path>   files.slack.com downloads (image and PDF input) with the real token
//   POST /upload?url=    file uploads to the upload_url Slack returned, with the real token
//
// Box(<box>) calls `register` for its credentials, `ready` once its agents are set up, and `unregister` when the
// box is deleted.

import { DurableObject } from 'cloudflare:workers';
import { bearer } from './shared.mjs';

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
    const box = (await this.get(`box:${name}`)) ?? { name, signingSecret: random(16), tokens: {}, agents: [] };
    box.origin = origin;
    const tokens = {};
    for (const identifier of identifiers) tokens[identifier] = box.tokens[identifier] ?? `xoxb-novu-box-${random(18)}`;
    for (const [identifier, token] of Object.entries(box.tokens))
      if (!tokens[identifier]) await this.ctx.storage.delete(`token:${token}`);
    for (const [agent, token] of Object.entries(tokens)) await this.put(`token:${token}`, { box: name, agent });
    box.tokens = tokens;
    await this.put(`box:${name}`, box);
    const me = await this.identity();

    return { signingSecret: box.signingSecret, tokens, team: me.team, botUserId: me.botUserId };
  }

  // The agents the box set up, with their webhook IDs, replace its list; #novu-box gets (or keeps) its ready message.
  async ready(name, agents) {
    const box = await this.get(`box:${name}`);
    if (!box) throw new Error(`${name} isn't registered`);
    box.agents = agents;
    const message = {
      channel: this.env.SLACK_CHANNEL,
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
    await this.ctx.storage.delete(Object.values(box.tokens).map((token) => `token:${token}`));
    for (const [key, selection] of await this.ctx.storage.list({ prefix: 'sel:' }))
      if (selection.box === name) await this.ctx.storage.delete(key);
    await this.ctx.storage.delete(`box:${name}`);
  }

  async boxes() {
    return [...(await this.ctx.storage.list({ prefix: 'box:' })).values()].filter((box) => box.agents.length);
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
    // An event is queued before its ack, so a retry after a slow ack is a duplicate; one after an error isn't.
    if (request.headers.get('x-slack-retry-reason') === 'http_timeout') return ack();
    if (request.headers.get('content-type')?.includes('json')) {
      const body = JSON.parse(raw);
      if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
      if (body.type === 'event_callback') await this.event(body);

      return ack();
    }
    const form = new URLSearchParams(raw);
    if (form.get('command')) return Response.json(await this.command(form));
    // Slack's ssl_check for the command URL has neither.
    if (!form.get('payload')) return ack();

    return this.interaction(JSON.parse(form.get('payload')), raw);
  }

  // New things (a mention in the channel, a main-DM message) go to the sender's selection; continued ones (a thread
  // reply, a reaction, an edit or delete of a known message) go to the box that owns the thread or message.
  async event(body) {
    const event = body.event;
    if (event.type === 'app_home_opened') {
      if (event.tab === 'home') this.later(this.publishHome(event.user));

      return;
    }
    const facts = classify(event, (await this.identity()).botUserId, this.env.SLACK_CHANNEL);
    if (!facts) return;
    if (facts.dm && facts.kind !== 'reaction') await this.put(`dm:${facts.channel}`, facts.user);
    const envelope = {
      id: body.event_id,
      contentType: 'application/json',
      user: facts.user,
      body: JSON.stringify(body).replaceAll(SLACK_FILES, `${this.env.SLACK_ROUTER_URL}/files/`),
      notice: { channel: facts.channel, ts: replyTo(facts.channel, facts.ts, facts.thread) },
    };
    if (facts.kind === 'reaction' || facts.kind === 'edit') return this.continued(facts, envelope);

    return this.message(facts, envelope);
  }

  // A reaction, edit or delete goes to the box that owns the message or its thread; a reaction on anything else
  // (the box's ready message) to the sender's selection.
  async continued({ kind, user, channel, ts, thread }, envelope) {
    const owner =
      (await this.ownerOf(channel, ts, thread)) ?? (kind === 'reaction' ? await this.get(`sel:${user}`) : null);
    if (owner) await this.forward(owner, envelope);
  }

  async message(facts, envelope) {
    const { kind, user, channel, ts, thread, dm } = facts;
    // A mention comes as both `app_mention` and `message`, in either order: the second one is the same message.
    if (await this.get(`msg:${channel}:${ts}`)) return;
    const owner = thread && (await this.get(`msg:${channel}:${thread}`));
    // A mention in a thread a box owns also comes as a `message`, which goes to that box.
    if (owner && kind === 'mention') return;
    if (owner) {
      await this.claim(owner, facts);
      if (!dm) await this.noteOtherSelection(owner, user, channel, thread);
      await this.forward(owner, envelope);

      return;
    }
    // In the channel only a mention starts something; a DM needs none.
    if (kind === 'message' && !dm) return;
    const selection = await this.get(`sel:${user}`);
    if (!selection) return this.pick(facts, envelope);
    await this.claim(selection, facts);
    await this.forward(selection, envelope);
  }

  async ownerOf(channel, ts, thread) {
    return (ts && (await this.get(`msg:${channel}:${ts}`))) ?? (thread && (await this.get(`msg:${channel}:${thread}`)));
  }

  // The first forwarded message of a thread decides its owner for good. The main DM has none: it follows the
  // person's selection, so switching boxes starts a new conversation on the new one.
  async claim(owner, { channel, ts, thread }) {
    await this.put(`msg:${channel}:${ts}`, owner);
    if (thread && !(await this.get(`msg:${channel}:${thread}`))) await this.put(`msg:${channel}:${thread}`, owner);
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
  async pick({ user, channel, ts, thread }, envelope) {
    const key = `pending:${channel}:${ts}`;
    await this.put(key, { channel, ts, thread, envelope });
    const boxes = await this.boxes();
    const thread_ts = replyTo(channel, ts, thread);
    this.later(
      this.ephemeral(
        channel,
        user,
        boxes.length
          ? { thread_ts, text: 'Which box should answer?', blocks: boxes.flatMap((box) => talkBlocks(box, key)) }
          : { thread_ts, text: NO_BOX }
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
      : await this.ownerOf(channel, ts, payload.message?.thread_ts);
    if (!owner) return ack();
    const envelope = {
      id: payload.trigger_id ?? action?.action_ts,
      contentType: 'application/x-www-form-urlencoded',
      user: payload.user?.id,
      body: raw,
      notice: channel && { channel, ts: replyTo(channel, ts, payload.message?.thread_ts) },
    };
    // A modal submission and an options request answer with the box's response; there is no time to wake it.
    if (payload.type === 'view_submission' || payload.type === 'block_suggestion') {
      const answer = await this.deliver({ ...envelope, box: owner.box, agent: owner.agent }, 2500);

      return answer?.ok && answer.text
        ? new Response(answer.text, { headers: { 'content-type': answer.contentType } })
        : ack();
    }
    await this.forward(owner, envelope);

    return ack();
  }

  // The router's own buttons: Talk to (ready message, App Home, /novu-box) and the picker.
  async routerAction(payload, action) {
    if (!action.action_id.startsWith('novubox_talk')) return ack();
    const user = payload.user.id;
    const { box, agent, pending } = JSON.parse(action.value);
    const selection = await this.select(user, box, agent);
    const text = selection ? await this.talkingTo(selection) : `${box} isn't running any more.`;
    if (payload.container?.type === 'view') this.later(this.publishHome(user));
    else if (payload.response_url)
      this.later(
        fetch(payload.response_url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ response_type: 'ephemeral', replace_original: Boolean(pending), text }),
        })
      );
    const waiting = selection && pending && (await this.get(pending));
    if (waiting) {
      await this.ctx.storage.delete(pending);
      await this.claim(selection, waiting);
      await this.forward(selection, waiting.envelope);
    }

    return ack();
  }

  async select(user, name, identifier) {
    const box = await this.get(`box:${name}`);
    const agent =
      box?.agents.find((item) => item.identifier === identifier || short(item.identifier) === identifier) ??
      (identifier ? undefined : box?.agents[0]);
    if (!agent) return null;
    const selection = { box: name, agent: agent.identifier };
    await this.put(`sel:${user}`, selection);

    return selection;
  }

  async talkingTo(selection) {
    return `You're talking to *${label(selection)}*. Mention <@${(await this.identity()).botUserId}> in <#${this.env.SLACK_CHANNEL}>, or write to me in a DM.`;
  }

  // /novu-box [box [agent]]: lists the boxes, or talks to one (its first agent unless named).
  async command(form) {
    const [name, agent] = (form.get('text') ?? '').trim().split(/\s+/).filter(Boolean);
    const boxes = await this.boxes();
    const reply = (text, blocks) => ({ response_type: 'ephemeral', text, ...(blocks && { blocks }) });
    if (!name)
      return boxes.length
        ? reply(
            'Novu Boxes',
            boxes.flatMap((box) => talkBlocks(box))
          )
        : reply(NO_BOX);
    const selection = await this.select(form.get('user_id'), name, agent);
    if (!selection) {
      const running = boxes.map((box) => box.name).join(', ') || 'none';

      return reply(`No box ${name}${agent ? ` with agent ${agent}` : ''}. Running: ${running}.`);
    }

    return reply(await this.talkingTo(selection));
  }

  async publishHome(user) {
    const selection = await this.get(`sel:${user}`);
    const boxes = await this.boxes();
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: 'Novu Box' } },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: selection ? await this.talkingTo(selection) : 'Pick a box and an agent to talk to.' },
        ],
      },
      ...(boxes.length
        ? boxes.flatMap((box) => [{ type: 'divider' }, ...talkBlocks(box)])
        : [{ type: 'section', text: { type: 'mrkdwn', text: NO_BOX } }]),
    ];
    await this.slack('views.publish', { user_id: user, view: { type: 'home', blocks } });
  }

  // Every event waits in its box's queue, written before Slack gets its ack, so none is lost and a box gets its
  // events in the order they came.
  async forward(owner, envelope) {
    const item = { ...envelope, box: owner.box, agent: owner.agent, at: Date.now() };
    await this.put(`q:${owner.box}:${String(item.at).padStart(15, '0')}:${random(4)}`, item);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
    this.later(this.handOver(item));
  }

  // Only a box that was asleep gets the "Waking" notice: a running box can miss once (its API restarting after an
  // apply, a redeploy) and answers on the next try.
  async handOver(item) {
    const { running } = await this.env.BOX.get(this.env.BOX.idFromName(item.box))
      .state()
      .catch(() => ({ running: true }));
    if (!running) await this.wakingNotice(item);
    await this.drain(item.box);
  }

  // Hands a box its waiting events, oldest first, until it doesn't answer; the alarm tries again.
  async drain(box) {
    this.draining ??= new Set();
    if (this.draining.has(box)) return;
    this.draining.add(box);
    try {
      for (;;) {
        const [entry] = await this.ctx.storage.list({ prefix: `q:${box}:`, limit: 1 });
        if (!entry) return await this.endNotices(box);
        const [key, item] = entry;
        const late = Date.now() - item.at > GIVE_UP_MS;
        if (late)
          await this.endNotices(box, `${box} didn't wake within ${GIVE_UP_MS / 60000} minutes; try again later.`);
        else if (!(await this.deliver(item))) return;
        await this.ctx.storage.delete(key);
      }
    } finally {
      this.draining.delete(box);
    }
  }

  async alarm() {
    const boxes = new Set([...(await this.ctx.storage.list({ prefix: 'q:' })).values()].map((item) => item.box));
    await Promise.all([...boxes].map((box) => this.drain(box)));
    if ((await this.ctx.storage.list({ prefix: 'q:', limit: 1 })).size)
      await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
  }

  // The box's answer once it took the event (an error answer counts: retrying won't help); null while it's asleep
  // or starting. An event for a box or agent that's gone is dropped, and its sender told.
  async deliver(item, timeoutMs) {
    const box = await this.get(`box:${item.box}`);
    const agent = box?.agents.find((candidate) => candidate.identifier === item.agent);
    if (!agent) {
      await this.gone(item);

      return { ok: false, status: 410 };
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const started = Date.now();
    const answer = await this.env.BOX.get(this.env.BOX.idFromName(item.box))
      .slackEvent({
        id: item.id,
        agent,
        user: item.user,
        headers: {
          'content-type': item.contentType,
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': `v0=${await hmacHex(box.signingSecret, `v0:${timestamp}:${item.body}`)}`,
        },
        body: item.body,
        timeoutMs,
      })
      .catch((error) => console.log(`${item.box} didn't answer: ${error}`));
    if (!answer) return null;
    console.log(`${label(item)} took the event in ${Date.now() - started} ms: ${answer.status}`);
    if (!answer.ok) console.log(`${item.box} answered ${answer.status}: ${answer.text.slice(0, 300)}`);

    return answer;
  }

  async gone(item) {
    console.log(`dropped an event for ${label(item)}: not registered`);
    if (!item.user || !item.notice?.channel) return;
    await this.ephemeral(item.notice.channel, item.user, {
      thread_ts: item.notice.ts,
      text: `*${label(item)}* isn't running any more. Mention <@${(await this.identity()).botUserId}> in a new message to talk to another box.`,
    });
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
    const params = json ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
    const owner = await this.get(`token:${bearer(request) ?? params.token}`);
    // Not a token the router minted (a person's own Slack app, connected in the box's dashboard): Slack decides.
    if (!owner) return passThrough(request, method, raw);
    delete params.token;
    if (method === 'auth.test') return Response.json(authTest(await this.identity()));
    const refused = await this.refusal(method, params, owner);
    if (refused) {
      console.log(`refused ${method} from ${label(owner)}: ${refused}`);

      return Response.json({ ok: false, error: refused });
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

  async refusal(method, params, owner) {
    if (!Object.hasOwn(METHODS, method)) return 'method_not_allowed_by_novu_box';
    const channel = METHODS[method] && params[METHODS[method]];
    if (METHODS[method] && !(await this.allowedChannel(channel))) return 'channel_not_allowed_by_novu_box';
    if (OWN_MESSAGE.has(method) && (await this.get(`msg:${channel}:${params.ts}`))?.box !== owner.box)
      return 'message_not_owned_by_this_box';

    return null;
  }

  async allowedChannel(channel) {
    if (channel === this.env.SLACK_CHANNEL) return true;

    return isDm(channel) && Boolean(await this.get(`dm:${channel}`));
  }

  // Message and view owners, from what the box posted, so replies, reactions, edits and clicks find the box.
  async record(method, params, body, owner) {
    if (method === 'chat.postMessage' || method === 'chat.startStream')
      await this.put(`msg:${body.channel}:${body.ts}`, owner);
    if (method === 'chat.postEphemeral' && body.message_ts)
      await this.put(`msg:${params.channel}:${body.message_ts}`, owner);
    if (method.startsWith('views.') && body.view?.id) await this.put(`view:${body.view.id}`, owner);
    if (method === 'files.getUploadURLExternal' && body.upload_url)
      body.upload_url = `${this.env.SLACK_ROUTER_URL}/upload?url=${encodeURIComponent(body.upload_url)}`;
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

const NO_BOX = 'No Novu Box is running: start one with `node docker/box/cli.mjs up --cloud`.';

// What an event is, or null for what the router ignores: the bot's own messages, other channels, and other
// subtypes. `kind`: a reaction, an edit (or delete), a mention (`app_mention`, only in the channel), or a message.
function classify(event, botUserId, home) {
  const reaction = event.type === 'reaction_added' || event.type === 'reaction_removed';
  const edit = event.subtype === 'message_changed' || event.subtype === 'message_deleted';
  const message = event.subtype === 'message_changed' ? event.message : (event.previous_message ?? event);
  const user = reaction ? event.user : message?.user;
  const channel = reaction ? event.item?.channel : event.channel;
  const dm = isDm(channel);
  if (!user || user === botUserId || message?.bot_id || (!dm && channel !== home)) return null;
  const facts = { user, channel, dm };
  if (reaction) return { ...facts, kind: 'reaction', ts: event.item.ts };
  if (edit) return { ...facts, kind: 'edit', ts: message?.ts ?? event.deleted_ts, thread: message?.thread_ts };
  const thread = event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : undefined;
  if (event.type === 'app_mention') return dm ? null : { ...facts, kind: 'mention', ts: event.ts, thread };
  if (event.type === 'message' && [undefined, 'file_share', 'thread_broadcast'].includes(event.subtype))
    return { ...facts, kind: 'message', ts: event.ts, thread };

  return null;
}

function isDm(channel) {
  return Boolean(channel?.startsWith('D'));
}

// Where the router answers about a message: in its thread, in a new thread on a channel message, or in the DM.
function replyTo(channel, ts, thread) {
  return thread ?? (isDm(channel) ? undefined : ts);
}

// "<box> ready · Talk to: custom-code | ai-sdk | langchain", with a link to its dashboard. `pending`: the picker,
// which then forwards the waiting message. Action IDs are unique per message and view, so they name the box.
function talkBlocks(box, pending) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${box.name}* ready · Talk to:` } },
    {
      type: 'actions',
      elements: [
        ...box.agents.map((agent) => ({
          type: 'button',
          action_id: `novubox_talk:${box.name}:${agent.identifier}`,
          text: { type: 'plain_text', text: short(agent.identifier) },
          value: JSON.stringify({ box: box.name, agent: agent.identifier, ...(pending && { pending }) }),
        })),
        {
          type: 'button',
          action_id: `novubox_open:${box.name}`,
          text: { type: 'plain_text', text: 'Open dashboard' },
          url: box.origin,
        },
      ],
    },
  ];
}

function passThrough(request, method, raw) {
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

function authTest(me) {
  return { ok: true, url: me.url, team: me.team.name, team_id: me.team.id, user_id: me.botUserId, bot_id: me.botId };
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
