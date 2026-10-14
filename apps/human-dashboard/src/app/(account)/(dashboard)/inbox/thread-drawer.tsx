'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { TriangleAlert, X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

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
  onLoadEarlier: () => void;
};

/**
 * One thread, over the page: who it is with and where it stands, every message and card in it, and its
 * Details. Read-only: there is no reply box, and opening it never marks it read. The agent answers
 * from its terminal, with the command at the bottom.
 */
export function ThreadDrawer({
  open,
  onOpenChange,
  summary,
  load,
  agentName,
  onRetry,
  onLoadEarlier,
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
            {thread && <StatusPill state={thread.state} waitingOn={thread.waitingOn} />}
            <DialogPrimitive.Close aria-label="Close" className={buttonClassName('ghost', 'text-foreground')}>
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            {load?.status === 'ready' && (
              // One per thread: a thread fades in when it first shows, and after that only what arrives rises in.
              <div
                key={load.view.thread.id}
                className="flex min-h-0 flex-1 animate-overlay-in flex-col motion-reduce:animate-none"
              >
                {/*
                 * Only the messages scroll. They take the height they need, so a short thread has Details right
                 * under it; a long one shrinks to the room left and scrolls, and Details stays in view below.
                 */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pt-4 *:shrink-0">
                  {load.view.hasMore && <EarlierMessages state={load.earlier} onLoad={onLoadEarlier} />}
                  <ThreadMessages
                    messages={load.view.messages}
                    lastReadAt={load.view.details.lastReadAt}
                    agentName={agentName}
                  />
                </div>
                <div className="shrink-0 px-5 py-4">
                  <Details details={load.view.details} thread={load.view.thread} />
                </div>
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

/** The thread holds more than the drawer loaded at once. */
function EarlierMessages({ state, onLoad }: { state: 'loading' | 'error' | undefined; onLoad: () => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {state === 'error' && <p className="text-xs leading-4 text-danger">Couldn’t load them.</p>}
      <Button variant="quiet" className={SMALL_BUTTON} pending={state === 'loading'} onClick={onLoad}>
        {state === 'error' ? 'Try again' : 'Show earlier messages'}
      </Button>
    </div>
  );
}

function Details({ details, thread }: { details: InboxThreadDetails; thread: InboxThread }) {
  const { label, tone } = describeState(details.status, thread.waitingOn);
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
        <Detail label="Status" valueClassName={STATE_TEXT_TONES[tone]}>
          {label}
        </Detail>
        <Detail label="Opened">
          <InboxTime iso={details.openedAt} format="date-time" />
        </Detail>
        <Detail label="Last read by agent">
          {details.lastReadAt ? <InboxTime iso={details.lastReadAt} format="stamp" /> : 'Not yet'}
        </Detail>
        <Detail label="Messages" wide>
          {details.messageCount}
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
  valueClassName?: string;
  children: ReactNode;
};

function Detail({ label, wide = false, valueClassName, children }: DetailProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5 px-3.5 py-2.25 font-mono', wide && 'col-span-2')}>
      <dt className="text-[10px] leading-3.5 text-muted">{label}</dt>
      <dd className={cn('truncate text-xs leading-4 text-foreground', valueClassName)}>{children}</dd>
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

/** Placeholder rows while the thread loads, as the dashboard's pages have while theirs do. */
function ThreadSkeleton() {
  return (
    // biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a loading state
    <div role="status" className="flex animate-pulse flex-col motion-reduce:animate-none">
      <span className="sr-only">Loading</span>
      {[0, 1, 2].map((row) => (
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
