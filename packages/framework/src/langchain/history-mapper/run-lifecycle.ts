import type { AgentHistoryEntry } from '../../resources/agent/agent.types';

const TYPE_RUN_FINISH = 'run_finish';

/** The finish of a run the user stopped (`richContent.lifecycle.outcome === 'aborted'`). */
export function isAbortedRunFinish(entry: AgentHistoryEntry): boolean {
  const lifecycle = entry.richContent?.lifecycle;

  return (
    entry.type === TYPE_RUN_FINISH &&
    typeof lifecycle === 'object' &&
    lifecycle !== null &&
    (lifecycle as { outcome?: unknown }).outcome === 'aborted'
  );
}
