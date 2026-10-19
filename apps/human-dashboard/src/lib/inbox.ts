/**
 * The agent's inbox as the dashboard shows it: the shapes `/v1/human/inbox` answers with, and what the
 * page and the thread drawer make of them. Shared by the server and the browser, so it holds no calls.
 */

/** The tabs of the Inbox page, as the API names them. `unread` is the "New" tab. */
export const INBOX_TABS = ['all', 'unread', 'waiting', 'resolved'] as const;

export type InboxTab = (typeof INBOX_TABS)[number];

export const INBOX_TAB_LABELS: Record<InboxTab, string> = {
  all: 'All',
  unread: 'New',
  waiting: 'Waiting',
  resolved: 'Resolved',
};

/** The channels the filter offers, in its order. */
export const INBOX_CHANNELS = ['email', 'telegram', 'slack'] as const;

export type InboxChannel = (typeof INBOX_CHANNELS)[number];

const CHANNEL_NAMES: Record<InboxChannel, string> = { email: 'Email', telegram: 'Telegram', slack: 'Slack' };

/** What the page lists: one tab, optionally narrowed to a channel and a search. */
export type InboxView = {
  tab: InboxTab;
  channel?: string;
  search?: string;
};

export type InboxPersonKind = 'contact' | 'stranger';

export type InboxPerson = {
  /** The contact's id. A stranger has none of their own, so theirs is the channel's id for them. */
  id: string;
  name?: string;
  kind: InboxPersonKind;
};

/**
 * Where a thread stands. One at a time: unread wins over a question that waits, and that over who
 * spoke last.
 * - `unread`: someone wrote and the agent hasn't responded;
 * - `waiting_on_person`: the agent asked something nobody has answered yet;
 * - `waiting_on_you`: a person did the last thing in the thread and the agent sent nothing since;
 * - `open`: none of these;
 * - `resolved`: the host declared it finished.
 */
export type InboxThreadState = 'unread' | 'waiting_on_person' | 'waiting_on_you' | 'open' | 'resolved';

export type InboxThread = {
  /** What `agentinbox inbox show` takes. */
  id: string;
  channel: string;
  kind: InboxPersonKind;
  people: InboxPerson[];
  status: 'open' | 'resolved';
  state: InboxThreadState;
  /** While `state` is `waiting_on_person`: who may answer. Empty when anyone in the thread may. */
  waitingOn?: InboxPerson[];
  /** Who the thread is with: their names, or their ids where a name is unknown. */
  from: string;
  subject: string;
  /** The newest message, shortened. */
  preview: string;
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  /** The address on the other side of an email thread. Missing for chat, and for an email thread with none. */
  fromAddress?: string;
  isDirectMessage: boolean;
  openedAt: string;
  /** Up to which message the agent read the thread; `null` until it did. */
  lastReadAt: string | null;
  lastActivityAt: string;
};

export type InboxThreadsPage = {
  threads: InboxThread[];
  /** Pass it as `after` for the next page; `null` on the last one. */
  next: string | null;
};

export type InboxCounts = {
  /** Per tab, within the chosen channel and search. */
  tabs: Record<InboxTab, number>;
  /** Per channel, within the chosen tab and search. `all` is every channel together. */
  channels: { all: number; [channel: string]: number };
  /** The inbox has more threads than were counted, so the numbers are a lower bound. */
  capped: boolean;
};

/** A count as the page shows it, with a "+" when the API stopped counting, so it reads as "at least". */
export function formatInboxCount(value: number, capped: boolean): string {
  return `${value}${capped && value > 0 ? '+' : ''}`;
}

export type InboxSender = 'human' | 'agent' | 'system';

export type InboxAttachment = {
  type?: string;
  name?: string;
  mimeType?: string;
  /** In bytes. */
  size?: number;
};

/** `card` is a card without controls, such as Slack blocks; `text` went out as a plain message. */
export type InboxCardStyle = 'buttons' | 'reply' | 'card' | 'text';

export type InboxCardState = {
  /** `pending`, `answered`, `approved`, `denied`, `expired`, `canceled` or `delivered`. */
  status: string;
  /** Ready to show, without the time: "waiting for Maya", "Approved by Omer in Slack". */
  label: string;
  waitingOn?: InboxPerson[];
  respondedBy?: { id?: string; name: string };
  respondedAt?: string;
  /** The picked option or the pressed button. */
  optionId?: string;
  optionLabel?: string;
  /** The reply to an `ask`. */
  text?: string;
};

/** A `tell`, `ask`, `approve` or `choose` as it was sent, and what became of it. */
export type InboxCard = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  body?: string;
  icon?: string;
  /** Who the host said it asks for. */
  requestedBy?: string;
  /** `approve`: the buttons, in the order the channel shows them. */
  buttons?: Array<{ id: string; label: string }>;
  /** `choose`: the options. */
  options?: Array<{ id: string; label: string }>;
  /** How the channel shows it: "Telegram buttons", "Slack reply", "Slack blocks". */
  presentation: { channel: string; style: InboxCardStyle; label: string };
  state: InboxCardState;
  expiresAt: string;
};

export type InboxMessage = {
  id: string;
  from: InboxSender;
  /** `in` from a person, `out` from the agent. A system line has none. */
  direction?: 'in' | 'out';
  senderKind?: InboxPersonKind;
  senderName?: string;
  sender?: { id?: string; name?: string; kind: InboxPersonKind | 'agent' };
  channel: string;
  text: string;
  attachments?: InboxAttachment[];
  /** Set on the one row a card has in the thread. */
  card?: InboxCard;
  at: string;
};

export type InboxThreadDetails = {
  threadId: string;
  channel: string;
  /** The first contact in the thread, or its first stranger when it has no contact. */
  contact: (InboxPerson & { verified: boolean }) | null;
  status: InboxThreadState;
  openedAt: string;
  lastReadAt: string | null;
  /** The agent whose inbox this is. */
  agent: { identifier: string; name: string };
  messageCount: number;
};

export type InboxThreadView = {
  thread: InboxThread;
  /** Oldest first. */
  messages: InboxMessage[];
  /** More messages lie past these: older ones, or newer ones for a page read with `after`. */
  hasMore: boolean;
  details: InboxThreadDetails;
};

/**
 * Which messages of a thread to read: the newest by default, the page before `before`, or the messages that
 * came after `after` (never both). `limit` is how many, up to 100.
 */
export type InboxThreadPage = { before?: string; after?: string; limit?: number };

/** The most messages the API reads at once. */
export const INBOX_THREAD_PAGE_MAX = 100;

export function isInboxTab(value: unknown): value is InboxTab {
  return typeof value === 'string' && (INBOX_TABS as readonly string[]).includes(value);
}

export function isInboxChannel(value: unknown): value is InboxChannel {
  return typeof value === 'string' && (INBOX_CHANNELS as readonly string[]).includes(value);
}

/** "Telegram" for `telegram`, and a channel the dashboard doesn't know yet by its own name. */
export function channelName(channel: string): string {
  return isInboxChannel(channel) ? CHANNEL_NAMES[channel] : channel.charAt(0).toUpperCase() + channel.slice(1);
}

/** A thread's subject. A chat thread takes its first message for one; failing both, it says it has none. */
export function threadSubject(thread: Pick<InboxThread, 'subject' | 'preview'>): string {
  return thread.subject.trim() || thread.preview.trim() || 'No subject';
}

/** The colour a state is shown in. */
export type InboxTone = 'accent' | 'warning' | 'open' | 'muted';

/** A thread's status chip: "new", "waiting on Maya", "waiting on you", "open" or "resolved". */
export function describeState(
  state: InboxThreadState,
  waitingOn: InboxPerson[] = []
): {
  label: string;
  tone: InboxTone;
} {
  switch (state) {
    case 'unread':
      return { label: 'new', tone: 'accent' };
    case 'waiting_on_person':
      return { label: `waiting on ${describeWho(waitingOn)}`, tone: 'warning' };
    case 'waiting_on_you':
      return { label: 'waiting on you', tone: 'warning' };
    case 'resolved':
      return { label: 'resolved', tone: 'muted' };
    default:
      return { label: 'open', tone: 'open' };
  }
}

/** "Maya", or "Maya +2" when the question went to more people. "anyone" when anyone in the thread may answer. */
function describeWho(people: InboxPerson[]): string {
  const [first, ...rest] = people;
  if (!first) {
    return 'anyone';
  }

  const name = firstName(first);

  return rest.length > 0 ? `${name} +${rest.length}` : name;
}

/** "Maya" for Maya Levi; someone without a name goes by their id. */
export function firstName(person: Pick<InboxPerson, 'id' | 'name'>): string {
  return person.name?.trim().split(/\s+/)[0] || person.id;
}

/** The letter in a person's round avatar. */
export function initialOf(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

/*
 * The CLI commands the page shows, each the CLI's way of seeing the same thing. The CLI's package on npm
 * is `@agentinbox/cli`; installed, its command is `agentinbox` (see `onboarding.ts`).
 */
const CLI = 'agentinbox';

/** What a host runs to see the threads that wait for it: the inbox at work. */
export const INBOX_UNREAD_COMMAND = `${CLI} inbox list --filter unread`;

/** What a host runs to wait for the first thread: the empty inbox. */
export const INBOX_WATCH_COMMAND = `${CLI} inbox list --wait`;

/** What a host runs to read one thread, as the drawer shows it. */
export function inboxShowCommand(threadId: string): string {
  return `${CLI} inbox show ${threadId}`;
}

export const INBOX_PATH = '/inbox';

/** The page's address for a view, with a thread open in the drawer or not. The defaults stay out of it. */
export function inboxHref(view: InboxView, threadId?: string | null): string {
  const query = new URLSearchParams();

  if (view.tab !== 'all') query.set('tab', view.tab);
  if (view.channel) query.set('channel', view.channel);
  if (view.search?.trim()) query.set('q', view.search.trim());
  if (threadId) query.set('thread', threadId);

  return query.size > 0 ? `${INBOX_PATH}?${query}` : INBOX_PATH;
}

/** The longest search the API takes. */
export const INBOX_SEARCH_MAX_LENGTH = 200;

/** The view and the open thread a page address asks for. Anything unknown falls back to the default. */
export function parseInboxParams(params: Record<string, string | string[] | undefined>): {
  view: InboxView;
  threadId: string | null;
} {
  const one = (name: string) => {
    const value = params[name];

    return typeof value === 'string' ? value : undefined;
  };
  const tab = one('tab');
  const channel = one('channel');
  const search = one('q')?.trim().slice(0, INBOX_SEARCH_MAX_LENGTH);
  const thread = one('thread')?.trim();

  return {
    view: {
      tab: isInboxTab(tab) ? tab : 'all',
      ...(isInboxChannel(channel) ? { channel } : {}),
      ...(search ? { search } : {}),
    },
    threadId: thread || null,
  };
}
