'use client';

import { createContext, useContext, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { Fold } from '@/components/ui/stepper';
import type { AgentPause } from '@/lib/agent-settings';
import { cn } from '@/lib/utils';

import { type ResumeAgentResult, resumeAgentAction } from './actions';

/** The agent's pause as the Inbox shows it, shared by the banner and the header. */
export type PausedAgent = {
  /** `null` while the agent isn't paused, and from the moment "Resume" is pressed. */
  paused: AgentPause | null;
  resuming: boolean;
  /** Why the last "Resume" didn't work. */
  error: string | null;
  resume: () => void;
};

/** What "Resume" calls: the server action, unless a preview provides a stand-in for it. */
export const ResumeAgentContext = createContext<() => Promise<ResumeAgentResult>>(resumeAgentAction);

/**
 * Whether the agent is paused, and its "Resume". Resuming takes the banner away at once; when it fails, the
 * banner comes back and says why.
 */
export function usePausedAgent(paused: AgentPause | null): PausedAgent {
  const resume = useContext(ResumeAgentContext);
  // What the server said last: the page's pause, or none once a resume went through before the page caught up.
  const [saved, setSaved] = useState(paused);
  const [syncedPause, setSyncedPause] = useState(paused);
  if (paused !== syncedPause) {
    setSyncedPause(paused);
    setSaved(paused);
  }

  const [shown, hide] = useOptimistic(saved, () => null);
  const [resuming, startResume] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return {
    paused: shown,
    resuming,
    error,
    resume() {
      setError(null);
      startResume(async () => {
        hide(null);
        const result = await resume().catch(
          (): ResumeAgentResult => ({ ok: false, error: 'We couldn’t resume the agent. Try again in a moment.' })
        );

        if (result.ok) {
          setSaved(null);
        } else {
          setError(result.error);
        }
      });
    },
  };
}

/**
 * The amber banner above the Inbox header while the agent is paused (`3 · Paused`). It folds in and out
 * with the pause; folded, it gives back the gap above the header.
 */
export function PausedBanner({ agent }: { agent: PausedAgent }) {
  return (
    <Fold open={Boolean(agent.paused)} closedClassName="-mb-4">
      <section
        aria-label="The agent is paused"
        className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/7 py-3 pr-3 pl-4"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[13px] leading-4.5 font-medium text-foreground">The agent is paused</h2>
          <p className="text-xs leading-4 text-secondary">The agent can’t receive messages or send until you resume.</p>
          {agent.error && (
            <p role="alert" className="animate-overlay-in text-xs leading-4 text-danger motion-reduce:animate-none">
              {agent.error}
            </p>
          )}
        </div>
        <Button className={SMALL_BUTTON} pending={agent.resuming} onClick={agent.resume}>
          Resume
        </Button>
      </section>
    </Fold>
  );
}

/**
 * "● paused by you 12m ago" in the Inbox header, left of Refresh. It opens and fades in sideways when the
 * agent is paused, and closes again when it's resumed, giving back the gap next to it.
 */
export function PausedStatus({ agent, renderedAt }: { agent: PausedAgent; renderedAt: string }) {
  // The last pause stays in place while the status closes.
  const [lastPause, setLastPause] = useState(agent.paused);
  if (agent.paused && agent.paused !== lastPause) {
    setLastPause(agent.paused);
  }

  const open = Boolean(agent.paused);

  return (
    <span
      aria-hidden={!open || undefined}
      className={cn(
        'grid transition-[grid-template-columns,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-cols-[1fr] opacity-100' : '-mr-3 grid-cols-[0fr] opacity-0'
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
        {lastPause && (
          <span className="font-mono text-[11px] leading-4 text-secondary">
            paused by you <PausedAgo iso={lastPause.at} renderedAt={renderedAt} />
          </span>
        )}
      </span>
    </span>
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const subscribeToNothing = () => () => {};

/**
 * "12m ago", "3h ago", "2d ago". The server counts from when it rendered the page and the browser from now,
 * so the first render in the browser says what the server did, as the thread list's times do.
 */
function PausedAgo({ iso, renderedAt }: { iso: string; renderedAt: string }) {
  const inBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const at = Date.parse(iso);
  if (Number.isNaN(at)) {
    return null;
  }

  const ago = Math.max(0, (inBrowser ? Date.now() : Date.parse(renderedAt)) - at);

  return <time dateTime={iso}>{describeAgo(ago)}</time>;
}

function describeAgo(ms: number): string {
  if (ms < MINUTE) return 'just now';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ago`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h ago`;

  return `${Math.floor(ms / DAY)}d ago`;
}
