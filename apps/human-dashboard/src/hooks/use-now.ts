'use client';

import { useEffect, useState } from 'react';

/** How often words like "2m ago" move on. */
const TICK_MS = 30_000;

/**
 * The time now, for words like "2m ago" that go stale while the page is open. It starts at `renderedAt`,
 * when the server rendered the page, so the browser's first render says what the server's did; from
 * then on it's the browser's clock, moved on every half a minute.
 */
export function useNow(renderedAt: string): number {
  const [now, setNow] = useState(() => Date.parse(renderedAt));

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  return now;
}
