'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { HeldCode } from '@/hooks/use-connect-code';
import type { ConnectApi } from '@/lib/host-status';

/** A code is asked about until it got an answer this long after it ran out: for the clocks, and a request on its way. */
const AFTER_DEADLINE_MS = 20_000;

/** What `check` found: a host used one of the codes, or the one on screen has to be swapped for a new one. */
export type CodeWatch = 'used' | 'renew' | null;

/** A code this opening showed, and whether the API answered about it once it had run out: then it's done. */
type Watched = { held: HeldCode; settled: boolean };

/**
 * Tells when a host connected with a code a drawer showed, by asking the API what became of it
 * (`POST /v1/human/agent/connect-codes/status`). That is how another host on a way that is already in use
 * shows: to `useHostBaseline` it looks like the first one checking in.
 *
 * Every code the drawer shows is watched from the moment it shows, so one swapped out before any check
 * still counts. Each is asked about until it got an answer after it ran out: a host may have copied it just
 * before the swap, or used it while the drawer asked nothing (its tab out of sight, or a chat app's drawer
 * over it), so the first check after that still sees it. `check` answers `used` once any of them was used;
 * `renew` when the one on screen ran out, or the API doesn't know it, so the drawer gets a fresh one; and
 * `null` otherwise, a request that failed included.
 *
 * Each opening (`active`) stands on its own: a code still on screen from an earlier one isn't watched, and
 * an answer to a request that set out during an earlier one is dropped.
 */
export function useCodeWatch(readCodeStatus: ConnectApi['readCodeStatus'], shown: HeldCode | null, active: boolean) {
  const watched = useRef<Watched[]>([]);
  const onScreen = useRef<HeldCode | null>(null);
  const opening = useRef(0);
  // Every code ever shown: one that was on screen before this opening began is the last opening's.
  const seen = useRef(new WeakSet<HeldCode>());

  useEffect(() => {
    onScreen.current = active ? shown : null;
  });

  // Each opening starts over, and a closed drawer asks about nothing.
  useEffect(() => {
    opening.current++;
    watched.current = [];
    if (!active) {
      onScreen.current = null;
    }
  }, [active]);

  // After the reset above: a code joins this opening as soon as it shows.
  useEffect(() => {
    if (!active || !shown || seen.current.has(shown)) {
      return;
    }

    seen.current.add(shown);
    watched.current.push({ held: shown, settled: false });
  }, [active, shown]);

  const check = useCallback(async (): Promise<CodeWatch> => {
    const id = opening.current;
    const current = onScreen.current;
    const now = Date.now();
    // Done with are the codes the API answered about once they had run out; never the one on screen.
    watched.current = watched.current.filter((entry) => !entry.settled || entry.held === current);
    const asked = [...watched.current];

    const statuses = await Promise.all(
      asked.map(({ held }) => readCodeStatus(held.handle, held.code).catch(() => null))
    );
    if (id !== opening.current) {
      return null;
    }

    asked.forEach((entry, index) => {
      if (statuses[index] !== null && now >= entry.held.deadline + AFTER_DEADLINE_MS) {
        entry.settled = true;
      }
    });

    if (statuses.includes('used')) {
      return 'used';
    }

    // Only while it is still the one on screen: a new one may have taken its place in the meantime.
    const status = statuses[asked.findIndex((entry) => entry.held === current)];
    const gone = status === 'expired' || status === 'unknown';

    return gone && current !== null && current === onScreen.current ? 'renew' : null;
  }, [readCodeStatus]);

  return { check };
}
