'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { HeldCode } from '@/hooks/use-connect-code';
import type { ConnectApi } from '@/lib/host-status';

/** A code that was swapped out is asked about until this long after it ran out: for the clocks, and a request on its way. */
const AFTER_DEADLINE_MS = 20_000;

/** What `check` found: a host used one of the codes, or the one on screen has to be swapped for a new one. */
export type CodeWatch = 'used' | 'renew' | null;

/**
 * Tells when a host connected with a code a drawer showed, by asking the API what became of it
 * (`GET /v1/human/agent/connect-codes/:code`). That is how another host on a way that is already in use
 * shows: to `useHostBaseline` it looks like the first one checking in.
 *
 * It asks about the code on screen (`shown`), and about each one that code replaced in this opening for as
 * long as that one still works: a host may have copied it just before the swap. `check` answers `used` once
 * any of them was used; `renew` when the one on screen ran out, or the API doesn't know it, so the drawer
 * gets a fresh one; and `null` otherwise, a request that failed included.
 *
 * Each opening (`active`) stands on its own: a code from an earlier one isn't asked about, and an answer to
 * a request that set out during an earlier one is dropped.
 */
export function useCodeWatch(readCodeStatus: ConnectApi['readCodeStatus'], shown: HeldCode | null, active: boolean) {
  // The codes this opening showed that may still be used. The one on screen is taken in by `check`, once
  // the opening has settled, so a code still on screen from the last opening is never among them.
  const watched = useRef<HeldCode[]>([]);
  const onScreen = useRef<HeldCode | null>(null);
  const opening = useRef(0);

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

  const check = useCallback(async (): Promise<CodeWatch> => {
    const id = opening.current;
    const current = onScreen.current;
    const now = Date.now();
    const codes = watched.current.filter(
      ({ code, deadline }) => code !== current?.code && now < deadline + AFTER_DEADLINE_MS
    );
    if (current) {
      codes.push(current);
    }
    watched.current = codes;

    const statuses = await Promise.all(codes.map(({ handle, code }) => readCodeStatus(handle, code).catch(() => null)));
    if (id !== opening.current) {
      return null;
    }

    if (statuses.includes('used')) {
      return 'used';
    }

    // Only while it is still the one on screen: a new one may have taken its place in the meantime.
    const status = current ? statuses[statuses.length - 1] : null;
    const gone = status === 'expired' || status === 'unknown';

    return gone && current?.code === onScreen.current?.code ? 'renew' : null;
  }, [readCodeStatus]);

  return { check };
}
