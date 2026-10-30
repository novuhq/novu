import { DEFAULT_RELAY_AGENT_IDENTIFIER } from '../config';
import { type ApiClient, ApiError, unwrap } from './client';
import { INBOX_MAX_SERVER_WAIT_SECONDS } from './inbox';

/** Matches the API's `ListenHostId`: the hosts that can be started on a computer. Chat apps and `general` never are. */
export const LISTEN_HOST_IDS = ['claude-code', 'codex', 'opencode', 'cursor', 'hermes', 'openclaw'] as const;

export type ListenHostId = (typeof LISTEN_HOST_IDS)[number];

/** Where an agent is listening: the one computer ready to start a host for it, and since when. */
export interface Listening {
  /** The computer holding the lease (`CliConfig.computerId` there). */
  computerId: string;
  /** As the operator knows it, e.g. "MacBook". */
  computerName: string;
  host: ListenHostId;
  /** The folder the host runs in, as the operator reads it, e.g. "~/projects/app". */
  project?: string;
  since: string;
  renewedAt: string;
  /** The lease lapses then unless it is renewed. */
  expiresAt: string;
}

export interface Lease {
  listening: Listening;
  /** How soon to renew it. */
  renewInSeconds: number;
}

/** Where the agent is listening, and whether its operator paused it. */
export interface LeaseStatus {
  /** `null` when no computer holds a live lease. */
  listening: Listening | null;
  /** Paused on agentinbox.md: no computer takes the lease or starts a host until it is resumed. */
  paused: boolean;
}

/** Another computer holds a live lease. The error carries the holder as `listening`. */
export const LISTENING_ELSEWHERE_CODE = 'listening_elsewhere';

/** This computer doesn't hold a live lease, so it may not wait for messages. Carries the holder, if any. */
export const NOT_LISTENING_CODE = 'not_listening';

/** Matches the API's `AGENT_PAUSED`: the operator paused the agent on agentinbox.md. */
export const AGENT_PAUSED_CODE = 'agent_paused';

/** The API didn't hand out the cursor (another deployment's, say): waiting goes on from now. */
export const INVALID_LISTEN_CURSOR_CODE = 'invalid_listen_cursor';

/** A message that may start a host: written by the operator, or by a contact the agent listens to. */
export interface ListenMessage {
  /** Stable and unique: a message is handled once, however often it comes back. */
  id: string;
  /** The id `show` and `reply` take. */
  conversationId: string;
  /** As the inbox shows it: telegram, slack, email… */
  channel: string;
  from: { id: string; name?: string; isOperator: boolean };
  text: string;
  at: string;
  /** Set when it answers a question the agent sent: that question's id. */
  answersMessageId?: string;
  /**
   * How many times the conversation was resolved before this message, 0 if never. A session belongs to a
   * conversation and a round: a message of a later round starts a fresh session.
   */
  round: number;
  /** A direct chat with one person, not a group or a channel. */
  isDirectMessage: boolean;
  /** With `answersMessageId`: what was picked or written, so it needs no second request. */
  answer?: { status: string; optionId?: string; text?: string };
  /** Files that came with it, as the inbox shows them. */
  attachments?: Array<{ type?: string; name?: string; mimeType?: string; size?: number }>;
}

export interface ListenMessagesPage {
  /** Oldest first. */
  data: ListenMessage[];
  /** Always set: where to go on from next time. */
  next: string;
}

/** The default agent stays out of the request, as the inbox calls leave it out of the address. */
function agentOf(agentIdentifier: string | undefined): { agentIdentifier?: string } {
  return agentIdentifier && agentIdentifier !== DEFAULT_RELAY_AGENT_IDENTIFIER ? { agentIdentifier } : {};
}

/** Takes the lease, renews it, or with `takeOver` takes it from another computer. */
export async function takeLease(
  client: ApiClient,
  input: {
    computerId: string;
    computerName: string;
    host: ListenHostId;
    project?: string;
    takeOver?: boolean;
    agentIdentifier?: string;
  }
): Promise<Lease> {
  const { agentIdentifier, takeOver, ...rest } = input;
  const res = await client.axios.post<{ data?: Lease } | Lease>('/v1/listen/lease', {
    ...rest,
    ...(takeOver ? { takeOver: true } : {}),
    ...agentOf(agentIdentifier),
  });

  return unwrap<Lease>(res.data);
}

/** Where the agent is listening now, and whether it is paused: a paused agent's hosts may ask too. */
export async function getLease(client: ApiClient, agentIdentifier?: string): Promise<LeaseStatus> {
  const res = await client.axios.get<{ data?: Partial<LeaseStatus> }>('/v1/listen/lease', {
    params: agentOf(agentIdentifier),
  });
  const status = unwrap<Partial<LeaseStatus>>(res.data);

  return { listening: status.listening ?? null, paused: status.paused === true };
}

/**
 * Lets go of the lease. `false` when this computer (with this host) didn't hold it: another holder's is never
 * touched.
 */
export async function releaseLease(
  client: ApiClient,
  input: { computerId: string; host: ListenHostId; agentIdentifier?: string }
): Promise<boolean> {
  const res = await client.axios.post<{ data?: { released: boolean } }>('/v1/listen/lease/release', {
    computerId: input.computerId,
    host: input.host,
    ...agentOf(input.agentIdentifier),
  });

  return Boolean(unwrap<{ released: boolean }>(res.data).released);
}

/**
 * Shows in the chat of `conversationId` that a reply is coming, for a few seconds (Telegram's five): the listener asks
 * again while its host works. False where the chat has no typing, as in email. Only the holder of the lease may.
 */
export async function showTyping(
  client: ApiClient,
  input: { computerId: string; host: ListenHostId; conversationId: string; agentIdentifier?: string }
): Promise<boolean> {
  const res = await client.axios.post<{ data?: { typing: boolean } }>('/v1/listen/typing', {
    computerId: input.computerId,
    host: input.host,
    conversationId: input.conversationId,
    ...agentOf(input.agentIdentifier),
  });

  return Boolean(unwrap<{ typing: boolean }>(res.data).typing);
}

/**
 * Waits up to `wait` seconds (the server holds the request, at most `INBOX_MAX_SERVER_WAIT_SECONDS`) for
 * messages that may start a host. Only the holder of the lease, this computer with this host, may wait.
 */
export async function waitForListenMessages(
  client: ApiClient,
  query: {
    computerId: string;
    host: ListenHostId;
    after?: string;
    wait?: number;
    limit?: number;
    agentIdentifier?: string;
  },
  signal?: AbortSignal
): Promise<ListenMessagesPage> {
  const { agentIdentifier, ...rest } = query;
  const wait = Math.min(rest.wait ?? 0, INBOX_MAX_SERVER_WAIT_SECONDS);
  const res = await client.axios.get<{ data?: ListenMessage[]; next?: string }>('/v1/listen/messages', {
    params: { ...rest, wait, ...agentOf(agentIdentifier) },
    // A held long-poll must outlive the default request timeout.
    timeout: (wait + 30) * 1000,
    signal,
  });

  return { data: res.data.data ?? [], next: res.data.next ?? query.after ?? '' };
}

/** The `code` the API put on an error, which is what the listener acts on. */
export function errorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') {
    return undefined;
  }

  const code = (err.body as { code?: unknown }).code;

  return typeof code === 'string' ? code : undefined;
}

/** The holder an `listening_elsewhere` or `not_listening` error names, if it names one. */
export function listeningOf(err: unknown): Listening | null {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') {
    return null;
  }

  const listening = (err.body as { listening?: unknown }).listening;

  return listening && typeof listening === 'object' && 'computerId' in listening ? (listening as Listening) : null;
}

/** Any `401`: the key was regenerated on agentinbox.md, so no retry will work. */
export function isKeyRejected(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

/**
 * Agent Inbox wasn't reached, or was too busy for a moment: the same call may go through a little later. A limit
 * with a code of its own, such as the day's messages, lasts too long to wait for.
 */
export function isOutage(err: unknown): boolean {
  if (!(err instanceof ApiError)) {
    return false;
  }

  if (err.status === 429) {
    return errorCode(err) === undefined;
  }

  return err.status === 0 || err.status === 408 || err.status >= 500;
}
