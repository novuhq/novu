'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { TriangleAlert, X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import {
  channelName,
  describeState,
  type InboxThread,
  type InboxThreadDetails,
  type InboxThreadView,
  inboxShowCommand,
  threadSubject,
} from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { ChannelLogo } from './channel-logo';
import { FooterCommand } from './command-chip';
import { CrossFade } from './cross-fade';
import { InboxTime } from './inbox-time';
import { STATE_TEXT_TONES, StatusPill } from './status-pill';
import { ThreadMessages } from './thread-messages';

/** A thread as the drawer has it: on its way, failed, or there, maybe with an older page on its way. */
export type ThreadLoad =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; view: InboxThreadView; earlier?: 'loading' | 'error' };

type ThreadDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the list knows about the thread: enough for the header while the rest loads. */
  summary: InboxThread | null;
  load: ThreadLoad | undefined;
  /** How the thread calls the agent: its handle. */
  agentName: string;
  onRetry: () => void;
  /** Reads the page of messages older than those loaded. */
  onLoadOlder: () => void;
};

/**
 * One thread, over the page: who it is with and where it stands, its Details, and every message and card in
 * it, newest first. Details stays put at the top; only the messages under it scroll. Read-only: there is no
 * reply box, and opening it never marks it read. The agent answers from its terminal, with the command at
 * the bottom.
 *
 * While it is open the thread keeps up (`useThreadLoads`): new messages come in at the top, cards change
 * as they are answered, and the status chip and Details follow. Older messages load as the reader scrolls
 * towards the end.
 */
export function ThreadDrawer({
  open,
  onOpenChange,
  summary,
  load,
  agentName,
  onRetry,
  onLoadOlder,
}: ThreadDrawerProps) {
  const view = load?.status === 'ready' ? load.view : null;
  const thread = view?.thread ?? summary;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in motion-reduce:animate-none!" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Focus lands on the panel, not on the close button, whose focus ring would light up on every open.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-160 flex-col border-l border-border-strong bg-background shadow-[-16px_0_40px_rgb(0_0_0/0.6)] outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in motion-reduce:animate-none!"
        >
          <header className="flex items-center gap-3 border-b border-border py-4 pr-3.5 pl-5">
            {thread && <ChannelLogo channel={thread.channel} size={28} />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogPrimitive.Title className="truncate text-[15px] leading-5 font-medium text-foreground">
                {thread ? threadSubject(thread) : 'Thread'}
              </DialogPrimitive.Title>
              {thread && <p className="truncate text-xs leading-4 text-secondary">{describeWho(thread)}</p>}
            </div>
            {thread && (
              <CrossFade id={describeState(thread.state, thread.waitingOn).label} value={thread}>
                {(shown, className) => (
                  // At most half the row, so a long "waiting on …" name can't push Close out of the drawer.
                  <StatusPill
                    state={shown.state}
                    waitingOn={shown.waitingOn}
                    className={cn('max-w-[50%] shrink', className)}
                  />
                )}
              </CrossFade>
            )}
            <DialogPrimitive.Close aria-label="Close" className={buttonClassName('ghost', 'text-foreground')}>
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            {load?.status === 'ready' && (
              // One per thread: a thread fades in when it first shows, and after that only what changes moves.
              <div
                key={load.view.thread.id}
                className="flex min-h-0 flex-1 animate-overlay-in flex-col motion-reduce:animate-none"
              >
                {/* On a short screen Details takes at most 40% of it and scrolls, so the messages keep room. */}
                <div className="max-h-[40dvh] shrink-0 overflow-y-auto px-5 pt-4 pb-2">
                  <Details details={load.view.details} thread={load.view.thread} />
                </div>
                <ThreadScroll view={load.view} older={load.earlier} agentName={agentName} onLoadOlder={onLoadOlder} />
              </div>
            )}
            {load?.status === 'error' && (
              <div className="overflow-y-auto px-5 py-4">
                <LoadError message={load.error} onRetry={onRetry} />
              </div>
            )}
            {(!load || load.status === 'loading') && (
              <div className="px-5 py-4">
                <ThreadSkeleton />
              </div>
            )}
          </div>
          {thread && (
            <footer className="border-t border-border px-5 py-3.5">
              <FooterCommand command={inboxShowCommand(thread.id)} />
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** "Maya Levi on Telegram": who the thread is with, and where. */
function describeWho(thread: InboxThread): string {
  const channel = channelName(thread.channel);

  return thread.from.trim() ? `${thread.from} on ${channel}` : channel;
}

/** How near the top the reader counts as at it: a new message then comes in at the top, in view. */
const AT_TOP_PX = 8;

/**
 * The messages, under Details: the only part of the drawer that scrolls, in the room Details and the footer
 * leave. Once the reader scrolls down, a line fades in along its top, where the messages slide under.
 */
function ThreadScroll({
  view,
  older,
  agentName,
  onLoadOlder,
}: {
  view: InboxThreadView;
  older: 'loading' | 'error' | undefined;
  agentName: string;
  onLoadOlder: () => void;
}) {
  // State, not ref objects: the observers below start once both elements are there.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [list, setList] = useState<HTMLOListElement | null>(null);
  const atTop = useKeptPlace(scroller, list);

  return (
    // The browser's own scroll anchoring is off: the drawer keeps the reader's place itself, the same everywhere.
    <div
      ref={setScroller}
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto border-t px-5 pb-4 [overflow-anchor:none] *:shrink-0',
        'transition-colors duration-200 ease-out motion-reduce:transition-none',
        atTop ? 'border-transparent' : 'border-border'
      )}
    >
      <ThreadMessages
        listRef={setList}
        messages={view.messages}
        lastReadAt={view.details.lastReadAt}
        agentName={agentName}
        unfoldArrivals={atTop}
      />
      {view.hasMore && <OlderMessages state={older} onLoad={onLoadOlder} root={scroller} />}
    </div>
  );
}

/**
 * Keeps what the reader looks at in place while the list changes above it: a message that arrives at the
 * top, or a card above that grows or shrinks as it changes. The message at the top of the view is noted on
 * every scroll; whenever the list changes size, the view scrolls by however far that message moved, before
 * anything is painted. At the top of the thread nothing is held, so what arrives comes into view.
 *
 * Says whether the reader is at the top.
 */
function useKeptPlace(scroller: HTMLElement | null, list: HTMLElement | null): boolean {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    if (!scroller || !list) {
      return;
    }

    let place: { id: string; offset: number } | null = null;

    const note = () => {
      const top = scroller.scrollTop <= AT_TOP_PX;
      setAtTop(top);
      place = top ? null : findPlace(scroller, list);
    };

    const keep = () => {
      const item = place ? findMessage(list, place.id) : null;
      if (place && item) {
        const moved = offsetIn(scroller, item) - place.offset;
        if (Math.abs(moved) >= 0.5) {
          scroller.scrollTop += moved;
        }
      }
      note();
    };

    note();
    scroller.addEventListener('scroll', note, { passive: true });
    // Called after layout and before paint, so a change and the scroll that makes up for it show together.
    const observer = new ResizeObserver(keep);
    observer.observe(list);

    return () => {
      scroller.removeEventListener('scroll', note);
      observer.disconnect();
    };
  }, [scroller, list]);

  return atTop;
}

/** The first message whose bottom is below the top of the view, and how far down from that top it starts. */
function findPlace(scroller: HTMLElement, list: HTMLElement): { id: string; offset: number } | null {
  const items = list.querySelectorAll<HTMLElement>('[data-message-id]');
  const top = scroller.getBoundingClientRect().top;
  let low = 0;
  let high = items.length - 1;
  let found: HTMLElement | null = null;

  // The messages are in order down the list, so the first one still in view is found by halving.
  while (low <= high) {
    const middle = (low + high) >> 1;
    const item = items[middle];
    if (item.getBoundingClientRect().bottom > top) {
      found = item;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  const id = found?.dataset.messageId;

  return found && id ? { id, offset: found.getBoundingClientRect().top - top } : null;
}

function findMessage(list: HTMLElement, id: string): HTMLElement | null {
  return list.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`);
}

function offsetIn(scroller: HTMLElement, item: HTMLElement): number {
  return item.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
}

/** How far past the end of the view an older page starts loading: about a view and a half ahead. */
const PREFETCH_MARGIN = '0px 0px 150% 0px';

/** A page that comes this quickly never shows the loading row. */
const LOADING_ROW_AFTER_MS = 300;

/**
 * Older messages than the loaded ones exist. They are read in the background as the reader nears the end,
 * one page at a time, so they are usually there before the reader is. A row folds open at the end only
 * while a page is still on its way after a moment, or when it failed, with "Try again".
 */
function OlderMessages({
  state,
  onLoad,
  root,
}: {
  state: 'loading' | 'error' | undefined;
  onLoad: () => void;
  root: HTMLElement | null;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const load = useRef(onLoad);
  useEffect(() => {
    load.current = onLoad;
  });

  // Watched only while nothing is on its way, and not after a failure, which waits for "Try again". A new
  // observer reports at once, so after each page the next one loads too if the end is still near.
  useEffect(() => {
    const target = sentinel.current;
    if (state || !root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load.current();
        }
      },
      { root, rootMargin: PREFETCH_MARGIN }
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [state, root]);

  const slow = useAfter(state === 'loading', LOADING_ROW_AFTER_MS);
  const row = state === 'error' ? 'error' : slow ? 'loading' : null;
  // What the row showed last, kept while it folds away.
  const [lastRow, setLastRow] = useState<'loading' | 'error'>(row ?? 'loading');
  if (row && row !== lastRow) {
    setLastRow(row);
  }

  return (
    <div
      ref={sentinel}
      // Folded away, its last row is still there to fold away with, but can't be reached.
      inert={!row}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        row ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <CrossFade id={row ?? lastRow} value={row ?? lastRow}>
          {(shown, className) =>
            shown === 'error' ? (
              <div className={cn('flex items-center justify-center gap-3 py-3', className)}>
                <p className="text-xs leading-4 text-danger">Couldn’t load earlier messages.</p>
                <Button variant="quiet" className={SMALL_BUTTON} onClick={onLoad}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className={className}>
                <ThreadSkeleton rows={1} label="Loading earlier messages" />
              </div>
            )
          }
        </CrossFade>
      </div>
    </div>
  );
}

/** `on`, once it has been on for `ms`; off at once. */
function useAfter(on: boolean, ms: number): boolean {
  const [late, setLate] = useState(false);

  useEffect(() => {
    if (!on) {
      setLate(false);

      return;
    }

    const timer = setTimeout(() => setLate(true), ms);

    return () => clearTimeout(timer);
  }, [on, ms]);

  return on && late;
}

function Details({ details, thread }: { details: InboxThreadDetails; thread: InboxThread }) {
  const status = describeState(details.status, thread.waitingOn);
  const contact = details.contact;
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-lg border border-border">
      <h3
        id={titleId}
        className="border-b border-border bg-subtle px-3.5 py-2.5 font-mono text-[11px] leading-4 font-medium tracking-[0.66px] text-muted uppercase"
      >
        Details
      </h3>
      <dl className="grid grid-cols-2 [&>div:not(:last-child)]:border-b [&>div:not(:last-child)]:border-border">
        <Detail label="Thread">{details.threadId}</Detail>
        <Detail label="Channel">{channelName(details.channel)}</Detail>
        <Detail label="Contact">{contact ? describeContact(contact) : 'Nobody yet'}</Detail>
        <Detail label="Status">
          <CrossFade id={status.label} value={status}>
            {(shown, className) => <span className={cn(STATE_TEXT_TONES[shown.tone], className)}>{shown.label}</span>}
          </CrossFade>
        </Detail>
        <Detail label="Opened">
          <InboxTime iso={details.openedAt} format="date-time" />
        </Detail>
        <Detail label="Last read by agent">
          <CrossFade id={details.lastReadAt ?? ''} value={details.lastReadAt}>
            {(shown, className) => (
              <span className={className}>{shown ? <InboxTime iso={shown} format="stamp" /> : 'Not yet'}</span>
            )}
          </CrossFade>
        </Detail>
        <Detail label="Messages" wide>
          <CrossFade id={String(details.messageCount)} value={details.messageCount}>
            {(shown, className) => <span className={className}>{shown}</span>}
          </CrossFade>
        </Detail>
      </dl>
    </section>
  );
}

/** "Maya Levi · verified" once the agent can reach them on the thread's channel; a stranger says so. */
function describeContact(contact: NonNullable<InboxThreadDetails['contact']>): string {
  const name = contact.name?.trim() || contact.id;

  if (contact.kind === 'stranger') {
    return `${name} · stranger`;
  }

  return contact.verified ? `${name} · verified` : name;
}

type DetailProps = {
  label: string;
  /** Takes the whole row. */
  wide?: boolean;
  children: ReactNode;
};

function Detail({ label, wide = false, children }: DetailProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5 px-3.5 py-2.25 font-mono', wide && 'col-span-2')}>
      <dt className="text-[10px] leading-3.5 text-muted">{label}</dt>
      <dd className="truncate text-xs leading-4 text-foreground">{children}</dd>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border p-5">
      <TriangleAlert aria-hidden="true" className="size-5 text-pending" />
      <p className="text-sm tracking-tight text-secondary">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/** Placeholder rows while messages load, as the dashboard's pages have while theirs do. */
function ThreadSkeleton({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a loading state
    <div role="status" className="flex animate-pulse flex-col motion-reduce:animate-none">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-start gap-3 border-b border-border py-3.5">
          <div className="size-6 shrink-0 rounded-full bg-raised" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4.5 w-40 rounded bg-raised" />
            <div className="h-4 w-full max-w-100 rounded bg-raised" />
          </div>
        </div>
      ))}
    </div>
  );
}
