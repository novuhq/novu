'use client';

import { useEffect, useState } from 'react';

/** Seconds left before `until`, counted down once a second so a button can say when it frees up. */
export function useCooldownSeconds(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until || until <= Date.now()) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [until]);

  if (!until) {
    return 0;
  }

  return Math.max(0, Math.ceil((until - now) / 1000));
}
