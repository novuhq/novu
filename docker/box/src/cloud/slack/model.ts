import * as z from 'zod';
import type { SlackAgent } from './types.ts';

export interface Owner {
  readonly box: string;
  readonly agent: string;
}

export interface RegisteredBox {
  readonly name: string;
  readonly signingSecret: string;
  origin?: string;
  tokens: Record<string, string>;
  agents: ReadonlyArray<SlackAgent>;
  message?: { readonly channel: string; readonly ts: string };
}

export interface Identity {
  readonly team: { readonly id: string; readonly name: string };
  readonly botUserId: string;
  readonly botId?: string;
  readonly url?: string;
}

export interface Notice {
  readonly channel: string;
  readonly ts?: string | undefined;
}

export interface Envelope {
  readonly id?: string | undefined;
  readonly contentType: string;
  readonly user?: string | undefined;
  readonly body: string;
  readonly notice?: Notice | undefined;
}

export type Item = Envelope & Owner & { readonly at: number };

export interface Pending {
  readonly channel: string;
  readonly ts: string;
  readonly thread?: string | undefined;
  readonly envelope: Envelope;
}

export interface PostedNotice {
  readonly at: number;
  readonly channel?: string;
  readonly ts?: string;
}

export interface Facts {
  readonly kind: 'reaction' | 'edit' | 'mention' | 'message';
  readonly user: string;
  readonly channel: string;
  readonly dm: boolean;
  readonly ts: string;
  readonly thread?: string | undefined;
}

export type Params = Record<string, unknown>;

const SlackMessage = z.looseObject({
  user: z.string().optional(),
  ts: z.string().optional(),
  thread_ts: z.string().optional(),
  bot_id: z.string().optional(),
});

export const SlackEventPayload = SlackMessage.extend({
  type: z.string().optional(),
  subtype: z.string().optional(),
  channel: z.string().optional(),
  deleted_ts: z.string().optional(),
  item: z.looseObject({ channel: z.string().optional(), ts: z.string().optional() }).optional(),
  message: SlackMessage.optional(),
  previous_message: SlackMessage.optional(),
});
export type SlackEventPayload = z.infer<typeof SlackEventPayload>;

export const SlackEventBody = z.looseObject({
  type: z.string().optional(),
  challenge: z.string().optional(),
  event_id: z.string().optional(),
  event: SlackEventPayload.optional(),
});
export type SlackEventBody = z.infer<typeof SlackEventBody>;

const Action = z.looseObject({
  action_id: z.string().optional(),
  action_ts: z.string().optional(),
  value: z.string().optional(),
});
export type Action = z.infer<typeof Action>;

export const Interaction = z.looseObject({
  type: z.string().optional(),
  trigger_id: z.string().optional(),
  response_url: z.string().optional(),
  user: z.looseObject({ id: z.string() }).optional(),
  channel: z.looseObject({ id: z.string().optional() }).optional(),
  container: z
    .looseObject({ channel_id: z.string().optional(), message_ts: z.string().optional(), type: z.string().optional() })
    .optional(),
  message: z.looseObject({ ts: z.string().optional(), thread_ts: z.string().optional() }).optional(),
  view: z.looseObject({ id: z.string().optional() }).optional(),
  actions: z.array(Action).optional(),
});
export type Interaction = z.infer<typeof Interaction>;

export const TalkValue = z.object({ box: z.string(), agent: z.string(), pending: z.string().optional() });

export const SlackResult = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  channel: z.string().optional(),
  ts: z.string().optional(),
  message_ts: z.string().optional(),
  upload_url: z.string().optional(),
  view: z.looseObject({ id: z.string().optional() }).optional(),
  response_metadata: z.unknown().optional(),
  team_id: z.string().optional(),
  team: z.string().optional(),
  user_id: z.string().optional(),
  bot_id: z.string().optional(),
  url: z.string().optional(),
});
export type SlackResult = z.infer<typeof SlackResult>;

export const BoxParams = z.record(z.string(), z.unknown());
