import type { AgentHandlerContext, AgentHistoryEntry, AgentNotification } from './agent.types';

/** Passing history directly skips notification injection. */
export type AgentTranscriptSource = AgentHistoryEntry[] | Pick<AgentHandlerContext, 'history' | 'notification'>;

export function resolveTranscriptSource(source: AgentTranscriptSource): {
  history: AgentHistoryEntry[];
  notification: AgentNotification | null;
} {
  if (Array.isArray(source)) {
    return { history: source, notification: null };
  }

  return { history: source.history, notification: source.notification ?? null };
}
