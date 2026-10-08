'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { readAgentStatusAction } from './actions';

type AgentStatusPollProps = {
  /** How far the setup got when the page was rendered (`describeAgentStatus`). */
  status: string;
  /** How often to ask. */
  everyMs: number;
};

/**
 * Keeps the Agent page in step with a setup that happens in the operator's terminal. It asks the server
 * how far the setup got, every `everyMs` and whenever the operator comes back to the tab, and reloads
 * the page's data on a different answer. The page then animates to what changed. Renders nothing.
 */
export function AgentStatusPoll({ status, everyMs }: AgentStatusPollProps) {
  const router = useRouter();
  // The answer the page was last reloaded for, so one that can't be shown isn't reloaded over and over.
  const reloadedFor = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let asking = false;

    const check = async () => {
      if (asking || document.visibilityState !== 'visible') {
        return;
      }

      asking = true;
      try {
        const latest = await readAgentStatusAction();
        if (!stopped && latest !== status && latest !== reloadedFor.current) {
          reloadedFor.current = latest;
          router.refresh();
        }
      } catch {
        // A failed check is simply tried again on the next tick.
      } finally {
        asking = false;
      }
    };

    const interval = window.setInterval(check, everyMs);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [status, everyMs, router]);

  return null;
}
