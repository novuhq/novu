
import {
  ephemeral,
  identity,
  isDm,
  label,
  NO_BOX,
  type RouterCore,
  registered,
  replyTo,
  SLACK_FILES,
  talkBlocks,
} from './core.ts';
import type { Envelope, Facts, Owner, Pending, SlackEventBody, SlackEventPayload } from './model.ts';

export async function event(core: RouterCore, body: SlackEventBody): Promise<void> {
  const facts = classify(body.event ?? {}, (await identity(core)).botUserId, core.env.SLACK_CHANNEL);
  if (!facts) return;
  if (facts.dm && facts.kind !== 'reaction') await core.storage.put(`dm:${facts.channel}`, facts.user);
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

async function continued(core: RouterCore, { kind, user, channel, ts, thread }: Facts, envelope: Envelope) {
  const owner =
    (await ownerOf(core, channel, ts, thread)) ??
    (kind === 'reaction' ? await core.storage.get<Owner>(`sel:${user}`) : null);
  if (owner) await core.forward(owner, envelope);
}

async function message(core: RouterCore, facts: Facts, envelope: Envelope): Promise<void> {
  const { kind, user, channel, ts, thread, dm } = facts;
  // A mention comes as both `app_mention` and `message`, in either order: the second one is the same message.
  if (await core.storage.get(`msg:${channel}:${ts}`)) return;
  const owner = thread && (await core.storage.get<Owner>(`msg:${channel}:${thread}`));
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
  const selection = await core.storage.get<Owner>(`sel:${user}`);
  if (!selection) return pick(core, facts, envelope);
  await claim(core, selection, facts);
  await core.forward(selection, envelope);
}

export async function ownerOf(
  core: RouterCore,
  channel: string | undefined,
  ts: string | undefined,
  thread: string | undefined
) {
  return (
    (ts ? await core.storage.get<Owner>(`msg:${channel}:${ts}`) : undefined) ??
    (thread ? await core.storage.get<Owner>(`msg:${channel}:${thread}`) : undefined)
  );
}

export async function claim(
  core: RouterCore,
  owner: Owner,
  { channel, ts, thread }: Pick<Pending, 'channel' | 'ts' | 'thread'>
) {
  await core.storage.put(`msg:${channel}:${ts}`, owner);
  if (thread && !(await core.storage.get(`msg:${channel}:${thread}`)))
    await core.storage.put(`msg:${channel}:${thread}`, owner);
}

async function noteOtherSelection(core: RouterCore, owner: Owner, user: string, channel: string, thread: string) {
  const selection = await core.storage.get<Owner>(`sel:${user}`);
  if (!selection || (selection.box === owner.box && selection.agent === owner.agent)) return;
  const key = `noted:${channel}:${thread}:${user}`;
  if (await core.storage.get(key)) return;
  await core.storage.put(key, true);
  const bot = (await identity(core)).botUserId;
  core.later(
    'note',
    ephemeral(core, channel, user, {
      thread_ts: thread,
      text: `This thread talks to *${label(owner)}*. Mention <@${bot}> in a new message to talk to *${label(selection)}*.`,
    })
  );
}

async function pick(core: RouterCore, { user, channel, ts, thread }: Facts, envelope: Envelope): Promise<void> {
  const key = `pending:${channel}:${ts}`;
  await core.storage.put(key, { channel, ts, thread, envelope } satisfies Pending);
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
