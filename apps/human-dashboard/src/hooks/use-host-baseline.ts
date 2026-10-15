'use client';

import { useCallback, useEffect, useRef } from 'react';

import { findNewHost, type HostStatus } from '@/lib/host-status';
import type { HostVia } from '@/lib/onboarding';

/**
 * Tells a host that comes in while a drawer is open (`findNewHost`). The host status is read when `active`
 * turns on; `check` reads it again and compares. Should the first read fail, the first `check` that gets an
 * answer takes its place, so a host is only ever told against a status that was read.
 *
 * Each opening stands on its own: an answer to a read that set out during an earlier one, such as a slow
 * `check` still on its way when the drawer closed, is dropped instead of becoming the new baseline.
 */
export function useHostBaseline(readHosts: () => Promise<HostStatus | null>, active: boolean) {
  const baseline = useRef<HostStatus | null>(null);
  const opening = useRef(0);

  useEffect(() => {
    const id = ++opening.current;
    baseline.current = null;
    if (!active) {
      return;
    }

    readHosts()
      .then((status) => {
        if (id === opening.current && !baseline.current) {
          baseline.current = status;
        }
      })
      .catch(() => {});
  }, [active, readHosts]);

  /** The way a new host came in since the drawer opened, or `null`. */
  const check = useCallback(async (): Promise<HostVia | null> => {
    const id = opening.current;
    const status = await readHosts().catch(() => null);
    if (!status || id !== opening.current) {
      return null;
    }

    if (!baseline.current) {
      baseline.current = status;

      return null;
    }

    return findNewHost(baseline.current, status);
  }, [readHosts]);

  /** Starts comparing from the status as it is now, once a host that came in was dealt with elsewhere. */
  const reset = useCallback(() => {
    baseline.current = null;
  }, []);

  return { check, reset };
}
