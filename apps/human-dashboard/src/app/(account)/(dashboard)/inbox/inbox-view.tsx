'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import type { AgentPause } from '@/lib/agent-settings';
import {
  INBOX_UNREAD_COMMAND,
  INBOX_WATCH_COMMAND,
  type InboxCounts,
  type InboxThread,
  type InboxThreadsPage,
  type InboxView as InboxViewState,
  inboxHref,
} from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { loadMoreThreadsAction, loadThreadAction } from './actions';
import { HeaderCommand } from './command-chip';
import { InboxEmpty } from './inbox-empty';
import { InboxClock } from './inbox-time';
import { InboxToolbar } from './inbox-toolbar';
import { PausedBanner, PausedStatus, usePausedAgent } from './paused-banner';
import { ThreadDrawer, type ThreadLoad } from './thread-drawer';
import { ThreadList } from './thread-list';

type InboxViewProps = {
  view: InboxViewState;
  /** The first page of threads in the view. */
  page: InboxThreadsPage;
  counts: InboxCounts;
  /** `paused` is set while the agent is paused: the banner above the header, and the header's status. */
  agent: { handle: string; address: string; paused?: AgentPause | null };
  /** Set while the agent has no threads at all: how many channels it listens on, when that could be read. */
  empty: { listening: number | null } | null;
  /** The thread the page's address opens, read along with the page. */
  initialThread: { id: string; load: ThreadLoad } | null;
  /** When the server rendered this: "now" until the browser takes over, and new on every render. */
  renderedAt: string;
};

/** Older threads than the server's first page, loaded with "Show more". They belong to one render of the page. */
type MoreThreads = {
  renderedAt: string;
  threads: InboxThread[];
  next: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * The Inbox page: the header, the tabs and filters, the threads, and the drawer of the one that is open.
 * The view lives in the page's address, so the server lists its threads; the drawer only changes the
 * address in place and reads its thread itself.
 */
export function InboxView({ view: serverView, page, counts, agent, empty, initialThread, renderedAt }: InboxViewProps) {
  const router = useRouter();
  const pausedAgent = usePausedAgent(agent.paused ?? null);
  const [view, setOptimisticView] = useOptimistic(serverView);
  const [navigating, startNavigation] = useTransition();
  const [refreshing, startRefresh] = useTransition();

  // Set from the moment the view switches until its list is there: that swap fades the whole list, so its
  // rows don't animate one by one. Every other change of the list does, a refresh above all.
  const [switchingView, setSwitchingView] = useState(false);
  useEffect(() => {
    if (!navigating) {
      setSwitchingView(false);
    }
  }, [navigating]);

  const [more, setMore] = useState<MoreThreads | null>(null);
  const extra = more?.renderedAt === renderedAt ? more : null;
  const shownIds = new Set(page.threads.map((thread) => thread.id));
  const threads = [...page.threads, ...(extra?.threads.filter((thread) => !shownIds.has(thread.id)) ?? [])];
  const next = extra ? extra.next : page.next;

  // The thread in the drawer stays set while the drawer slides out, so it keeps its content.
  const [openId, setOpenId] = useState<string | null>(initialThread?.id ?? null);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialThread));
  const [loads, setLoads] = useState<Record<string, ThreadLoad>>(
    initialThread ? { [initialThread.id]: initialThread.load } : {}
  );
  const openLoad = openId ? loads[openId] : undefined;
  const openSummary =
    threads.find((thread) => thread.id === openId) ?? (openLoad?.status === 'ready' ? openLoad.view.thread : null);

  // The address can change under the drawer: Back and Forward, and a refresh that reads the open thread
  // again. The drawer follows the thread the server rendered for it, and closes when there is none.
  const [syncedThread, setSyncedThread] = useState(initialThread);
  if (initialThread !== syncedThread) {
    setSyncedThread(initialThread);
    if (initialThread) {
      setOpenId(initialThread.id);
      setDrawerOpen(true);
      setLoads((previous) => ({
        ...previous,
        [initialThread.id]: withEarlier(previous[initialThread.id], initialThread.load),
      }));
    } else {
      setDrawerOpen(false);
    }
  }

  function changeView(next: InboxViewState, history: 'push' | 'replace') {
    setSwitchingView(true);
    startNavigation(() => {
      setOptimisticView(next);
      router[history](inboxHref(next), { scroll: false });
    });
  }

  async function fetchThread(threadId: string) {
    // A thread read before shows at once, and is replaced once it's read again.
    setLoads((previous) => ({
      ...previous,
      [threadId]: previous[threadId]?.status === 'ready' ? previous[threadId] : { status: 'loading' },
    }));

    const result = await loadThreadAction(threadId);
    const fresh: ThreadLoad = result.ok
      ? { status: 'ready', view: result.view }
      : { status: 'error', error: result.error };

    setLoads((previous) => ({ ...previous, [threadId]: withEarlier(previous[threadId], fresh) }));
  }

  async function fetchEarlier(threadId: string) {
    const current = loads[threadId];
    const oldest = current?.status === 'ready' ? current.view.messages[0]?.id : undefined;
    if (!oldest || current?.status !== 'ready' || current.earlier === 'loading') {
      return;
    }

    setLoads((previous) => ({ ...previous, [threadId]: { ...current, earlier: 'loading' } }));
    const result = await loadThreadAction(threadId, oldest);

    setLoads((previous) => {
      const latest = previous[threadId];
      if (latest?.status !== 'ready') {
        return previous;
      }

      // The thread was read again meanwhile and starts at another message now: this page no longer joins
      // up with it, so it's dropped, and "Show earlier messages" reads from the new first message.
      if (latest.view.messages[0]?.id !== oldest) {
        return { ...previous, [threadId]: { ...latest, earlier: undefined } };
      }

      if (!result.ok) {
        return { ...previous, [threadId]: { ...latest, earlier: 'error' } };
      }

      const view = {
        ...latest.view,
        messages: [...result.view.messages, ...latest.view.messages],
        hasMore: result.view.hasMore,
      };

      return { ...previous, [threadId]: { status: 'ready', view } };
    });
  }

  function openThread(thread: InboxThread) {
    setOpenId(thread.id);
    setDrawerOpen(true);
    // In place: no new entry in the history, and nothing for the server to render again.
    window.history.replaceState(null, '', inboxHref(view, thread.id));
    void fetchThread(thread.id);
  }

  function changeDrawer(open: boolean) {
    setDrawerOpen(open);
    if (!open) {
      window.history.replaceState(null, '', inboxHref(view));
    }
  }

  async function loadMore() {
    if (!next || extra?.loading) {
      return;
    }

    const base: MoreThreads = extra ?? { renderedAt, threads: [], next, loading: false, error: null };
    setMore({ ...base, loading: true, error: null });

    const result = await loadMoreThreadsAction(serverView, next);

    setMore(
      result.ok
        ? { ...base, threads: [...base.threads, ...result.page.threads], next: result.page.next, loading: false }
        : { ...base, loading: false, error: result.error }
    );
  }

  return (
    <InboxClock renderedAt={renderedAt}>
      <div data-full-width className="flex flex-col gap-4">
        <PausedBanner agent={pausedAgent} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl leading-7 font-medium tracking-[-0.3px] text-foreground">Inbox</h1>
          <span className="rounded border border-border bg-subtle px-2 py-0.75 font-mono text-xs leading-4 text-default">
            {agent.address}
          </span>
          <span aria-hidden="true" className="flex-1" />
          <PausedStatus agent={pausedAgent} renderedAt={renderedAt} />
          <Tooltip label="Refresh">
            <button
              type="button"
              aria-label="Refresh"
              aria-busy={refreshing || undefined}
              onClick={() => startRefresh(() => router.refresh())}
              className={buttonClassName('secondary', 'size-9 px-0')}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('size-4', refreshing && 'animate-spin motion-reduce:animate-none')}
              />
            </button>
          </Tooltip>
          <HeaderCommand command={empty ? INBOX_WATCH_COMMAND : INBOX_UNREAD_COMMAND} />
        </div>
        <InboxToolbar view={view} counts={counts} onChange={changeView} />
        {empty ? (
          <InboxEmpty handle={agent.handle} address={agent.address} listening={empty.listening} />
        ) : (
          <ThreadList
            view={view}
            threads={threads}
            selectedId={drawerOpen ? openId : null}
            onOpen={openThread}
            hasMore={Boolean(next)}
            loadingMore={extra?.loading === true}
            loadMoreError={extra?.error ?? null}
            onLoadMore={loadMore}
            pending={navigating}
            animateChanges={!switchingView}
          />
        )}
      </div>
      <ThreadDrawer
        open={drawerOpen}
        onOpenChange={changeDrawer}
        summary={openSummary}
        load={openLoad}
        agentName={agent.handle}
        onRetry={() => openId && fetchThread(openId)}
        onLoadEarlier={() => openId && fetchEarlier(openId)}
      />
    </InboxClock>
  );
}

/**
 * A thread read again over what the drawer already has. The fresh page wins, and the older messages loaded
 * before it ("Show earlier messages") stay above it where the two meet. A failed read keeps what was there.
 */
function withEarlier(current: ThreadLoad | undefined, fresh: ThreadLoad): ThreadLoad {
  if (current?.status !== 'ready') {
    return fresh;
  }

  if (fresh.status !== 'ready') {
    return current;
  }

  const first = fresh.view.messages[0];
  const meet = first ? current.view.messages.findIndex((message) => message.id === first.id) : -1;
  if (meet <= 0) {
    return fresh;
  }

  // A card's answer changes the card where it is, and the fresh page doesn't reach that far back. Older
  // messages with a card still waiting are dropped, so "Show earlier messages" reads them as they are now.
  const older = current.view.messages.slice(0, meet);
  if (older.some((message) => message.card?.state.status === 'pending')) {
    return fresh;
  }

  const messages = [...older, ...fresh.view.messages];

  // The first message is the same, so a page of older ones on its way still joins up.
  return {
    status: 'ready',
    view: { ...fresh.view, messages, hasMore: current.view.hasMore },
    earlier: current.earlier,
  };
}
