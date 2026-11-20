'use client';

import { useNow } from '@/hooks/use-now';
import { asOf, fromNow, type MessageUsage, NEARLY_USED_UP, usedUpWindow } from '@/lib/message-usage';
import { cn } from '@/lib/utils';

type MessageUsageProps = {
  usage: MessageUsage;
  /** When the server rendered the page, so the numbers start out as the server drew them. */
  renderedAt: string;
};

/**
 * "12 of 50 messages today" over a meter of the day's messages, with the month's under it: how close the account's
 * agents are to the limit. A window that started over since the page loaded reads as unused.
 */
export function MessageUsageMeter({ usage, renderedAt, className }: MessageUsageProps & { className?: string }) {
  const now = useNow(renderedAt);
  if (!usage.daily) {
    return null;
  }

  const daily = asOf(usage.daily, now);
  const monthly = usage.monthly && asOf(usage.monthly, now);
  const share = Math.min(1, daily.used / daily.limit);

  return (
    <div className={cn('flex w-48 flex-col gap-1.5', className)}>
      <p className="text-xs leading-4 text-secondary">
        <span className="font-mono text-foreground">{daily.used}</span> of {daily.limit} messages today
      </p>
      {/* The words above say what the bar shows. */}
      <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-surface">
        <span
          className={cn(
            'block h-full rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none',
            share >= NEARLY_USED_UP ? 'bg-warning' : 'bg-default'
          )}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      {monthly && (
        <p className="text-[11px] leading-3.5 text-muted">
          {monthly.used} of {monthly.limit} this month
        </p>
      )}
    </div>
  );
}

/**
 * The line across the top of Configure and the Inbox once the account's agents have used every message of the day
 * or the month: their replies don't arrive until the limit resets, and it says when. It goes once the limit has.
 */
export function MessageLimitBanner({ handle, usage, renderedAt }: MessageUsageProps & { handle: string }) {
  const now = useNow(renderedAt);
  const usedUp = usedUpWindow(usage, now);
  if (!usedUp) {
    return null;
  }

  const { cap, window } = usedUp;

  return (
    <section className="flex animate-rise-in flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-warning/30 bg-warning/6 px-3.5 py-2.5 text-[13px] leading-4.5 motion-reduce:animate-none">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
      <h2 className="font-medium text-foreground">
        {handle} reached {cap === 'daily' ? 'today’s' : 'this month’s'} limit of {window.limit} messages.
      </h2>
      <p className="text-secondary">
        Its replies won’t arrive until the limit resets, {fromNow(window.resetsAt, now)}.
      </p>
    </section>
  );
}
