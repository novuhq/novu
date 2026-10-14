'use client';

import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { channelName, type InboxAttachment, type InboxMessage, initialOf } from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { InboxTime } from './inbox-time';
import { ThreadCard } from './thread-card';

type ThreadMessagesProps = {
  /** Oldest first. */
  messages: InboxMessage[];
  /** Up to which message the agent read the thread. */
  lastReadAt: string | null;
  /** How the thread calls the agent: its handle, as in "read by atlas". */
  agentName: string;
};

/**
 * The thread as it happened: people's messages coming in, the agent's going out (some of them cards),
 * the system's lines, and where the agent stopped reading.
 *
 * What is there when the thread first shows comes in with it; a message, line or read marker that arrives
 * after that, when the thread is read again, rises in.
 */
export function ThreadMessages({ messages, lastReadAt, agentName }: ThreadMessagesProps) {
  const readUpTo = findReadUpTo(messages, lastReadAt);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(true);
  }, []);

  return (
    <ol className="flex flex-col">
      {messages.map((message, index) => (
        <MessageItems
          key={message.id}
          message={message}
          agentName={agentName}
          readAt={index === readUpTo ? lastReadAt : null}
          arrivedLater={shown}
        />
      ))}
    </ol>
  );
}

type ArrivalProps = {
  /** The thread was already showing when this mounted: it rises in. */
  arrivedLater: boolean;
};

/** The class that makes an item rise in, decided once, when it mounts, so nothing there before replays it. */
function useRiseIn(arrivedLater: boolean): string | undefined {
  const [rises] = useState(arrivedLater);

  return rises ? 'animate-rise-in motion-reduce:animate-none' : undefined;
}

function MessageItems({
  message,
  agentName,
  readAt,
  arrivedLater,
}: ArrivalProps & {
  message: InboxMessage;
  agentName: string;
  /** Set on the last message the agent read: the line under it says so. */
  readAt: string | null;
}) {
  return (
    <>
      {message.from === 'system' && !message.card ? (
        message.text.trim() && <EventLine text={message.text.trim()} at={message.at} arrivedLater={arrivedLater} />
      ) : (
        <MessageRow message={message} agentName={agentName} arrivedLater={arrivedLater} />
      )}
      {readAt && <EventLine text={`read by ${agentName}`} at={readAt} withSeconds arrivedLater={arrivedLater} />}
    </>
  );
}

/**
 * The last message from a person that the agent read. The read cursor is the time of that message, so it
 * is matched to the second too, for a message whose time was stored a moment apart from it.
 */
function findReadUpTo(messages: InboxMessage[], lastReadAt: string | null): number {
  if (!lastReadAt) {
    return -1;
  }

  const readAt = Date.parse(lastReadAt);
  const lastWithin = (slack: number) =>
    messages.findLastIndex((message) => message.from === 'human' && Date.parse(message.at) <= readAt + slack);
  const exact = lastWithin(0);

  return exact >= 0 ? exact : lastWithin(999);
}

function MessageRow({ message, agentName, arrivedLater }: ArrivalProps & { message: InboxMessage; agentName: string }) {
  // A card is always the agent's, also the rare one only its answer kept.
  const outgoing = message.direction === 'out' || Boolean(message.card) || message.from === 'agent';
  const name = outgoing ? agentName : senderNameOf(message);
  const text = message.text.trim();
  const riseIn = useRiseIn(arrivedLater);

  return (
    <li className={cn('flex items-start gap-3 border-b border-border py-3.5', riseIn)}>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] leading-3.5 font-medium',
          outgoing ? 'bg-accent/15 text-accent' : 'border border-border-strong bg-raised text-default'
        )}
      >
        {initialOf(name)}
      </span>
      <div className={cn('flex min-w-0 flex-1 flex-col', message.card ? 'gap-2' : 'gap-1.5')}>
        <p className="flex items-center gap-2">
          <span className="truncate text-[13px] leading-4.5 font-medium text-foreground">{name}</span>
          <span
            className={cn('shrink-0 font-mono text-[11px] leading-3.5', outgoing ? 'text-accent' : 'text-secondary')}
          >
            {outgoing ? '↑ out' : '↓ in'}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[11px] leading-3.5 text-muted">
            {channelName(message.channel)} · <InboxTime iso={message.at} format="stamp" />
          </span>
        </p>
        {message.card ? (
          <ThreadCard card={message.card} />
        ) : (
          text && <p className="text-sm leading-5.5 wrap-break-word whitespace-pre-wrap text-foreground">{text}</p>
        )}
        {/* Attachments have no id of their own; their place in the message stands in for one. */}
        {message.attachments?.map((attachment, index) => (
          <Attachment key={`${index}-${attachment.name}`} attachment={attachment} />
        ))}
      </div>
    </li>
  );
}

function senderNameOf(message: InboxMessage): string {
  return message.sender?.name?.trim() || message.senderName?.trim() || message.sender?.id || 'Someone';
}

function Attachment({ attachment }: { attachment: InboxAttachment }) {
  const size = formatSize(attachment.size);

  return (
    <p className="flex items-center gap-2 self-start rounded-md border border-border-strong px-2.5 py-1.5">
      <FileText aria-hidden="true" className="size-3.5 shrink-0 text-secondary" />
      <span className="truncate font-mono text-xs leading-4 text-foreground">
        {attachment.name || attachment.mimeType || 'attachment'}
      </span>
      {size && <span className="shrink-0 font-mono text-[11px] leading-3.5 text-muted">{size}</span>}
    </p>
  );
}

/** "84 KB", as a file manager writes it. */
function formatSize(bytes: number | undefined): string | null {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A line of the system's, or where the agent stopped reading, lined up with the messages' text. */
function EventLine({
  text,
  at,
  withSeconds = false,
  arrivedLater,
}: ArrivalProps & { text: string; at: string; withSeconds?: boolean }) {
  const riseIn = useRiseIn(arrivedLater);

  return (
    <li
      className={cn(
        'flex items-center gap-2 border-b border-border py-2 pl-9 font-mono text-[11px] leading-3.5 text-muted',
        riseIn
      )}
    >
      <p>
        {text} · <InboxTime iso={at} format={withSeconds ? 'seconds' : 'stamp'} />
      </p>
    </li>
  );
}
