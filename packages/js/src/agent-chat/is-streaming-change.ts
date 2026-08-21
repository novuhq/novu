import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type { AgentConversationError } from './agent-message.types';
import type { AgentChatChange } from './types';

const STREAMING_EVENT_TYPES = new Set([
  'run-start',
  'message-start',
  'message-delta',
  'thinking-start',
  'thinking-delta',
  'tool-use-start',
  'tool-use-delta',
  'channel.typing',
  'step-start',
  'step-end',
]);

export function isStreamingEnvelope(envelope: AgentEventEnvelope): boolean {
  return STREAMING_EVENT_TYPES.has(envelope.event.type);
}

export function getLiveEnvelopes(change: AgentChatChange): AgentEventEnvelope[] {
  if (change.kind !== 'live') {
    return [];
  }

  if (change.batchedEnvelopes && change.batchedEnvelopes.length > 0) {
    return change.batchedEnvelopes;
  }

  return [change.envelope];
}

/**
 * True when a fold only advances in-flight streaming and can be throttled.
 * Terminal folds (run finish, error, sent/failed, history) return false.
 */
export function isStreamingChange(
  change: AgentChatChange,
  snapshot: { isRunning: boolean; error?: AgentConversationError }
): boolean {
  if (change.kind === 'history' || change.kind === 'local') {
    return false;
  }

  if (snapshot.error) {
    return false;
  }

  const envelopes = getLiveEnvelopes(change);
  if (envelopes.length === 0) {
    return false;
  }

  if (envelopes.some((envelope) => !isStreamingEnvelope(envelope))) {
    return false;
  }

  return snapshot.isRunning;
}
