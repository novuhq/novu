'use client';

import { useCallback, useEffect, useRef } from 'react';

import { findNewHost, type HostStatus } from '@/lib/host-status';
import type { HostVia } from '@/lib/onboarding';

/**
 * Tells a host that comes in while a drawer is open (`findNewHost`). The host status is read when `active`
 * turns on; `check` reads it again and compares. Should the first read fail, the first `check` that gets an
 * answer takes its place, so a host is only ever told against a status that was read.
 */
export function useHostBaseline(readHosts: () => Promise<HostStatus | null>, active: boolean) {
  const baseline = useRef<HostStatus | null>(null);

  useEffect(() => {
    baseline.current = null;
    if (!active) {
      return;
    }

    let stale = false;
    readHosts()
      .then((status) => {
        if (!stale && !baseline.current) {
          baseline.current = status;
        }
      })
      .catch(() => {});

    return () => {
      stale = true;
    };
  }, [active, readHosts]);

  /** The way a new host came in since the drawer opened, or `null`. */
  const check = useCallback(async (): Promise<HostVia | null> => {
    const status = await readHosts().catch(() => null);
    if (!status) {
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
