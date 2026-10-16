'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import type { AgentPause } from '@/lib/agent-settings';
import type { HostStatus } from '@/lib/host-status';
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
import { HostCheck } from './host-check';
import { InboxEmpty } from './inbox-empty';
import { InboxClock } from './inbox-time';
import { InboxToolbar } from './inbox-toolbar';
import { type PausedAgent, PausedBanner, PausedStatus, usePausedAgent } from './paused-banner';
import { ThreadDrawer, type ThreadLoad } from './thread-drawer';
import { ThreadList } from './thread-list';
import { useThreadLoads } from './use-thread-loads';

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
  /** Whether a host reads the agent's mail, or `null` when that couldn't be read: the header then leaves it out. */
  hostStatus: HostStatus | null;
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

/** Threads as the drawer last read them, by id. They belong to one render of the page, as `MoreThreads` do. */
type ReadThreads = {
  renderedAt: string;
  threads: Record<string, InboxThread>;
};

/**
 * The Inbox page: the header, the tabs and filters, the threads, and the drawer of the one that is open.
 * The view lives in the page's address, so the server lists its threads; the drawer only changes the
 * address in place and reads its thread itself.
 */
export function InboxView({
  view: serverView,
  page,
  counts,
  agent,
  empty,
  initialThread,
  hostStatus,
  renderedAt,
}: InboxViewProps) {
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
  const listed = [...page.threads, ...(extra?.threads.filter((thread) => !shownIds.has(thread.id)) ?? [])];
  const next = extra ? extra.next : page.next;

  const { threads, remember } = useFresherRows(listed, renderedAt);

  // The thread in the drawer stays set while the drawer slides out, so it keeps its content.
  const [openId, setOpenId] = useState<string | null>(initialThread?.id ?? null);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialThread));
  const {
    loads,
    open: readThread,
    loadOlder,
    receive,
  } = useThreadLoads({
    initial: initialThread,
    readPage: loadThreadAction,
    liveId: drawerOpen ? openId : null,
    onThreadRead: remember,
  });
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
      receive(initialThread.id, initialThread.load);
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

  function openThread(thread: InboxThread) {
    setOpenId(thread.id);
    setDrawerOpen(true);
    // In place: no new entry in the history, and nothing for the server to render again.
    window.history.replaceState(null, '', inboxHref(view, thread.id));
    void readThread(thread.id);
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
          <AgentStatus hostStatus={hostStatus} pausedAgent={pausedAgent} renderedAt={renderedAt} />
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
        onRetry={() => openId && readThread(openId)}
        onLoadOlder={() => openId && loadOlder(openId)}
      />
    </InboxClock>
  );
}

/**
 * The list's rows, with the threads the drawer read since the page was rendered: the drawer reads its thread
 * after the page did, and keeps reading it while it is open, so its row shows what the drawer found until the
 * page is rendered again. `remember` takes a thread as a read found it.
 */
function useFresherRows(listed: InboxThread[], renderedAt: string) {
  const [read, setRead] = useState<ReadThreads>({ renderedAt, threads: {} });
  const fresher = read.renderedAt === renderedAt ? read.threads : {};

  function remember(thread: InboxThread) {
    setRead((previous) => {
      const known = previous.renderedAt === renderedAt ? previous.threads : {};
      const same = JSON.stringify(known[thread.id]) === JSON.stringify(thread);

      return same ? previous : { renderedAt, threads: { ...known, [thread.id]: thread } };
    });
  }

  return { threads: listed.map((thread) => fresher[thread.id] ?? thread), remember };
}

/**
 * The header's one spot for the agent's state, left of Refresh: "paused by you 12m ago" while it's paused,
 * otherwise whether a host checks the inbox. The two are stacked in place, so one fades in as the other
 * fades out.
 */
function AgentStatus({
  hostStatus,
  pausedAgent,
  renderedAt,
}: {
  hostStatus: HostStatus | null;
  pausedAgent: PausedAgent;
  renderedAt: string;
}) {
  const paused = Boolean(pausedAgent.paused);

  return (
    <span className="grid shrink-0 items-center justify-items-end *:col-start-1 *:row-start-1">
      {hostStatus && (
        <span
          aria-hidden={paused || undefined}
          className={cn(
            'transition-opacity duration-300 ease-out motion-reduce:transition-none',
            paused && 'opacity-0'
          )}
        >
          <HostCheck lastCheckedAt={hostStatus.lastCheckedAt} renderedAt={renderedAt} />
        </span>
      )}
      <PausedStatus agent={pausedAgent} renderedAt={renderedAt} />
    </span>
  );
}
