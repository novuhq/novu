import type { AgentInboxApi } from './agent-inbox-api';

/** Longest a `?wait=` long-poll holds the request on the server. */
export const INBOX_MAX_WAIT_SECONDS = 25;

export const INBOX_READ_FILTERS = ['unread', 'read', 'all'] as const;
export type InboxReadFilter = (typeof INBOX_READ_FILTERS)[number];

export const INBOX_STATUS_FILTERS = ['open', 'resolved', 'all'] as const;
export type InboxStatusFilter = (typeof INBOX_STATUS_FILTERS)[number];

export const INBOX_SENDERS_FILTERS = ['contacts', 'all'] as const;
export type InboxSendersFilter = (typeof INBOX_SENDERS_FILTERS)[number];

export type InboxSender = 'human' | 'agent' | 'system';

/** A contact is someone the operator added; a stranger wrote to the agent without being one. */
export type InboxPersonKind = 'contact' | 'stranger';

export type InboxPerson = {
  id: string;
  name?: string;
  kind: InboxPersonKind;
};

export type InboxThread = {
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
};

export type InboxMessage = {
  id: string;
  from: InboxSender;
  /** Set on messages from a human. */
  senderKind?: InboxPersonKind;
  senderName?: string;
  text: string;
  attachments?: Array<{ type?: string; name?: string; mimeType?: string }>;
  interaction?: { id: string; kind: string; status?: string };
  at: string;
};

export type InboxPage = {
  data: InboxThread[];
  next: string | null;
};

export type InboxThreadView = {
  thread: InboxThread;
  messages: InboxMessage[];
  hasMore: boolean;
};

export type ListInboxQuery = {
  filter?: InboxReadFilter;
  status?: InboxStatusFilter;
  senders?: InboxSendersFilter;
  limit?: number;
  after?: string;
  wait?: number;
};

function threadPath(id: string, suffix = ''): string {
  return `/v1/human/inbox/${encodeURIComponent(id)}${suffix}`;
}

/**
 * Lists threads. Uses `getRaw` because the API already returns `{ data, next }`; unwrapping would
 * throw `next` away.
 */
export async function listInbox(api: AgentInboxApi, query: ListInboxQuery = {}): Promise<InboxPage> {
  const wait = query.wait;
  const timeoutMs = wait ? (wait + 10) * 1000 : undefined;
  const body = await api.getRaw<{ data?: InboxThread[]; next?: string | null } | InboxThread[]>(
    '/v1/human/inbox',
    {
      filter: query.filter,
      status: query.status,
      senders: query.senders,
      limit: query.limit,
      after: query.after,
      wait,
    },
    timeoutMs
  );

  if (Array.isArray(body)) {
    return { data: body, next: null };
  }

  return { data: body?.data ?? [], next: body?.next ?? null };
}

export async function getInboxThread(
  api: AgentInboxApi,
  id: string,
  query: { limit?: number; before?: string } = {}
): Promise<InboxThreadView> {
  return api.get<InboxThreadView>(threadPath(id), {
    limit: query.limit,
    before: query.before,
  });
}

export async function markInboxRead(api: AgentInboxApi, id: string): Promise<InboxThread> {
  return api.post<InboxThread>(threadPath(id, '/read'), {});
}

export async function resolveInboxThread(api: AgentInboxApi, id: string): Promise<InboxThread> {
  return api.post<InboxThread>(threadPath(id, '/resolve'), {});
}
