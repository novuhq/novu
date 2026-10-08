'use client';

import { useSyncExternalStore } from 'react';

type ShortDateProps = {
  iso: string;
  /** What to show for a date that is today: "Today" in a column, "today" inside a sentence. */
  todayLabel: string;
};

const subscribeToNothing = () => () => {};

/**
 * A date as "Oct 3". The server doesn't know the operator's time zone, so it renders the UTC day and
 * the browser swaps in the local one (and "Today") once the page is live.
 */
export function ShortDate({ iso, todayLabel }: ShortDateProps) {
  const inBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return <time dateTime={iso}>{inBrowser ? formatLocal(date, todayLabel) : format(date, 'UTC')}</time>;
}

function formatLocal(date: Date, todayLabel: string): string {
  return date.toDateString() === new Date().toDateString() ? todayLabel : format(date);
}

function format(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}
