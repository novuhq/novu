'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
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
import { ThreadDrawer, type ThreadLoad } from './thread-drawer';
import { ThreadList } from './thread-list';

type InboxViewProps = {
  view: InboxViewState;
  /** The first page of threads in the view. */
  page: InboxThreadsPage;
  counts: InboxCounts;
  agent: { handle: string; address: string };
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

    setLoads((previous) => {
      const current = previous[threadId];
      if (result.ok) {
        return { ...previous, [threadId]: { status: 'ready', view: result.view } };
      }

      return current?.status === 'ready'
        ? previous
        : { ...previous, [threadId]: { status: 'error', error: result.error } };
    });
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl leading-7 font-medium tracking-[-0.3px] text-foreground">Inbox</h1>
          <span className="rounded border border-border bg-subtle px-2 py-0.75 font-mono text-xs leading-4 text-default">
            {agent.address}
          </span>
          <span aria-hidden="true" className="flex-1" />
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
