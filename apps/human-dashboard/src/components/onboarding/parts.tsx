'use client';

import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

const subscribeToNothing = () => () => {};

/** Whether this render happens in the browser, where the operator's own clock and time zone are known. */
function useInBrowser(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

type ClockTimeProps = {
  iso: string;
  /** "10:42:05" instead of "10:42", for the lines of a log. */
  seconds?: boolean;
};

/**
 * A time of day on a 24-hour clock. The server doesn't know the operator's time zone, so it renders UTC
 * and the browser swaps in the local time once the page is live.
 */
export function ClockTime({ iso, seconds = false }: ClockTimeProps) {
  const inBrowser = useInBrowser();
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (
    <time dateTime={iso}>
      {date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: seconds ? '2-digit' : undefined,
        timeZone: inBrowser ? undefined : 'UTC',
      })}
    </time>
  );
}

/** How long ago something happened, in the words of the agent's card: "just now", "5m ago", "on Oct 3". */
export function TimeAgo({ iso }: { iso?: string }) {
  const inBrowser = useInBrowser();
  const date = iso ? new Date(iso) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'just now';
  }

  // Before the page is live there is no "now" both sides agree on; a new agent is the usual case.
  return <time dateTime={date.toISOString()}>{inBrowser ? describeAge(date) : 'just now'}</time>;
}

function describeAge(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;

  return `on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

type RefreshProps = {
  /** Names what is shown. A new name is what brings it in again. */
  id: string;
  className?: string;
  children: ReactNode;
};

/**
 * Lets what it holds rise in each time `id` changes, so one state of a step turns into the next instead
 * of replacing it. It stays put when it first shows: then it comes in with the step it is part of.
 */
export function Refresh({ id, className, children }: RefreshProps) {
  const [first] = useState(id);
  const [changed, setChanged] = useState(false);
  if (!changed && id !== first) {
    setChanged(true);
  }

  return (
    <div key={id} className={cn(className, changed && 'animate-rise-in motion-reduce:animate-none')}>
      {children}
    </div>
  );
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_FRAME_MS = 90;

/** The terminal's spinner, one braille character wide. It stands still for anyone who prefers less motion. */
export function Spinner({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = setInterval(() => setFrame((current) => (current + 1) % SPINNER_FRAMES.length), SPINNER_FRAME_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <span aria-hidden="true" className={className}>
      {SPINNER_FRAMES[frame]}
    </span>
  );
}
