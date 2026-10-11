'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { readAgentStatusAction } from './actions';

/** How long a reload gets to show the new status before it's asked for once more. */
const RELOAD_AGAIN_AFTER_MS = 15_000;

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
  // The answer the page was last reloaded for, and when. An answer the page can't show isn't reloaded on
  // every tick, but a reload that failed gets another go after a while.
  const reloaded = useRef<{ status: string; at: number } | null>(null);

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
        const last = reloaded.current;
        const triedJustNow = last?.status === latest && Date.now() - last.at < RELOAD_AGAIN_AFTER_MS;
        if (!stopped && latest !== status && !triedJustNow) {
          reloaded.current = { status: latest, at: Date.now() };
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
