import React from 'react';

/**
 * Returns the milliseconds elapsed since `startedAt` and re-renders the
 * caller on a fixed cadence (default 1 Hz) so live timers stay accurate
 * without spamming the Ink reconciler.
 *
 * The hook ticks via `setInterval` rather than `requestAnimationFrame`
 * because Ink renders to a TTY — sub-second updates aren't visible and
 * would only churn the reconciler / mouse-selection logic. Callers that
 * need a snappier read (e.g. the running pipeline row) can override the
 * interval but should keep it ≥ 250ms to stay friendly to terminals.
 */
export function useElapsed(startedAt: number | undefined, intervalMs = 1000): number {
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    if (startedAt === undefined) return;

    const tick = (): void => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);

    return () => clearInterval(id);
  }, [startedAt, intervalMs]);

  if (startedAt === undefined) return 0;

  return Math.max(0, now - startedAt);
}
