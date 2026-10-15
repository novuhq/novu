'use client';

import { ViewTransition } from 'react';

import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { channelName, type InboxThread, type InboxView, threadSubject } from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { ChannelLogo } from './channel-logo';
import { InboxTime } from './inbox-time';
import { StatusPill } from './status-pill';

type ThreadListProps = {
  view: InboxView;
  threads: InboxThread[];
  /** The thread open in the drawer: its row stays marked under it. */
  selectedId: string | null;
  onOpen: (thread: InboxThread) => void;
  /** Older threads exist. */
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
  /** A new view is on its way: the list fades until it is there. */
  pending: boolean;
  /**
   * Rows animate when the list changes in a transition: a new thread rises in, one that left fades out and
   * the others slide into place. Off while the view switches, where the fade above covers the swap.
   */
  animateChanges: boolean;
};

/** How a row comes, goes and moves (see `.inbox-row` in `globals.css`), or nothing at all. */
const ROW_TRANSITION = { enter: 'inbox-row-enter', exit: 'inbox-row-exit', update: 'inbox-row', default: 'none' };
const NO_ROW_TRANSITION = { default: 'none' };

/** The threads of the view, newest activity first. A row opens its thread in the drawer. */
export function ThreadList({
  view,
  threads,
  selectedId,
  onOpen,
  hasMore,
  loadingMore,
  loadMoreError,
  onLoadMore,
  pending,
  animateChanges,
}: ThreadListProps) {
  const rowTransition = animateChanges ? ROW_TRANSITION : NO_ROW_TRANSITION;

  return (
    <div
      role="tabpanel"
      aria-busy={pending || undefined}
      className={cn(
        'overflow-hidden rounded-lg border border-border transition-opacity duration-200 motion-reduce:transition-none',
        pending && 'opacity-60'
      )}
    >
      {threads.length === 0 ? (
        <p className="px-4 py-4.5 text-center text-[13px] leading-4.5 text-secondary">{describeNoThreads(view)}</p>
      ) : (
        <ul aria-label="Threads">
          {threads.map((thread) => (
            <ViewTransition key={thread.id} {...rowTransition}>
              <li className="border-b border-border last:border-b-0">
                <ThreadRow thread={thread} selected={thread.id === selectedId} onOpen={() => onOpen(thread)} />
              </li>
            </ViewTransition>
          ))}
        </ul>
      )}
      {hasMore && (
        <div className="flex items-center justify-center gap-3 border-t border-border py-2">
          {loadMoreError && <p className="text-xs leading-4 text-danger">{loadMoreError}</p>}
          <Button variant="quiet" className={SMALL_BUTTON} pending={loadingMore} onClick={onLoadMore}>
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}

function ThreadRow({ thread, selected, onOpen }: { thread: InboxThread; selected: boolean; onOpen: () => void }) {
  const unread = thread.state === 'unread';
  const preview = thread.preview.trim();
  const subject = threadSubject(thread);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected || undefined}
      className={cn(
        // On a phone the subject goes under the sender, lined up with it.
        'flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.25 text-left text-[13px] leading-4.5 focus-visible:outline-offset-[-2px] sm:flex-nowrap',
        // The hover of the dashboard's tables.
        'bg-linear-to-r from-accent/0 via-accent/0 to-accent/0 transition-[background-color,--tw-gradient-from,--tw-gradient-via] duration-200 ease-out motion-reduce:transition-none',
        'hover:bg-raised hover:from-accent/12 hover:via-accent/3',
        selected && 'border-l-2 border-l-accent bg-raised',
        unread ? 'font-medium text-foreground' : 'text-default'
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', unread && 'bg-accent')} />
      {unread && <span className="sr-only">Unread:</span>}
      <ChannelLogo channel={thread.channel} size={20} />
      <span className="sr-only">{channelName(thread.channel)},</span>
      <span className="min-w-0 flex-1 truncate sm:w-37.5 sm:flex-none sm:shrink-0">
        {thread.from || channelName(thread.channel)}
      </span>
      <span className="order-last flex min-w-0 basis-full items-center gap-2 pl-12.5 sm:order-none sm:flex-1 sm:basis-auto sm:pl-0">
        <span className="min-w-0 truncate">{subject}</span>
        {preview && preview !== subject && (
          <span className="min-w-0 max-w-105 flex-1 truncate font-normal text-muted">— {preview}</span>
        )}
      </span>
      <StatusPill state={thread.state} waitingOn={thread.waitingOn} className="font-normal" />
      <InboxTime
        iso={thread.lastActivityAt}
        format="ago"
        className="shrink-0 text-right font-mono text-[11px] leading-4 font-normal text-muted sm:w-16"
      />
    </button>
  );
}

/** What an empty view says, short of the whole inbox being empty. */
function describeNoThreads(view: InboxView): string {
  if (view.search) {
    return `No threads match “${view.search}”.`;
  }

  const where = view.channel ? ` on ${channelName(view.channel)}` : '';

  switch (view.tab) {
    case 'unread':
      return `No new threads${where}.`;
    case 'waiting':
      return `Nothing is waiting${where}.`;
    case 'resolved':
      return `No resolved threads${where}.`;
    default:
      return `No threads${where} yet.`;
  }
}
