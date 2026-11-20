'use client';

import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react';

/**
 * - `ago`: how long ago, as the thread list says it: "2m", "3h", "Yesterday", "Mon", "Oct 1";
 * - `clock`: "10:02";
 * - `stamp`: the clock for today, with the day before it otherwise: "Oct 9, 10:02";
 * - `seconds`: the same to the second: "10:02:14";
 * - `date-time`: always with the day.
 */
export type InboxTimeFormat = 'ago' | 'clock' | 'seconds' | 'stamp' | 'date-time';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** When the server rendered the page: what "now" is until the browser takes over. */
const RenderedAt = createContext<string | null>(null);

export function InboxClock({ renderedAt, children }: { renderedAt: string; children: ReactNode }) {
  return <RenderedAt value={renderedAt}>{children}</RenderedAt>;
}

const subscribeToNothing = () => () => {};

/**
 * A time in a thread. The server doesn't know the operator's time zone, so it renders UTC as of the
 * moment it rendered, and the browser swaps in the local time once the page is live, as `ShortDate` does.
 */
export function InboxTime({ iso, format, className }: { iso: string; format: InboxTimeFormat; className?: string }) {
  const renderedAt = useContext(RenderedAt);
  const inBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = inBrowser || !renderedAt ? new Date() : new Date(renderedAt);
  const timeZone = inBrowser ? undefined : 'UTC';

  return (
    <time dateTime={iso} className={className}>
      {formatInboxTime(date, format, now, timeZone)}
    </time>
  );
}

export function formatInboxTime(date: Date, format: InboxTimeFormat, now: Date, timeZone?: string): string {
  switch (format) {
    case 'ago':
      return formatAgo(date, now, timeZone);
    case 'clock':
      return formatClock(date, timeZone);
    case 'stamp':
    case 'seconds': {
      const clock = formatClock(date, timeZone, format === 'seconds');

      return dayOf(date, timeZone) === dayOf(now, timeZone) ? clock : `${formatDay(date, now, timeZone)}, ${clock}`;
    }
    default:
      return `${formatDay(date, now, timeZone)}, ${formatClock(date, timeZone)}`;
  }
}

function formatAgo(date: Date, now: Date, timeZone?: string): string {
  const ago = Math.max(0, now.getTime() - date.getTime());

  if (ago < MINUTE) {
    return 'now';
  }

  if (ago < HOUR) {
    return `${Math.floor(ago / MINUTE)}m`;
  }

  if (dayOf(date, timeZone) === dayOf(now, timeZone)) {
    return `${Math.floor(ago / HOUR)}h`;
  }

  if (dayOf(date, timeZone) === dayOf(new Date(now.getTime() - DAY), timeZone)) {
    return 'Yesterday';
  }

  if (ago < 6 * DAY) {
    return date.toLocaleDateString('en-US', { weekday: 'short', timeZone });
  }

  return formatDay(date, now, timeZone);
}

/** "Oct 1", with the year once it isn't this year's. */
function formatDay(date: Date, now: Date, timeZone?: string): string {
  const sameYear = yearOf(date, timeZone) === yearOf(now, timeZone);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone,
  });
}

/** On a 24-hour clock, as the design writes it. */
function formatClock(date: Date, timeZone?: string, seconds = false): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
    timeZone,
  });
}

function dayOf(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-CA', { timeZone });
}

function yearOf(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', timeZone });
}
