import { type HumanApiClient, unwrap } from './client';

/** The server holds a `?wait=` long-poll at most this long; the CLI re-issues it until its own deadline. */
export const INBOX_MAX_SERVER_WAIT_SECONDS = 25;

export const INBOX_READ_FILTERS = ['unread', 'read', 'all'] as const;
export type InboxReadFilter = (typeof INBOX_READ_FILTERS)[number];

export const INBOX_STATUS_FILTERS = ['open', 'resolved', 'all'] as const;
export type InboxStatusFilter = (typeof INBOX_STATUS_FILTERS)[number];

export const INBOX_SENDERS_FILTERS = ['contacts', 'all'] as const;
export type InboxSendersFilter = (typeof INBOX_SENDERS_FILTERS)[number];

export type InboxSender = 'human' | 'agent' | 'system';

/** A contact is someone you added; a stranger wrote to your agent without being one. */
export type InboxPersonKind = 'contact' | 'stranger';

export interface InboxPerson {
  /** A contact's id for `--to`. A stranger has none: theirs is the channel's own id for them. */
  id: string;
  name?: string;
  kind: InboxPersonKind;
}

export interface InboxThread {
  id: string;
  channel: string;
  /** `contact` once at least one contact is in the thread. */
  kind: InboxPersonKind;
  people: InboxPerson[];
  status: 'open' | 'resolved';
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  isDirectMessage: boolean;
  lastActivityAt: string;
}

export interface InboxMessage {
  id: string;
  from: InboxSender;
  /** Set on messages from a human. */
  senderKind?: InboxPersonKind;
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
  filter?: InboxReadFilter;
  status?: InboxStatusFilter;
  senders?: InboxSendersFilter;
  limit?: number;
  after?: string;
  wait?: number;
  agentIdentifier?: string;
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
