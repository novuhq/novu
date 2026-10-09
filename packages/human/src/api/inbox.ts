import { type HumanApiClient, unwrap } from './client';
import type { CreateInteractionCard, Interaction, InteractionKind } from './human';

/** The server holds a `?wait=` long-poll at most this long; the CLI re-issues it until its own deadline. */
export const INBOX_MAX_SERVER_WAIT_SECONDS = 25;

export type InboxSender = 'human' | 'agent' | 'system';

export interface InboxThread {
  id: string;
  channel: string;
  from: { subscriberId: string; name?: string } | null;
  status: 'active' | 'resolved';
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  isDirectMessage: boolean;
  lastActivityAt: string;
}

export interface InboxMessage {
  id: string;
  from: InboxSender;
  senderName?: string;
  text: string;
  attachments?: Array<{ type?: string; name?: string; mimeType?: string }>;
  interaction?: { id: string; kind: string; status?: string };
  at: string;
}

export interface InboxPage {
  data: InboxThread[];
  next: string | null;
}

export interface InboxThreadView {
  thread: InboxThread;
  messages: InboxMessage[];
  hasMore: boolean;
}

export interface ListInboxQuery {
  unread?: boolean;
  all?: boolean;
  limit?: number;
  after?: string;
  wait?: number;
  agentIdentifier?: string;
}

export interface CreateInboxInteractionInput {
  kind: InteractionKind;
  card: CreateInteractionCard;
  from?: string;
  ttlSeconds?: number;
}

function threadPath(id: string, suffix = ''): string {
  return `/v1/human/inbox/${encodeURIComponent(id)}${suffix}`;
}

export async function listInbox(client: HumanApiClient, query: ListInboxQuery): Promise<InboxPage> {
  const res = await client.axios.get<InboxPage>('/v1/human/inbox', {
    params: query,
    // A held long-poll must outlive the default request timeout.
    ...(query.wait ? { timeout: (query.wait + 30) * 1000 } : {}),
  });

  return { data: res.data.data ?? [], next: res.data.next ?? null };
}

export async function getInboxThread(
  client: HumanApiClient,
  id: string,
  query: { limit?: number; before?: string; agentIdentifier?: string }
): Promise<InboxThreadView> {
  const res = await client.axios.get<{ data?: InboxThreadView } | InboxThreadView>(threadPath(id), { params: query });

  return unwrap(res.data);
}

export async function markInboxRead(
  client: HumanApiClient,
  id: string,
  agentIdentifier?: string
): Promise<InboxThread> {
  const res = await client.axios.post<{ data?: InboxThread } | InboxThread>(
    threadPath(id, '/read'),
    {},
    { params: { agentIdentifier } }
  );

  return unwrap(res.data);
}

export async function resolveInboxThread(
  client: HumanApiClient,
  id: string,
  agentIdentifier?: string
): Promise<InboxThread> {
  const res = await client.axios.post<{ data?: InboxThread } | InboxThread>(
    threadPath(id, '/resolve'),
    {},
    { params: { agentIdentifier } }
  );

  return unwrap(res.data);
}

export async function replyInboxThread(
  client: HumanApiClient,
  id: string,
  text: string,
  agentIdentifier?: string
): Promise<{ thread: InboxThread; messageId: string }> {
  const res = await client.axios.post<
    { data?: { thread: InboxThread; messageId: string } } | { thread: InboxThread; messageId: string }
  >(threadPath(id, '/reply'), { text }, { params: { agentIdentifier } });

  return unwrap(res.data);
}

export async function createInboxInteraction(
  client: HumanApiClient,
  id: string,
  input: CreateInboxInteractionInput,
  agentIdentifier?: string
): Promise<Interaction> {
  const res = await client.axios.post<{ data?: Interaction } | Interaction>(threadPath(id, '/interactions'), input, {
    params: { agentIdentifier },
  });

  return unwrap(res.data);
}
