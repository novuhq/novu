
import { fromJson } from '../../shared/contracts.ts';
import type { HostEnv } from '../env.ts';
import {
  type Envelope,
  type Identity,
  type Item,
  type Owner,
  type Params,
  type RegisteredBox,
  SlackResult,
} from './model.ts';
import type { SlackAnswer } from './types.ts';

export const SLACK_API = 'https://slack.com/api/';
export const SLACK_FILES = 'https://files.slack.com/';
export const ROUTER_NAME = 'Novu Box';
export const NO_BOX = 'No Novu Box is running: start one with `box up --cloud`.';
export const NOT_SLACK = 'not what Slack sends';

export interface RouterCore {
  readonly storage: DurableObjectStorage;
  readonly env: HostEnv;
  readonly forward: (owner: Owner, envelope: Envelope) => Promise<void>;
  readonly deliver: (item: Item, timeoutMs?: number) => Promise<SlackAnswer | null>;
  // Work that outlives the request (Slack wants its ack within 3 s); the Durable Object keeps running it.
  readonly later: (what: string, work: Promise<unknown>) => void;
}

export async function slack(core: RouterCore, method: string, params: Params): Promise<SlackResult> {
  const response = await fetch(`${SLACK_API}${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${core.env.SLACK_BOT_TOKEN ?? ''}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(params),
  });
  const body = await slackAnswer(response, method);
  if (!body.ok) console.log(`router ${method}: ${body.error} ${JSON.stringify(body.response_metadata ?? {})}`);

  return body;
}

export async function slackAnswer(response: Response, method: string): Promise<SlackResult> {
  const answer = fromJson(SlackResult).safeParse(await response.text());
  if (!answer.success) throw new Error(`${method} -> ${response.status}: not a Slack answer`);

  return answer.data;
}

export function ephemeral(core: RouterCore, channel: string, user: string, message: Params): Promise<SlackResult> {
  return slack(core, 'chat.postEphemeral', { channel, user, username: ROUTER_NAME, ...message });
}

export async function identity(core: RouterCore): Promise<Identity> {
  const known = await core.storage.get<Identity>('identity');
  if (known) return known;
  const auth = await slack(core, 'auth.test', {});
  if (!auth.ok) throw new Error(`auth.test: ${auth.error}`);
  const me: Identity = {
    team: { id: auth.team_id ?? '', name: auth.team ?? '' },
    botUserId: auth.user_id ?? '',
    ...(auth.bot_id && { botId: auth.bot_id }),
    ...(auth.url && { url: auth.url }),
  };
  await core.storage.put('identity', me);

  return me;
}

export async function registered(core: RouterCore): Promise<Array<RegisteredBox>> {
  return [...(await core.storage.list<RegisteredBox>({ prefix: 'box:' })).values()].filter((box) => box.agents.length);
}

export function talkBlocks(box: RegisteredBox, pending?: string): Array<object> {
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

export function isDm(channel: string | undefined): boolean {
  return Boolean(channel?.startsWith('D'));
}

export function replyTo(channel: string, ts: string | undefined, thread: string | undefined): string | undefined {
  return thread ?? (isDm(channel) ? undefined : ts);
}

export function label({ box, agent }: Owner): string {
  return `${box} · ${short(agent)}`;
}

export function short(identifier: string): string {
  return identifier.replace(/-agent$/, '');
}

export function ack(): Response {
  return new Response(null, { status: 200 });
}

export function random(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hmacHex(secret: string, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);

  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
