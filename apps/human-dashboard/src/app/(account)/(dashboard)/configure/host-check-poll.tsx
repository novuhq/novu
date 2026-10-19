'use client';

import { useEffect, useState } from 'react';

import { StatusPoll } from '@/components/ui/status-poll';
import { hostLiveness, NEVER_CHECKED } from '@/lib/host-status';

import { readHostCheckAction } from './actions';

/** How often a page asks whether a host checked the inbox, while none counts as connected. */
const HOST_POLL_MS = 10_000;

/** How often a page reads the last check again while a host counts as connected. */
const LAST_CHECK_POLL_MS = 60_000;

/**
 * Keeps a page in step with the agent's host while none counts as connected: the page reloads once a host
 * checks the inbox, and its status then moves on to "connected". Renders nothing.
 */
export function HostCheckPoll({ lastCheckedAt }: { lastCheckedAt: string | null }) {
  return <StatusPoll status={lastCheckedAt ?? NEVER_CHECKED} read={readHostCheckAction} everyMs={HOST_POLL_MS} />;
}

/**
 * When a host last checked the inbox, kept true while the page stays open. It starts as the page rendered
 * it; while a host counts as connected it's read again once a minute and whenever the operator comes back
 * to the tab, without reloading the page. "checked 2m ago" then stays right for a host that keeps checking,
 * and such a host doesn't look gone once the page has been open for a day. `HostCheckPoll` takes over
 * while none counts as connected.
 */
export function useLastHostCheck(rendered: string | null, now: number): string | null {
  const [latest, setLatest] = useState(rendered);
  // A reload brings the server's value, which then counts from scratch.
  const [synced, setSynced] = useState(rendered);
  if (rendered !== synced) {
    setSynced(rendered);
    setLatest(rendered);
  }

  const live = hostLiveness(latest, now) === 'live';

  useEffect(() => {
    if (!live) {
      return;
    }

    let stopped = false;

    const read = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const value = await readHostCheckAction().catch(() => null);
      if (!stopped && value && value !== NEVER_CHECKED) {
        setLatest((current) => (current && Date.parse(current) >= Date.parse(value) ? current : value));
      }
    };

    const interval = window.setInterval(read, LAST_CHECK_POLL_MS);
    window.addEventListener('focus', read);
    document.addEventListener('visibilitychange', read);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', read);
      document.removeEventListener('visibilitychange', read);
    };
  }, [live]);

  return latest;
}
