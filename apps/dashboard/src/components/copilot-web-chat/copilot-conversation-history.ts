import type { WebChatConversation } from '@novu/react';
import { type CopilotPageEnum, parseCopilotPages } from '@novu/shared';
import { readStoredCopilotTitle } from './copilot-popover-title';
import type { CopilotPageContext } from './copilot-web-chat-utils';

/** Where a chat was started. Kept in this browser: the conversation list does not say which page a chat belongs to. */
export type CopilotConversationOrigin = {
  workflowId?: string;
  /** The workflow's identifier, shown on the chat's row. */
  workflowLabel?: string;
  page?: CopilotPageEnum;
};

export type CopilotHistoryItem = {
  identifier: string;
  title: string;
  lastActivityAt: string;
  origin?: CopilotConversationOrigin;
};

export type CopilotHistoryScope = 'all' | 'this-page';

export type CopilotHistoryGroup = { key: string; label: string; items: CopilotHistoryItem[] };

type OriginStorage = Pick<Storage, 'getItem' | 'setItem'>;

const ORIGIN_STORAGE_PREFIX = 'novu-copilot-origin:';
const UNTITLED_CHAT = 'Untitled chat';

const getLocalStorage = (): OriginStorage => window.localStorage;

/** The page or workflow a chat started on now would belong to; none while nothing is registered. */
export function getConversationOrigin(context: CopilotPageContext | undefined): CopilotConversationOrigin | undefined {
  if (context?.page) return { page: context.page };
  if (context?.workflowId) return { workflowId: context.workflowId, workflowLabel: context.workflowLabel };

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseOrigin(raw: string): CopilotConversationOrigin | undefined {
  const value = JSON.parse(raw);
  if (!isRecord(value)) return undefined;

  const { workflowId, workflowLabel, page } = value;
  const [knownPage] = parseCopilotPages([page]);
  const origin: CopilotConversationOrigin = {};
  if (typeof workflowId === 'string' && workflowId) origin.workflowId = workflowId;
  if (typeof workflowLabel === 'string' && workflowLabel) origin.workflowLabel = workflowLabel;
  if (knownPage) origin.page = knownPage;

  return origin.workflowId || origin.page ? origin : undefined;
}

export function readStoredConversationOrigin(
  conversationId: string,
  getStorage = getLocalStorage
): CopilotConversationOrigin | undefined {
  try {
    const raw = getStorage().getItem(`${ORIGIN_STORAGE_PREFIX}${conversationId}`);

    return raw ? parseOrigin(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredConversationOrigin(
  conversationId: string,
  origin: CopilotConversationOrigin,
  getStorage = getLocalStorage
): void {
  try {
    getStorage().setItem(`${ORIGIN_STORAGE_PREFIX}${conversationId}`, JSON.stringify(origin));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the chat's row then names no page.
  }
}

/** The agent's chats from the listed pages, once each: a chat that moves up between two page loads is listed twice. */
export function toHistoryItems(
  conversations: readonly WebChatConversation[],
  agentId: string,
  {
    readOrigin = readStoredConversationOrigin,
    readTitle = readStoredCopilotTitle,
  }: {
    readOrigin?: (conversationId: string) => CopilotConversationOrigin | undefined;
    readTitle?: (conversationId: string) => string | undefined;
  } = {}
): CopilotHistoryItem[] {
  const seen = new Set<string>();
  const items: CopilotHistoryItem[] = [];

  for (const conversation of conversations) {
    if (conversation.agentIdentifier !== agentId || seen.has(conversation.identifier)) continue;

    seen.add(conversation.identifier);
    items.push({
      identifier: conversation.identifier,
      title: conversation.title.trim() || readTitle(conversation.identifier) || UNTITLED_CHAT,
      lastActivityAt: conversation.lastActivityAt,
      origin: readOrigin(conversation.identifier),
    });
  }

  return items;
}

/** A Copilot page matches its own chats; the workflow editor matches the chats about the open workflow. */
export function isOnCurrentPage(
  origin: CopilotConversationOrigin | undefined,
  context: CopilotPageContext | undefined
): boolean {
  if (!origin || !context) return false;
  if (context.page) return origin.page === context.page;

  return !!context.workflowId && origin.workflowId === context.workflowId;
}

export function filterConversations(
  items: readonly CopilotHistoryItem[],
  { query, scope, context }: { query: string; scope: CopilotHistoryScope; context: CopilotPageContext | undefined }
): CopilotHistoryItem[] {
  const needle = query.trim().toLowerCase();

  return items.filter(
    (item) =>
      (scope === 'all' || isOnCurrentPage(item.origin, context)) &&
      (!needle || item.title.toLowerCase().includes(needle))
  );
}

type DateGroupKey = 'today' | 'yesterday' | 'last-7-days' | 'older';

const DATE_GROUPS: ReadonlyArray<{ key: DateGroupKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last-7-days', label: 'Last 7 days' },
  { key: 'older', label: 'Older' },
];

/** Local midnight `daysAgo` calendar days before `now`, so a DST change does not shift the day boundary. */
function startOfDay(now: Date, daysAgo: number): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).getTime();
}

function getDateGroup(iso: string, now: Date): DateGroupKey {
  const time = new Date(iso).getTime();

  if (Number.isNaN(time)) return 'older';
  if (time >= startOfDay(now, 0)) return 'today';
  if (time >= startOfDay(now, 1)) return 'yesterday';
  if (time >= startOfDay(now, 7)) return 'last-7-days';

  return 'older';
}

/**
 * Chats by the day of their last activity, keeping the list's order within each day. With a `context`, the chats that
 * belong to the open page or workflow come first, in their own group.
 */
export function groupConversations(
  items: readonly CopilotHistoryItem[],
  { context, now }: { context?: CopilotPageContext; now: Date }
): CopilotHistoryGroup[] {
  const onPage: CopilotHistoryItem[] = [];
  const byDate = new Map<DateGroupKey, CopilotHistoryItem[]>();

  for (const item of items) {
    if (isOnCurrentPage(item.origin, context)) {
      onPage.push(item);
      continue;
    }

    const key = getDateGroup(item.lastActivityAt, now);
    const dateItems = byDate.get(key);
    if (dateItems) dateItems.push(item);
    else byDate.set(key, [item]);
  }

  const groups: CopilotHistoryGroup[] =
    onPage.length > 0 ? [{ key: 'this-page', label: 'On this page', items: onPage }] : [];

  for (const { key, label } of DATE_GROUPS) {
    const dateItems = byDate.get(key);
    if (dateItems?.length) groups.push({ key, label, items: dateItems });
  }

  return groups;
}

/**
 * What the history lists: while searching, the matching chats in one "N results" section; otherwise the chats by day,
 * with "On this page" first unless the list already shows only this page's chats. Empty when nothing matches.
 */
export function getHistorySections(
  items: readonly CopilotHistoryItem[],
  {
    query,
    scope,
    context,
    now,
  }: { query: string; scope: CopilotHistoryScope; context: CopilotPageContext | undefined; now: Date }
): CopilotHistoryGroup[] {
  const visibleItems = filterConversations(items, { query, scope, context });

  if (visibleItems.length === 0) return [];

  if (query.trim()) {
    const label = `${visibleItems.length} ${visibleItems.length === 1 ? 'result' : 'results'}`;

    return [{ key: 'results', label, items: visibleItems }];
  }

  return groupConversations(visibleItems, { context: scope === 'all' ? context : undefined, now });
}

export type TitleSegment = { text: string; isMatch: boolean };

/** The title cut around each case-insensitive occurrence of `query`, so the matches can be highlighted. */
export function splitTitleMatches(title: string, query: string): TitleSegment[] {
  const needle = query.trim().toLowerCase();
  const haystack = title.toLowerCase();

  // Lower-casing a few characters changes the string's length, which would cut the title in the wrong places.
  if (!needle || haystack.length !== title.length) return [{ text: title, isMatch: false }];

  const segments: TitleSegment[] = [];
  let index = 0;

  while (index < title.length) {
    const found = haystack.indexOf(needle, index);

    if (found === -1) {
      segments.push({ text: title.slice(index), isMatch: false });
      break;
    }

    if (found > index) segments.push({ text: title.slice(index, found), isMatch: false });
    segments.push({ text: title.slice(found, found + needle.length), isMatch: true });
    index = found + needle.length;
  }

  return segments;
}

/** "just now", "5m ago", "3h ago", then the date: "Oct 15", with the year when it is not this year's. */
export function formatConversationTime(iso: string, now: Date): string {
  const time = new Date(iso);
  const deltaMs = now.getTime() - time.getTime();

  if (Number.isNaN(deltaMs)) return '';

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return time.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(time.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}
