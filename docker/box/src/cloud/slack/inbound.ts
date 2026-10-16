// Slack -> box: POST /slack, Slack's events, interactivity and the /novu-box command. Each event goes to the box
// that owns its thread or message, or to the sender's selection, or waits while the sender picks a box.

import {
  ack,
  ephemeral,
  forget,
  hmacHex,
  identity,
  isDm,
  label,
  NO_BOX,
  parsed,
  type RouterCore,
  registered,
  replyTo,
  SLACK_FILES,
  short,
  slack,
  store,
  stored,
  talkBlocks,
} from './core.ts';
import {
  type Action,
  type Envelope,
  type Facts,
  Interaction,
  type Owner,
  type Pending,
  type RegisteredBox,
  SlackEventBody,
  type SlackEventPayload,
  TalkValue,
} from './model.ts';

export async function inbound(core: RouterCore, request: Request): Promise<Response> {
  const raw = await request.text();
  if (!(await verified(request.headers, raw, core.env.SLACK_SIGNING_SECRET ?? '')))
    return new Response('bad signature\n', { status: 401 });
  // An event is queued before its ack, so a retry after a slow ack is a duplicate; one after an error isn't.
  if (request.headers.get('x-slack-retry-reason') === 'http_timeout') return ack();
  if (request.headers.get('content-type')?.includes('json')) {
    const body = parsed(SlackEventBody, raw);
    if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
    if (body.type === 'event_callback') await event(core, body);

    return ack();
  }
  const form = new URLSearchParams(raw);
  if (form.get('command')) return Response.json(await command(core, form));
  // Slack's ssl_check for the command URL has neither.
  const payload = form.get('payload');
  if (!payload) return ack();

  return interaction(core, parsed(Interaction, payload), raw);
}

// New things (a mention in the channel, a main-DM message) go to the sender's selection; continued ones (a thread
// reply, a reaction, an edit or delete of a known message) go to the box that owns the thread or message.
async function event(core: RouterCore, body: SlackEventBody): Promise<void> {
  const payload = body.event ?? {};
  if (payload.type === 'app_home_opened') {
    if (payload.tab === 'home' && payload.user) core.later('home', publishHome(core, payload.user));

    return;
  }
  const facts = classify(payload, (await identity(core)).botUserId, core.env.SLACK_CHANNEL);
  if (!facts) return;
  if (facts.dm && facts.kind !== 'reaction') await store(core, `dm:${facts.channel}`, facts.user);
  const envelope: Envelope = {
    id: body.event_id,
    contentType: 'application/json',
    user: facts.user,
    body: JSON.stringify(body).replaceAll(SLACK_FILES, `${core.env.SLACK_ROUTER_URL}/files/`),
    notice: { channel: facts.channel, ts: replyTo(facts.channel, facts.ts, facts.thread) },
  };
  if (facts.kind === 'reaction' || facts.kind === 'edit') return continued(core, facts, envelope);

  return message(core, facts, envelope);
}

// A reaction, edit or delete goes to the box that owns the message or its thread; a reaction on anything else
// (the box's ready message) to the sender's selection.
async function continued(core: RouterCore, { kind, user, channel, ts, thread }: Facts, envelope: Envelope) {
  const owner =
    (await ownerOf(core, channel, ts, thread)) ??
    (kind === 'reaction' ? await stored<Owner>(core, `sel:${user}`) : null);
  if (owner) await core.forward(owner, envelope);
}

async function message(core: RouterCore, facts: Facts, envelope: Envelope): Promise<void> {
  const { kind, user, channel, ts, thread, dm } = facts;
  // A mention comes as both `app_mention` and `message`, in either order: the second one is the same message.
  if (await stored(core, `msg:${channel}:${ts}`)) return;
  const owner = thread && (await stored<Owner>(core, `msg:${channel}:${thread}`));
  // A mention in a thread a box owns also comes as a `message`, which goes to that box.
  if (owner && kind === 'mention') return;
  if (owner) {
    await claim(core, owner, facts);
    if (!dm && thread) await noteOtherSelection(core, owner, user, channel, thread);
    await core.forward(owner, envelope);

    return;
  }
  // In the channel only a mention starts something; a DM needs none.
  if (kind === 'message' && !dm) return;
  const selection = await stored<Owner>(core, `sel:${user}`);
  if (!selection) return pick(core, facts, envelope);
  await claim(core, selection, facts);
  await core.forward(selection, envelope);
}

async function ownerOf(
  core: RouterCore,
  channel: string | undefined,
  ts: string | undefined,
  thread: string | undefined
) {
  return (
    (ts ? await stored<Owner>(core, `msg:${channel}:${ts}`) : undefined) ??
    (thread ? await stored<Owner>(core, `msg:${channel}:${thread}`) : undefined)
  );
}

// The first forwarded message of a thread decides its owner for good. The main DM has none: it follows the
// person's selection, so switching boxes starts a new conversation on the new one.
async function claim(
  core: RouterCore,
  owner: Owner,
  { channel, ts, thread }: Pick<Pending, 'channel' | 'ts' | 'thread'>
) {
  await store(core, `msg:${channel}:${ts}`, owner);
  if (thread && !(await stored(core, `msg:${channel}:${thread}`))) await store(core, `msg:${channel}:${thread}`, owner);
}

async function noteOtherSelection(core: RouterCore, owner: Owner, user: string, channel: string, thread: string) {
  const selection = await stored<Owner>(core, `sel:${user}`);
  if (!selection || (selection.box === owner.box && selection.agent === owner.agent)) return;
  const key = `noted:${channel}:${thread}:${user}`;
  if (await stored(core, key)) return;
  await store(core, key, true);
  const bot = (await identity(core)).botUserId;
  core.later(
    'note',
    ephemeral(core, channel, user, {
      thread_ts: thread,
      text: `This thread talks to *${label(owner)}*. Mention <@${bot}> in a new message to talk to *${label(selection)}*.`,
    })
  );
}

// Nobody picked a box yet: the message waits while the sender picks one.
async function pick(core: RouterCore, { user, channel, ts, thread }: Facts, envelope: Envelope): Promise<void> {
  const key = `pending:${channel}:${ts}`;
  await store(core, key, { channel, ts, thread, envelope } satisfies Pending);
  const boxes = await registered(core);
  const thread_ts = replyTo(channel, ts, thread);
  core.later(
    'pick',
    ephemeral(
      core,
      channel,
      user,
      boxes.length
        ? { thread_ts, text: 'Which box should answer?', blocks: boxes.flatMap((box) => talkBlocks(box, key)) }
        : { thread_ts, text: NO_BOX }
    )
  );
}

async function interaction(core: RouterCore, payload: Interaction, raw: string): Promise<Response> {
  const action = payload.actions?.[0];
  if (payload.type === 'block_actions' && action?.action_id?.startsWith('novubox_'))
    return routerAction(core, payload, action);
  const channel = payload.channel?.id ?? payload.container?.channel_id;
  const ts = payload.container?.message_ts ?? payload.message?.ts;
  const owner = await interactionOwner(core, payload, channel, ts);
  if (!owner) return ack();
  const envelope: Envelope = {
    id: payload.trigger_id ?? action?.action_ts,
    contentType: 'application/x-www-form-urlencoded',
    user: payload.user?.id,
    body: raw,
    notice: channel ? { channel, ts: replyTo(channel, ts, payload.message?.thread_ts) } : undefined,
  };
  // A modal submission and an options request answer with the box's response; there is no time to wake it.
  if (payload.type === 'view_submission' || payload.type === 'block_suggestion') {
    const answer = await core.deliver({ ...envelope, box: owner.box, agent: owner.agent, at: Date.now() }, 2500);

    return answer?.ok && answer.text
      ? new Response(answer.text, { headers: { 'content-type': answer.contentType } })
      : ack();
  }
  await core.forward(owner, envelope);

  return ack();
}

// A modal's box, or the box that owns the message or thread the click was on.
function interactionOwner(core: RouterCore, payload: Interaction, channel: string | undefined, ts: string | undefined) {
  const view = payload.view?.id;
  const inView = view && (payload.type !== 'block_actions' || payload.container?.type === 'view');

  return inView ? stored<Owner>(core, `view:${view}`) : ownerOf(core, channel, ts, payload.message?.thread_ts);
}

// The router's own buttons: Talk to (ready message, App Home, /novu-box) and the picker.
async function routerAction(core: RouterCore, payload: Interaction, action: Action): Promise<Response> {
  if (!action.action_id?.startsWith('novubox_talk') || !payload.user) return ack();
  const user = payload.user.id;
  const { box, agent, pending } = parsed(TalkValue, action.value ?? '');
  const selection = await select(core, user, box, agent);
  const text = selection ? await talkingTo(core, selection) : `${box} isn't running any more.`;
  const responseUrl = payload.response_url;
  if (payload.container?.type === 'view') core.later('home', publishHome(core, user));
  else if (responseUrl)
    core.later(
      'response_url',
      fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_type: 'ephemeral', replace_original: Boolean(pending), text }),
      })
    );
  const waiting = selection && pending ? await stored<Pending>(core, pending) : undefined;
  if (selection && pending && waiting) {
    await forget(core, pending);
    await claim(core, selection, waiting);
    await core.forward(selection, waiting.envelope);
  }

  return ack();
}

async function select(core: RouterCore, user: string, name: string, identifier: string | undefined) {
  const box = await stored<RegisteredBox>(core, `box:${name}`);
  const agent =
    box?.agents.find((item) => item.identifier === identifier || short(item.identifier) === identifier) ??
    (identifier ? undefined : box?.agents[0]);
  if (!agent) return null;
  const selection = { box: name, agent: agent.identifier };
  await store(core, `sel:${user}`, selection);

  return selection;
}

async function talkingTo(core: RouterCore, selection: Owner): Promise<string> {
  const me = await identity(core);

  return `You're talking to *${label(selection)}*. Mention <@${me.botUserId}> in <#${core.env.SLACK_CHANNEL}>, or write to me in a DM.`;
}

// /novu-box [box [agent]]: lists the boxes, or talks to one (its first agent unless named).
async function command(core: RouterCore, form: URLSearchParams): Promise<object> {
  const [name, agent] = (form.get('text') ?? '').trim().split(/\s+/).filter(Boolean);
  const boxes = await registered(core);
  const reply = (text: string, blocks?: ReadonlyArray<object>) => ({
    response_type: 'ephemeral',
    text,
    ...(blocks && { blocks }),
  });
  if (!name)
    return boxes.length
      ? reply(
          'Novu Boxes',
          boxes.flatMap((box) => talkBlocks(box))
        )
      : reply(NO_BOX);
  const selection = await select(core, form.get('user_id') ?? '', name, agent);
  if (!selection) {
    const running = boxes.map((box) => box.name).join(', ') || 'none';

    return reply(`No box ${name}${agent ? ` with agent ${agent}` : ''}. Running: ${running}.`);
  }

  return reply(await talkingTo(core, selection));
}

async function publishHome(core: RouterCore, user: string): Promise<void> {
  const selection = await stored<Owner>(core, `sel:${user}`);
  const boxes = await registered(core);
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: 'Novu Box' } },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: selection ? await talkingTo(core, selection) : 'Pick a box and an agent to talk to.',
        },
      ],
    },
    ...(boxes.length
      ? boxes.flatMap((box) => [{ type: 'divider' }, ...talkBlocks(box)])
      : [{ type: 'section', text: { type: 'mrkdwn', text: NO_BOX } }]),
  ];
  await slack(core, 'views.publish', { user_id: user, view: { type: 'home', blocks } });
}

// What an event is, or null for what the router ignores: the bot's own messages, other channels, and other
// subtypes. `kind`: a reaction, an edit (or delete), a mention (`app_mention`, only in the channel), or a message.
function classify(event: SlackEventPayload, botUserId: string, home: string | undefined): Facts | null {
  const reaction = event.type === 'reaction_added' || event.type === 'reaction_removed';
  const edit = event.subtype === 'message_changed' || event.subtype === 'message_deleted';
  const message = event.subtype === 'message_changed' ? event.message : (event.previous_message ?? event);
  const user = reaction ? event.user : message?.user;
  const channel = reaction ? event.item?.channel : event.channel;
  const dm = isDm(channel);
  if (!user || !channel || user === botUserId || message?.bot_id || (!dm && channel !== home)) return null;
  if (reaction) return event.item?.ts ? { user, channel, dm, kind: 'reaction', ts: event.item.ts } : null;
  const ts = message?.ts ?? event.deleted_ts;
  if (edit) return ts ? { user, channel, dm, kind: 'edit', ts, thread: message?.thread_ts } : null;
  const kind = newKind(event, dm);

  return kind && event.ts ? { user, channel, dm, kind, ts: event.ts, thread: threadOf(event) } : null;
}

function newKind(event: SlackEventPayload, dm: boolean): 'mention' | 'message' | null {
  if (event.type === 'app_mention') return dm ? null : 'mention';
  if (event.type === 'message' && [undefined, 'file_share', 'thread_broadcast'].includes(event.subtype))
    return 'message';

  return null;
}

function threadOf(event: SlackEventPayload): string | undefined {
  return event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : undefined;
}

// Slack's request signature: v0=HMAC-SHA256(signing secret, "v0:<timestamp>:<body>"), within 5 minutes.
async function verified(headers: Headers, raw: string, secret: string): Promise<boolean> {
  const timestamp = headers.get('x-slack-request-timestamp');
  const signature = headers.get('x-slack-signature') ?? '';
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = new TextEncoder().encode(`v0=${await hmacHex(secret, `v0:${timestamp}:${raw}`)}`);
  const given = new TextEncoder().encode(signature);

  return expected.length === given.length && crypto.subtle.timingSafeEqual(expected, given);
}
