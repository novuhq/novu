'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { InboxMessage, InboxThread, InboxThreadPage, InboxThreadView } from '@/lib/inbox';

import type { LoadThreadResult } from './actions';
import type { ThreadLoad } from './thread-drawer';

/** Reads one page of a thread: `loadThreadAction`. */
export type ReadThreadPage = (threadId: string, page?: InboxThreadPage) => Promise<LoadThreadResult>;

/** How often the open thread asks for what's new, while the tab is in view. */
export const LIVE_THREAD_EVERY_MS = 5_000;

/** Pages of new messages one check follows at most. A bigger burst is picked up by the next check. */
const MAX_NEWER_PAGES = 5;

type ThreadLoadsOptions = {
  /** The thread the page's address opened, read by the server. */
  initial: { id: string; load: ThreadLoad } | null;
  readPage: ReadThreadPage;
  /** The thread the drawer shows while it is open: it is kept up to date. */
  liveId: string | null;
  /** Told each time a read of a thread finds it as it stands now, so the list can show the same. */
  onThreadRead?: (thread: InboxThread) => void;
};

/**
 * The threads the drawer has read, and the reads that change them: opening one, the older pages the
 * reader scrolls to, and, while the drawer is open and the tab in view, a check every few seconds for
 * new messages and for cards that were still waiting. Messages are kept oldest first, as the API gives
 * them; a message read again replaces the one there, and none already loaded is dropped.
 */
export function useThreadLoads({ initial, readPage, liveId, onThreadRead }: ThreadLoadsOptions) {
  const [loads, setLoads] = useState<Record<string, ThreadLoad>>(initial ? { [initial.id]: initial.load } : {});

  // What the reads below start from, and what they call: always the latest, so they needn't change.
  const latest = useRef({ loads, readPage, onThreadRead });
  useEffect(() => {
    latest.current = { loads, readPage, onThreadRead };
  });
  // One read of each kind per thread at a time.
  const readingOlder = useRef(new Set<string>());
  const checking = useRef(new Set<string>());

  const update = useCallback((threadId: string, change: (load: ThreadLoad | undefined) => ThreadLoad | undefined) => {
    setLoads((previous) => {
      const next = change(previous[threadId]);

      return next === previous[threadId] || !next ? previous : { ...previous, [threadId]: next };
    });
  }, []);

  /** The thread as the server rendered it with the page, over what the drawer already has. */
  const receive = useCallback(
    (threadId: string, load: ThreadLoad) => update(threadId, (current) => withNewest(current, load)),
    [update]
  );

  /** Opening a thread: one read before shows at once, and the newest messages are read again. */
  const open = useCallback(
    async (threadId: string) => {
      update(threadId, (current) => (current?.status === 'ready' ? current : { status: 'loading' }));

      const result = await latest.current.readPage(threadId);
      const fresh: ThreadLoad = result.ok
        ? { status: 'ready', view: result.view }
        : { status: 'error', error: result.error };

      update(threadId, (current) => withNewest(current, fresh));
      if (result.ok) {
        latest.current.onThreadRead?.(result.view.thread);
      }
    },
    [update]
  );

  /** The page before the oldest message loaded. Asked for again while one is on its way, it does nothing. */
  const loadOlder = useCallback(
    async (threadId: string) => {
      const current = latest.current.loads[threadId];
      const oldest = current?.status === 'ready' && current.view.hasMore ? current.view.messages[0]?.id : undefined;
      if (!oldest || readingOlder.current.has(threadId)) {
        return;
      }

      readingOlder.current.add(threadId);
      update(threadId, (load) => (load?.status === 'ready' ? { ...load, earlier: 'loading' } : load));
      try {
        const result = await latest.current.readPage(threadId, { before: oldest });
        update(threadId, (load) => withOlder(load, oldest, result));
      } finally {
        readingOlder.current.delete(threadId);
      }
    },
    [update]
  );

  /**
   * One check of an open thread: the messages that came after the newest one loaded, then each card that
   * was still waiting, read again where it is, so an answer, an approval or an expiry shows. Each answer
   * brings the thread as it stands too, for the status chip and the Details. A check that fails leaves the
   * thread as it was; the next one tries again.
   */
  const check = useCallback(
    async (threadId: string) => {
      const start = latest.current.loads[threadId];
      if (start?.status !== 'ready' || checking.current.has(threadId)) {
        return;
      }

      checking.current.add(threadId);
      try {
        const { readPage: read, onThreadRead: tell } = latest.current;
        const anchor = start.view.messages.at(-1)?.id;

        if (!anchor) {
          // Nothing in the thread yet: its newest page is everything there is.
          const result = await read(threadId);
          if (result.ok) {
            update(threadId, (load) => withNewest(load, { status: 'ready', view: result.view }));
            tell?.(result.view.thread);
          }

          return;
        }

        const caughtUp = await readNewer(read, threadId, anchor);
        if (!caughtUp) {
          return;
        }

        update(threadId, (load) => withNewer(load, anchor, caughtUp.messages, caughtUp.now));
        tell?.(caughtUp.now.thread);

        const merged = withNewer(start, anchor, caughtUp.messages, caughtUp.now);
        const cards = await readWaitingCards(read, threadId, merged?.status === 'ready' ? merged.view.messages : []);
        if (!cards) {
          return;
        }

        update(threadId, (load) => withReplaced(load, cards.messages, cards.now));
        tell?.(cards.now.thread);
      } finally {
        checking.current.delete(threadId);
      }
    },
    [update]
  );

  // The open thread keeps up while the tab is in view: it pauses while hidden, and checks at once on return.
  useEffect(() => {
    if (!liveId) {
      return;
    }

    const tick = () => {
      if (document.visibilityState === 'visible') {
        void check(liveId);
      }
    };
    const interval = window.setInterval(tick, LIVE_THREAD_EVERY_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [liveId, check]);

  return { loads, open, loadOlder, receive, check };
}

/** Messages a check read, oldest first, and the thread as the last answer had it. */
type Reread = { messages: InboxMessage[]; now: InboxThreadView };

/**
 * The messages that came after `anchor`, following the pages while more came. What was read before a page
 * failed still counts. `null` when nothing could be read.
 */
async function readNewer(read: ReadThreadPage, threadId: string, anchor: string): Promise<Reread | null> {
  const messages: InboxMessage[] = [];
  let now: InboxThreadView | null = null;
  let after = anchor;

  for (let page = 0; page < MAX_NEWER_PAGES; page += 1) {
    const result = await read(threadId, { after });
    if (!result.ok) {
      break;
    }

    now = result.view;
    messages.push(...result.view.messages);
    const last = result.view.messages.at(-1);
    if (!result.view.hasMore || !last) {
      break;
    }

    after = last.id;
  }

  return now ? { messages, now } : null;
}

/**
 * Each card of `messages` that was still waiting, read again on its own: one message, found by its
 * neighbour. Cards wait a while and then expire, so a thread rarely has more than a few at once. `null`
 * when none waits, or none could be read.
 */
async function readWaitingCards(
  read: ReadThreadPage,
  threadId: string,
  messages: InboxMessage[]
): Promise<Reread | null> {
  const pages = messages.flatMap((message, index) =>
    message.card?.state.status === 'pending' ? [pageOfOne(messages, index)] : []
  );
  const results = await Promise.all(pages.map((page) => read(threadId, page)));
  const views = results.flatMap((result) => (result.ok ? [result.view] : []));
  const now = views.at(-1);

  return now ? { messages: views.flatMap((view) => view.messages), now } : null;
}

/**
 * The read that gives back exactly the message at `index`: the one before its newer neighbour, or the one
 * after its older neighbour. The thread's only message is its newest.
 */
function pageOfOne(messages: InboxMessage[], index: number): InboxThreadPage {
  const newer = messages[index + 1];
  if (newer) {
    return { before: newer.id, limit: 1 };
  }

  const older = messages[index - 1];

  return older ? { after: older.id, limit: 1 } : { limit: 1 };
}

/**
 * The newest page of a thread, read again over what the drawer already has. The fresh page wins, and the
 * older messages loaded before it stay below it where the two meet; a page that doesn't meet them (many new
 * messages since) replaces them. A failed read keeps what was there.
 */
export function withNewest(current: ThreadLoad | undefined, fresh: ThreadLoad): ThreadLoad {
  if (current?.status !== 'ready') {
    return fresh;
  }

  if (fresh.status !== 'ready') {
    return current;
  }

  const first = fresh.view.messages[0];
  const meet = first ? current.view.messages.findIndex((message) => message.id === first.id) : -1;
  if (meet === -1) {
    return fresh;
  }

  const messages = [
    ...current.view.messages.slice(0, meet),
    ...keepUnchanged(current.view.messages, fresh.view.messages),
  ];

  // The first message is the same, so a page of older ones on its way still joins up.
  return {
    status: 'ready',
    view: { ...fresh.view, messages, hasMore: meet > 0 ? current.view.hasMore : fresh.view.hasMore },
    earlier: current.earlier,
  };
}

/** A page of older messages, below the ones loaded, if the thread still starts where the page was read from. */
function withOlder(load: ThreadLoad | undefined, oldest: string, result: LoadThreadResult): ThreadLoad | undefined {
  if (load?.status !== 'ready') {
    return load;
  }

  // The thread was read again meanwhile and starts at another message now: this page no longer joins up
  // with it, so it's dropped, and the next one is read from the new first message.
  if (load.view.messages[0]?.id !== oldest) {
    return { ...load, earlier: undefined };
  }

  if (!result.ok) {
    return { ...load, earlier: 'error' };
  }

  const loaded = new Set(load.view.messages.map((message) => message.id));
  const older = result.view.messages.filter((message) => !loaded.has(message.id));

  return {
    status: 'ready',
    view: { ...load.view, messages: [...older, ...load.view.messages], hasMore: result.view.hasMore },
  };
}

/**
 * The messages that came after `anchor`, after it, and the thread as it stands now. When the thread was read
 * again meanwhile from somewhere else, nothing changes: the next check starts from what is there.
 */
function withNewer(
  load: ThreadLoad | undefined,
  anchor: string,
  newer: InboxMessage[],
  now: InboxThreadView
): ThreadLoad | undefined {
  if (load?.status !== 'ready') {
    return load;
  }

  const messages = load.view.messages;
  const at = messages.findIndex((message) => message.id === anchor);
  if (at === -1) {
    return load;
  }

  const head = messages.slice(0, at + 1);
  const headIds = new Set(head.map((message) => message.id));
  const arrived = newer.filter((message) => !headIds.has(message.id));
  const arrivedIds = new Set(arrived.map((message) => message.id));
  // What the drawer has past the anchor that this check didn't read: kept, after what it did.
  const rest = messages.slice(at + 1).filter((message) => !arrivedIds.has(message.id));
  const merged = [...head, ...keepUnchanged(messages, arrived), ...rest];

  return withThread(
    merged.length === messages.length && merged.every((message, index) => message === messages[index])
      ? load
      : { ...load, view: { ...load.view, messages: merged } },
    now
  );
}

/** Messages read again, each in its place; one the drawer doesn't have is left out. */
function withReplaced(
  load: ThreadLoad | undefined,
  fresh: InboxMessage[],
  now: InboxThreadView
): ThreadLoad | undefined {
  if (load?.status !== 'ready') {
    return load;
  }

  const again = new Map(fresh.map((message) => [message.id, message]));
  const messages = load.view.messages.map((message) => {
    const read = again.get(message.id);

    return read && !sameAs(read, message) ? read : message;
  });
  const changed = messages.some((message, index) => message !== load.view.messages[index]);

  return withThread(changed ? { ...load, view: { ...load.view, messages } } : load, now);
}

/** The thread and its Details as a read found them, keeping the same objects when nothing changed. */
function withThread(load: ThreadLoad, now: InboxThreadView): ThreadLoad {
  if (load.status !== 'ready' || (sameAs(load.view.thread, now.thread) && sameAs(load.view.details, now.details))) {
    return load;
  }

  return { ...load, view: { ...load.view, thread: now.thread, details: now.details } };
}

/**
 * `fresh`, with each message that `known` already has unchanged kept as the object it was: what didn't
 * change isn't drawn again, and a card that didn't change doesn't fade.
 */
function keepUnchanged(known: InboxMessage[], fresh: InboxMessage[]): InboxMessage[] {
  const byId = new Map(known.map((message) => [message.id, message]));

  return fresh.map((message) => {
    const before = byId.get(message.id);

    return before && sameAs(before, message) ? before : message;
  });
}

function sameAs(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
