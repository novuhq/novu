import { type ApiClient, unwrap } from './client';

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

export interface Conversation {
  id: string;
  channel: string;
  /** `contact` once at least one contact is in the conversation. */
  kind: InboxPersonKind;
  people: InboxPerson[];
  status: 'open' | 'resolved';
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  isDirectMessage: boolean;
  lastActivityAt: string;
}

/** What became of a sent card, ready to show. */
export interface InboxCardState {
  status: string;
  /** e.g. "waiting for Maya", "Approved by Omer in Slack". */
  label: string;
  /** The picked option or pressed button. */
  optionLabel?: string;
  /** The reply to an `ask`. */
  text?: string;
}

export interface InboxMessage {
  id: string;
  from: InboxSender;
  /** Set on messages from a person. */
  senderKind?: InboxPersonKind;
  senderName?: string;
  text: string;
  attachments?: Array<{ type?: string; name?: string; mimeType?: string }>;
  interaction?: { id: string; kind: string; status?: string };
  /** Set on the row a question or message the agent sent has: what became of it. */
  card?: { kind: string; state?: InboxCardState };
  at: string;
}

export interface InboxPage {
  data: Conversation[];
  next: string | null;
}

export interface ConversationView {
  conversation: Conversation;
  messages: InboxMessage[];
  hasMore: boolean;
  /** The conversation's summary block, printed as is with `--json`. */
  details?: Record<string, unknown>;
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

/** The API still calls a conversation a thread; the CLI never shows that name. */
function conversationPath(id: string, suffix = ''): string {
  return `/v1/human/inbox/${encodeURIComponent(id)}${suffix}`;
}

export async function listInbox(client: ApiClient, query: ListInboxQuery): Promise<InboxPage> {
  const res = await client.axios.get<InboxPage>('/v1/human/inbox', {
    params: query,
    // A held long-poll must outlive the default request timeout.
    ...(query.wait ? { timeout: (query.wait + 30) * 1000 } : {}),
  });

  return { data: res.data.data ?? [], next: res.data.next ?? null };
}

export async function getConversation(
  client: ApiClient,
  id: string,
  query: { limit?: number; before?: string; agentIdentifier?: string }
): Promise<ConversationView> {
  type ApiView = Omit<ConversationView, 'conversation'> & {
    thread: Conversation;
    details?: { threadId?: string } & Record<string, unknown>;
  };
  const res = await client.axios.get<{ data?: ApiView } | ApiView>(conversationPath(id), { params: query });
  const { thread, details, ...view } = unwrap<ApiView>(res.data);

  if (!details) {
    return { conversation: thread, ...view };
  }

  const { threadId, ...rest } = details;

  return { conversation: thread, ...view, details: { conversationId: threadId, ...rest } };
}

export async function markConversationRead(
  client: ApiClient,
  id: string,
  agentIdentifier?: string
): Promise<Conversation> {
  const res = await client.axios.post<{ data?: Conversation } | Conversation>(
    conversationPath(id, '/read'),
    {},
    { params: { agentIdentifier } }
  );

  return unwrap(res.data);
}

export async function resolveConversation(
  client: ApiClient,
  id: string,
  agentIdentifier?: string
): Promise<Conversation> {
  const res = await client.axios.post<{ data?: Conversation } | Conversation>(
    conversationPath(id, '/resolve'),
    {},
    { params: { agentIdentifier } }
  );

  return unwrap(res.data);
}
