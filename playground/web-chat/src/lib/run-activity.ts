'use client';

import type { AgentEventEnvelope } from '@novu/react';
import { useCallback, useState } from 'react';

const RUN_LIFECYCLE = ['run-start', 'run-finish', 'run-error'] as const;

export type RunLifecycleType = (typeof RUN_LIFECYCLE)[number];

export type RunTransition = { type: RunLifecycleType; at: number };

/**
 * `restored` means the run was already in flight when the hook mounted: history replay
 * carried the run lifecycle, so `isRunning` is true without a live `run-start` on this mount.
 */
export type RunOrigin = 'idle' | 'live' | 'restored';

function isRunLifecycle(type: string): type is RunLifecycleType {
  return (RUN_LIFECYCLE as readonly string[]).includes(type);
}

export function useRunActivity(): {
  lastTransition?: RunTransition;
  onEvent: (envelope: AgentEventEnvelope) => void;
} {
  const [lastTransition, setLastTransition] = useState<RunTransition>();

  const onEvent = useCallback((envelope: AgentEventEnvelope) => {
    const { type } = envelope.event;
    if (!isRunLifecycle(type)) return;
    setLastTransition({ type, at: Date.now() });
  }, []);

  return { lastTransition, onEvent };
}

export function runOrigin(isRunning: boolean, lastTransition?: RunTransition): RunOrigin {
  if (!isRunning) return 'idle';

  return lastTransition?.type === 'run-start' ? 'live' : 'restored';
}
