import type { InboxSender } from './inbox';

/** A human email that arrived after the agent was created, as the test step shows it. */
export type InboundEmail = {
  at: string;
  from: string;
  subject: string;
};

/** The bits of a thread the choice needs. The list is newest activity first. */
export type InboundEmailThread = {
  from: string;
  fromAddress?: string;
  subject: string;
  preview: string;
  lastMessage: { at: string; from: InboxSender } | null;
  lastActivityAt: string;
};

/** Whether the thread moved after `sinceMs`. A list newest-first can stop at the first one that did not. */
export function activityIsAfter(lastActivityAt: string, sinceMs: number): boolean {
  return Date.parse(lastActivityAt) > sinceMs;
}

/**
 * The newest human email whose latest message arrived after `sinceMs`.
 * Threads whose latest message is not from a person are skipped: a later look inside the thread can still
 * find one. Mail at or before `sinceMs` is left out, and so is everything older than that in the list.
 */
export function newestInboundEmail(threads: readonly InboundEmailThread[], sinceMs: number): InboundEmail | null {
  if (!Number.isFinite(sinceMs)) {
    return null;
  }

  for (const thread of threads) {
    if (!activityIsAfter(thread.lastActivityAt, sinceMs)) {
      break;
    }

    const at = humanMessageAfter(thread.lastMessage, sinceMs);
    if (!at) {
      continue;
    }

    return inboundEmailFrom(thread, at);
  }

  return null;
}

/** When `message` is from a person and newer than `sinceMs`. */
export function humanMessageAfter(
  message: { from: InboxSender; at: string } | null | undefined,
  sinceMs: number
): string | null {
  if (!message || message.from !== 'human') {
    return null;
  }

  const at = Date.parse(message.at);

  return Number.isFinite(at) && at > sinceMs ? message.at : null;
}

/** The newest human message after `sinceMs`. Messages may be in any order. */
export function latestHumanMessageAt(
  messages: readonly { from: InboxSender; at: string }[],
  sinceMs: number
): string | null {
  let latest: string | null = null;

  for (const message of messages) {
    const at = humanMessageAfter(message, sinceMs);
    if (!at || (latest && Date.parse(at) <= Date.parse(latest))) {
      continue;
    }

    latest = at;
  }

  return latest;
}

/** Who sent the thread, and what it is about. The address and the preview stand in when a label is missing. */
export function inboundEmailFrom(
  thread: Pick<InboundEmailThread, 'from' | 'fromAddress' | 'subject' | 'preview'>,
  at: string
): InboundEmail {
  return {
    at,
    from: thread.from.trim() || thread.fromAddress?.trim() || '',
    subject: thread.subject.trim() || thread.preview.trim() || '',
  };
}

/** The later of the two, or whichever one is present. */
export function preferNewerInbound(current: InboundEmail | null, next: InboundEmail | null): InboundEmail | null {
  if (!next) {
    return current;
  }

  if (!current || Date.parse(next.at) > Date.parse(current.at)) {
    return next;
  }

  return current;
}
