'use client';

import { Bot, RefreshCw, TriangleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Tooltip } from '@/components/ui/tooltip';
import type { ChannelVia } from '@/lib/human-channels-api';
import { cn } from '@/lib/utils';

/** What the Telegram and Slack setup drawers have in common. */

/** Two lines in one grid cell: the one that's out fades and slides a little while the other comes in. */
export const SWAP_LAYER =
  'col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none';

/** The channel drawers keep the close button level with the title, and 14px above and below "Done". */
export const DRAWER_HEADER = '[&>button]:m-0';
export const DRAWER_FOOTER = 'py-3.5';

/**
 * The design's focused input in these drawers: the orange border with a faint orange ring inside it.
 * Inside, because the input's border is an inset ring too: 3px of tint under the 1px border leaves 2px.
 */
export const FOCUSED_INPUT = 'focus-visible:shadow-[inset_0_0_0_3px_rgb(255_92_48/0.22)]';

const POLL_INTERVAL_MS = 2500;
/** After this long a drawer stops asking on its own, so a forgotten tab doesn't poll forever. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type ConnectionPoll<Connection> = {
  /** Whether the drawer is on the step that waits for the operator to finish in the other app. */
  waiting: boolean;
  /** Asks the API whether that happened. `null` means not yet; a failed call counts as not yet too. */
  check: () => Promise<Connection | null>;
  onConnected: (connection: Connection) => void;
  /**
   * How long it asks before it gives up: ten minutes by default. `null` asks for as long as `waiting` stays
   * on, for a drawer that keeps what it waits on working, such as a code it renews.
   */
  giveUpAfterMs?: number | null;
};

/**
 * Asks every few seconds whether a channel got connected, while a drawer waits for it. It gives up after
 * ten minutes (`giveUpAfterMs`) and says so with `waitedTooLong`; `keepWaiting` starts it over. Leaving the
 * waiting step starts it over as well.
 */
export function useConnectionPoll<Connection>({
  waiting,
  check,
  onConnected,
  giveUpAfterMs = POLL_TIMEOUT_MS,
}: ConnectionPoll<Connection>) {
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
      if (giveUpAfterMs !== null && Date.now() - startedAt > giveUpAfterMs) {
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
  }, [waiting, waitedTooLong, giveUpAfterMs]);

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

/**
 * The card's border turns green towards its right end, where the dither is: the border is a gradient
 * painted under a solid background that stops at the padding.
 */
const CONNECTED_BORDER =
  'border border-transparent [background:linear-gradient(var(--color-background),var(--color-background))_padding-box,linear-gradient(90deg,var(--color-border)_55%,rgb(31_193_107/0.35))_border-box]';

/**
 * The card with the green dither that closes a drawer's list of steps once the channel works. The dither is
 * the design's `Deco/Callout dither` in green: its drawing, 403px wide, cut out of a green fill.
 */
export function ConnectedCard({ via, title, children }: ConnectedCardProps) {
  return (
    <li
      aria-live="polite"
      className={cn(
        'relative isolate flex animate-rise-in items-center gap-3.5 overflow-hidden rounded-[10px] px-4.5 py-4 motion-reduce:animate-none',
        CONNECTED_BORDER
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 -z-10 h-57.5 w-[403px] animate-breathe bg-success [mask-image:url(/illustrations/dither-callout.svg)] [mask-position:right_top] [mask-repeat:no-repeat] [mask-size:403px_230px] motion-reduce:animate-none"
      />
      <ChannelIcon via={via} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[13px] leading-4.5 font-medium text-foreground">{title}</p>
        <div className="text-xs leading-4 text-secondary">{children}</div>
      </div>
    </li>
  );
}

/**
 * The top of a channel's setup drawer: the prompt that has the operator's own agent do the setup with
 * them, and the line that leads on to the steps for doing it by hand.
 */
export function AgentPromptOption({ prompt }: { prompt: string }) {
  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-[10px] border border-border bg-subtle px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/14">
            <Bot className="size-3.5 text-accent" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] leading-4.5 font-medium text-foreground">Let your agent set this up</h3>
              <span className="rounded bg-accent/12 px-1.5 py-px font-mono text-[10px] leading-3.5 text-accent">
                fastest
              </span>
            </div>
            <p className="text-xs leading-4 text-secondary">Your agent runs the setup and tells you what to do.</p>
          </div>
          <CopyButton value={prompt} label="Copy prompt" variant="primary" className={SMALL_BUTTON}>
            Copy prompt
          </CopyButton>
        </div>
        <p className="rounded-md border border-border-strong bg-background px-2.5 py-2 font-mono text-[11px] leading-4 text-default">
          {prompt}
        </p>
      </section>
      <p className="flex items-center gap-2.5 font-mono text-[11px] leading-3.5 text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        or do it yourself
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </p>
    </>
  );
}

type RecheckButtonProps = {
  /** What it does, for the tooltip and screen readers. */
  label: string;
  onRecheck: () => Promise<void>;
};

/** The refresh button on a finished step: reads that part of the setup again, and turns while it does. */
export function RecheckButton({ label, onRecheck }: RecheckButtonProps) {
  const [checking, startChecking] = useTransition();

  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-busy={checking || undefined}
        disabled={checking}
        onClick={() => startChecking(onRecheck)}
        className={buttonClassName('ghost', 'text-foreground disabled:cursor-progress disabled:opacity-100')}
      >
        <RefreshCw aria-hidden="true" className={cn('size-4', checking && 'animate-spin motion-reduce:animate-none')} />
      </button>
    </Tooltip>
  );
}
