'use client';

import { TriangleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ChannelVia } from '@/lib/human-channels-api';
import { cn } from '@/lib/utils';

/** What the Telegram and Slack setup drawers have in common. */

/** Two lines in one grid cell: the one that's out fades and slides a little while the other comes in. */
export const SWAP_LAYER =
  'col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none';

const POLL_INTERVAL_MS = 2500;
/** After this long a drawer stops asking on its own, so a forgotten tab doesn't poll forever. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type ConnectionPoll<Connection> = {
  /** Whether the drawer is on the step that waits for the operator to finish in the other app. */
  waiting: boolean;
  /** Asks the API whether that happened. `null` means not yet; a failed call counts as not yet too. */
  check: () => Promise<Connection | null>;
  onConnected: (connection: Connection) => void;
};

/**
 * Asks every few seconds whether a channel got connected, while a drawer waits for it. It gives up after
 * ten minutes and says so with `waitedTooLong`; `keepWaiting` starts it over. Leaving the waiting step
 * starts it over as well.
 */
export function useConnectionPoll<Connection>({ waiting, check, onConnected }: ConnectionPoll<Connection>) {
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  // The callbacks are new on every render; the timer below always calls the latest ones without restarting.
  const latest = useRef({ check, onConnected });

  useEffect(() => {
    latest.current = { check, onConnected };
  });

  useEffect(() => {
    if (!waiting) {
      setWaitedTooLong(false);
    }
  }, [waiting]);

  useEffect(() => {
    if (!waiting || waitedTooLong) {
      return;
    }

    let stale = false;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setWaitedTooLong(true);

        return;
      }

      const connection = await latest.current.check().catch(() => null);
      if (connection && !stale) {
        // Another answer may already be on its way; only the first one counts.
        stale = true;
        latest.current.onConnected(connection);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      stale = true;
      clearInterval(timer);
    };
  }, [waiting, waitedTooLong]);

  return { waitedTooLong, keepWaiting: () => setWaitedTooLong(false) };
}

type SetupCheckProps = {
  state: 'checking' | 'unavailable';
  /** The channel's name, as in "your Telegram setup". */
  channel: string;
  onRetry: () => void;
};

/** What a drawer shows instead of its steps while it reads the setup itself, and when that fails. */
export function SetupCheck({ state, channel, onRetry }: SetupCheckProps) {
  return (
    <div aria-live="polite" className="flex flex-col items-start gap-3 text-[13px] leading-4.5 text-secondary">
      {state === 'checking' ? (
        <p>Checking your setup…</p>
      ) : (
        <>
          <p>We couldn’t check your {channel} setup just now. Nothing was changed.</p>
          <Button variant="secondary" className={SMALL_BUTTON} onClick={onRetry}>
            Try again
          </Button>
        </>
      )}
    </div>
  );
}

/** What's wrong with a field of a step, with the warning mark in front. Goes in a `Field`'s `error`. */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-start gap-1.5">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
      {children}
    </span>
  );
}

/** The pulsing dot and "Waiting for…" line of a step that waits on something outside the page. */
export function WaitingLine({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p aria-live="polite" className={cn('flex items-center gap-2.5 pl-1 text-xs leading-4 text-secondary', className)}>
      <span
        aria-hidden="true"
        className="size-2 animate-pulse rounded-full bg-accent ring-4 ring-warning/45 motion-reduce:animate-none"
      />
      {children}
    </p>
  );
}

type ConnectedCardProps = {
  via: ChannelVia;
  title: string;
  /** The line under the title. */
  children: ReactNode;
};

/** The green card that closes a drawer's list of steps once the channel works. */
export function ConnectedCard({ via, title, children }: ConnectedCardProps) {
  return (
    <li>
      <Card
        glow
        aria-live="polite"
        className="flex animate-rise-in items-center gap-3 rounded-[10px] bg-background px-4.5 py-4 [--glow-color:var(--color-success)] motion-reduce:animate-none"
      >
        <ChannelIcon via={via} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm leading-5.25 font-medium text-foreground">{title}</p>
          <div className="text-xs leading-4 text-secondary">{children}</div>
        </div>
      </Card>
    </li>
  );
}
