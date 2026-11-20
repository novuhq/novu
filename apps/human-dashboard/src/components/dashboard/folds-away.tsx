'use client';

import { createContext, type ReactNode, useContext, useTransition } from 'react';

import { cn } from '@/lib/utils';

const SendAwayContext = createContext<(() => void) | null>(null);

type FoldsAwayProps = {
  /** Sends the section away for good. A server action: the page comes back without the section. */
  action: () => Promise<void>;
  children: ReactNode;
};

/**
 * A section of a dashboard page that the operator can send away, with a `FoldAwayButton` inside it. It
 * folds up and fades out the moment they do, while the server is told, and what is below slides up into
 * its place. Should the server not get the message, the section unfolds again.
 */
export function FoldsAway({ action, children }: FoldsAwayProps) {
  const [leaving, startLeaving] = useTransition();

  return (
    <SendAwayContext value={() => startLeaving(action)}>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
          // The pages keep their sections 20px apart; a folded one gives that back as well.
          leaving ? '-mb-5 grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </SendAwayContext>
  );
}

/** The button that sends the `FoldsAway` section around it away. */
export function FoldAwayButton({ className, children }: { className?: string; children: ReactNode }) {
  const sendAway = useContext(SendAwayContext);

  return (
    <button type="button" onClick={() => sendAway?.()} className={className}>
      {children}
    </button>
  );
}
