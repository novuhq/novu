import { decode } from '../../shared/contracts.ts';
import {
  ack,
  hmacHex,
  identity,
  label,
  NO_BOX,
  NOT_SLACK,
  type RouterCore,
  registered,
  replyTo,
  short,
  talkBlocks,
} from './core.ts';
import { claim, event, ownerOf } from './events.ts';
import {
  type Action,
  type Envelope,
  Interaction,
  type Owner,
  type Pending,
  type RegisteredBox,
  SlackEventBody,
  TalkValue,
} from './model.ts';

export async function inbound(core: RouterCore, request: Request): Promise<Response> {
  const raw = await request.text();
  if (!(await verified(request.headers, raw, core.env.SLACK_SIGNING_SECRET ?? '')))
    return new Response('bad signature\n', { status: 401 });
  // An event is queued before its ack, so a retry after a slow ack is a duplicate; one after an error isn't.
  if (request.headers.get('x-slack-retry-reason') === 'http_timeout') return ack();
  if (request.headers.get('content-type')?.includes('json')) {
    const body = decode(SlackEventBody, raw, NOT_SLACK);
    if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
    if (body.type === 'event_callback') await event(core, body);

    return ack();
  }
  const form = new URLSearchParams(raw);
  if (form.get('command')) return Response.json(await command(core, form));
  // Slack's ssl_check for the command URL has neither.
  const payload = form.get('payload');
  if (!payload) return ack();

  return interaction(core, decode(Interaction, payload, NOT_SLACK), raw);
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

function interactionOwner(core: RouterCore, payload: Interaction, channel: string | undefined, ts: string | undefined) {
  const view = payload.view?.id;
  const inView = view && (payload.type !== 'block_actions' || payload.container?.type === 'view');

  return inView ? core.storage.get<Owner>(`view:${view}`) : ownerOf(core, channel, ts, payload.message?.thread_ts);
}

async function routerAction(core: RouterCore, payload: Interaction, action: Action): Promise<Response> {
  if (!action.action_id?.startsWith('novubox_talk') || !payload.user) return ack();
  const user = payload.user.id;
  const { box, agent, pending } = decode(TalkValue, action.value ?? '', NOT_SLACK);
  const selection = await select(core, user, box, agent);
  const text = selection ? await talkingTo(core, selection) : `${box} isn't running any more.`;
  const responseUrl = payload.response_url;
  if (responseUrl)
    core.later(
      'response_url',
      fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_type: 'ephemeral', replace_original: Boolean(pending), text }),
      })
    );
  const waiting = selection && pending ? await core.storage.get<Pending>(pending) : undefined;
  if (selection && pending && waiting) {
    await core.storage.delete(pending);
    await claim(core, selection, waiting);
    await core.forward(selection, waiting.envelope);
  }

  return ack();
}

async function select(core: RouterCore, user: string, name: string, identifier: string | undefined) {
  const box = await core.storage.get<RegisteredBox>(`box:${name}`);
  const agent =
    box?.agents.find((item) => item.identifier === identifier || short(item.identifier) === identifier) ??
    (identifier ? undefined : box?.agents[0]);
  if (!agent) return null;
  const selection = { box: name, agent: agent.identifier };
  await core.storage.put(`sel:${user}`, selection);

  return selection;
}

async function talkingTo(core: RouterCore, selection: Owner): Promise<string> {
  const me = await identity(core);

  return `You're talking to *${label(selection)}*. Mention <@${me.botUserId}> in <#${core.env.SLACK_CHANNEL}>, or write to me in a DM.`;
}

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

// Slack's request signature: v0=HMAC-SHA256(signing secret, "v0:<timestamp>:<body>"), within 5 minutes.
async function verified(headers: Headers, raw: string, secret: string): Promise<boolean> {
  const timestamp = headers.get('x-slack-request-timestamp');
  const signature = headers.get('x-slack-signature') ?? '';
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = new TextEncoder().encode(`v0=${await hmacHex(secret, `v0:${timestamp}:${raw}`)}`);
  const given = new TextEncoder().encode(signature);

  return expected.length === given.length && crypto.subtle.timingSafeEqual(expected, given);
}
