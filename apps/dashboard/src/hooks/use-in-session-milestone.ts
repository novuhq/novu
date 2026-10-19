import { useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'agent-milestone-confetti:';

function hasPersistedCelebration(persistKey: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${persistKey}`) === '1';
  } catch {
    return false;
  }
}

function persistCelebration(persistKey: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${persistKey}`, '1');
  } catch {
    // ignore quota / private mode
  }
}

type UseInSessionMilestoneOptions = {
  /** Wait until async milestone state is settled before capturing the baseline. */
  ready?: boolean;
  /** When set, confetti fires at most once per browser for this milestone. */
  persistKey?: string;
};

/**
 * True exactly once when `completed` transitions false → true after `ready`, and never again on
 * reload (persisted) or when already complete on first settled load.
 */
export function useInSessionMilestone(
  completed: boolean,
  { ready = true, persistKey }: UseInSessionMilestoneOptions = {}
): boolean {
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const baselineCapturedRef = useRef(false);
  const baselineCompletedRef = useRef(false);
  const hasCelebratedRef = useRef(persistKey ? hasPersistedCelebration(persistKey) : false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (hasCelebratedRef.current) {
      baselineCapturedRef.current = true;
      baselineCompletedRef.current = true;

      return;
    }

    if (!baselineCapturedRef.current) {
      baselineCapturedRef.current = true;
      baselineCompletedRef.current = completed;

      if (completed) {
        if (persistKey) {
          persistCelebration(persistKey);
          hasCelebratedRef.current = true;
        }
      }

      return;
    }

    if (completed && !baselineCompletedRef.current) {
      baselineCompletedRef.current = true;

      if (persistKey) {
        persistCelebration(persistKey);
        hasCelebratedRef.current = true;
      }

      setShouldCelebrate(true);
    }
  }, [ready, completed, persistKey]);

  return shouldCelebrate;
}
