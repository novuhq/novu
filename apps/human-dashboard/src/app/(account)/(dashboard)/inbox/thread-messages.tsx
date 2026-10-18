'use client';

import { FileText } from 'lucide-react';
import { type ReactNode, type Ref, useEffect, useRef, useState } from 'react';

import { channelName, type InboxAttachment, type InboxMessage, initialOf } from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { CrossFade } from './cross-fade';
import { InboxTime } from './inbox-time';
import { ThreadCard } from './thread-card';

type ThreadMessagesProps = {
  /** Oldest first, as the API gives them. They are shown newest first. */
  messages: InboxMessage[];
  /** Up to which message the agent read the thread. */
  lastReadAt: string | null;
  /** How the thread calls the agent: its handle, as in "read by atlas". */
  agentName: string;
  /**
   * The reader is at the top of the thread: a message that arrives unfolds there and moves the rest down.
   * Further down it takes its place at once, and the drawer keeps what the reader looks at where it is.
   */
  unfoldArrivals: boolean;
  listRef?: Ref<HTMLOListElement>;
};

/** How a row comes in: with the thread (nothing of its own), at the top, or with an older page at the end. */
type Arrival = 'none' | 'unfold' | 'fade' | 'rise';

const ARRIVALS: Record<Arrival, string | undefined> = {
  none: undefined,
  unfold: 'animate-fold-open motion-reduce:animate-none',
  fade: 'animate-overlay-in motion-reduce:animate-none',
  rise: 'animate-rise-in motion-reduce:animate-none',
};

/** How a row that left the list goes: it folds away where it was, so the rows around it close up. */
const LEAVING = 'animate-fold-close motion-reduce:hidden';

/** How long a row that left the list stays to fold away: `--animate-fold-close`'s length. */
const LEAVE_MS = 300;

/** One row of the list: a message of the thread, or the line above the last one the agent read. */
type Row =
  | { key: string; kind: 'message'; message: InboxMessage; arrival: Arrival }
  | { key: string; kind: 'read'; at: string; arrival: Arrival };

/**
 * The thread as it happened, newest first: people's messages coming in, the agent's going out (some of them
 * cards), the system's lines, and where the agent stopped reading.
 *
 * What is there when the thread first shows comes in with it. A message that arrives after that unfolds at
 * the top, an older page that loads rises in at the end, and a row that leaves, such as the read marker when
 * it moves, folds away where it was. Each message row carries `data-message-id`, which the drawer keeps the
 * reader's place by.
 */
export function ThreadMessages({ messages, lastReadAt, agentName, unfoldArrivals, listRef }: ThreadMessagesProps) {
  const readUpTo = findReadUpTo(messages, lastReadAt);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(true);
  }, []);

  // The newest message the last render had: those after it arrived at the top since.
  const newestBefore = useRef<string | undefined>(undefined);
  const knownUpTo = newestBefore.current ? messages.findIndex((message) => message.id === newestBefore.current) : -1;
  useEffect(() => {
    newestBefore.current = messages.at(-1)?.id;
  });

  const atTop: Arrival = shown ? (unfoldArrivals ? 'unfold' : 'fade') : 'none';
  const rows: Row[] = [];
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (index === readUpTo && lastReadAt) {
      // Keyed by the message it sits on: when it moves, it folds away there and unfolds where it lands.
      rows.push({ key: `read:${message.id}`, kind: 'read', at: lastReadAt, arrival: atTop });
    }
    if (message.from !== 'system' || message.card || message.text.trim()) {
      const arrival = shown ? (knownUpTo !== -1 && index > knownUpTo ? atTop : 'rise') : 'none';
      rows.push({ key: `message:${message.id}`, kind: 'message', message, arrival });
    }
  }

  return (
    <ol ref={listRef} className="flex flex-col">
      {useLeavingRows(rows).map(({ row, leaving }) => (
        <ListRow key={row.key} row={row} agentName={agentName} leaving={leaving} />
      ))}
    </ol>
  );
}

/**
 * The rows to draw: the list's own, and those that just left it, still there for a moment where they were
 * so they can fold away. Each one that left goes back after the row it followed.
 */
function useLeavingRows(rows: Row[]): { row: Row; leaving: boolean }[] {
  const keys = rows.map((row) => row.key).join('\n');
  const [last, setLast] = useState({ keys, rows });
  const [left, setLeft] = useState<Map<string, { row: Row; after: string | null }>>(() => new Map());

  let gone = left;
  if (keys !== last.keys) {
    const current = new Set(rows.map((row) => row.key));
    gone = new Map([...left].filter(([key]) => !current.has(key)));
    last.rows.forEach((row, index) => {
      if (!current.has(row.key)) {
        gone.set(row.key, { row, after: index > 0 ? last.rows[index - 1].key : null });
      }
    });
    setLast({ keys, rows });
    setLeft(gone);
  }

  // All of them go once the last to leave has folded away; folded, the earlier ones take no room.
  useEffect(() => {
    if (left.size === 0) {
      return;
    }

    const timer = setTimeout(() => setLeft(new Map()), LEAVE_MS);

    return () => clearTimeout(timer);
  }, [left]);

  const following = new Map<string | null, Row[]>();
  for (const { row, after } of gone.values()) {
    following.set(after, [...(following.get(after) ?? []), row]);
  }

  const drawn: { row: Row; leaving: boolean }[] = [];
  const draw = (row: Row, leaving: boolean) => {
    drawn.push({ row, leaving });
    for (const next of following.get(row.key) ?? []) {
      draw(next, true);
    }
    following.delete(row.key);
  };
  for (const row of following.get(null) ?? []) {
    draw(row, true);
  }
  following.delete(null);
  for (const row of rows) {
    draw(row, false);
  }
  // Whatever followed a row that is no longer there at all goes at the end.
  for (const row of [...following.values()].flat()) {
    drawn.push({ row, leaving: true });
  }

  return drawn;
}

/** The class that brings an item in, decided once, when it mounts, so nothing there before replays it. */
function useArrival(arrival: Arrival): string | undefined {
  const [mounted] = useState(arrival);

  return ARRIVALS[mounted];
}

/**
 * One item of the list. It folds open from nothing when it arrives at the top, and folds shut when it leaves,
 * so what is below moves rather than jumps: the item is a one-row grid whose content hides its overflow while
 * it opens or closes.
 */
function Item({
  arrival,
  leaving,
  messageId,
  className,
  children,
}: {
  arrival: Arrival;
  leaving: boolean;
  messageId?: string;
  className: string;
  children: ReactNode;
}) {
  const arrivalClass = useArrival(arrival);

  return (
    <li
      // Leaving, it can't be reached, and the drawer no longer keeps the reader's place by it.
      data-message-id={leaving ? undefined : messageId}
      inert={leaving}
      className={cn('grid grid-rows-[1fr]', leaving ? LEAVING : arrivalClass)}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={className}>{children}</div>
      </div>
    </li>
  );
}

function ListRow({ row, agentName, leaving }: { row: Row; agentName: string; leaving: boolean }) {
  if (row.kind === 'read') {
    return <ReadMarker agentName={agentName} at={row.at} arrival={row.arrival} leaving={leaving} />;
  }

  const { message, arrival } = row;

  return message.from === 'system' && !message.card ? (
    <EventLine text={message.text.trim()} at={message.at} arrival={arrival} leaving={leaving} messageId={message.id} />
  ) : (
    <MessageRow message={message} agentName={agentName} arrival={arrival} leaving={leaving} />
  );
}

/**
 * The last message from a person that the agent read. The read cursor is that message's own time (the API
 * takes it from the message), so no message after it counts as read. None when no shown message is that old.
 */
function findReadUpTo(messages: InboxMessage[], lastReadAt: string | null): number {
  if (!lastReadAt) {
    return -1;
  }

  const readAt = Date.parse(lastReadAt);

  return messages.findLastIndex((message) => message.from === 'human' && Date.parse(message.at) <= readAt);
}

function MessageRow({
  message,
  agentName,
  arrival,
  leaving,
}: {
  message: InboxMessage;
  agentName: string;
  arrival: Arrival;
  leaving: boolean;
}) {
  // A card is always the agent's, also the rare one only its answer kept.
  const outgoing = message.direction === 'out' || Boolean(message.card) || message.from === 'agent';
  const name = outgoing ? agentName : senderNameOf(message);
  const text = message.text.trim();

  return (
    <Item
      arrival={arrival}
      leaving={leaving}
      messageId={message.id}
      className="flex items-start gap-3 border-b border-border py-3.5"
    >
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
    </Item>
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

/** The line of the system's look, lined up with the messages' text. */
const EVENT_LINE =
  'flex items-center gap-2 border-b border-border py-2 pl-9 font-mono text-[11px] leading-3.5 text-muted';

/** A line of the system's, such as "resolved". */
function EventLine({
  text,
  at,
  arrival,
  leaving,
  messageId,
}: {
  text: string;
  at: string;
  arrival: Arrival;
  leaving: boolean;
  messageId: string;
}) {
  return (
    <Item arrival={arrival} leaving={leaving} messageId={messageId} className={EVENT_LINE}>
      <p>
        {text} · <InboxTime iso={at} format="stamp" />
      </p>
    </Item>
  );
}

/** Where the agent stopped reading: above the last message it read, under what came after. */
function ReadMarker({
  agentName,
  at,
  arrival,
  leaving,
}: {
  agentName: string;
  at: string;
  arrival: Arrival;
  leaving: boolean;
}) {
  return (
    <Item arrival={arrival} leaving={leaving} className={EVENT_LINE}>
      {/* The agent can read again up to the same message: the time then changes in place. */}
      <CrossFade id={at} value={at}>
        {(shown, className) => (
          <p className={className}>
            read by {agentName} · <InboxTime iso={shown} format="seconds" />
          </p>
        )}
      </CrossFade>
    </Item>
  );
}
