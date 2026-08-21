import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEventEnvelope,
  isAgentEventEnvelope,
} from '@novu/agent-event-protocol';
import type { AgentConversationError } from './agent-message.types';

function acceptEnvelope(value: unknown): AgentEventEnvelope | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const version = (value as Record<string, unknown>).version;
  if (typeof version === 'number' && version !== AGENT_EVENT_PROTOCOL_VERSION) {
    return undefined;
  }

  return isAgentEventEnvelope(value) ? value : undefined;
}

export type ValidateHistoryPageResult =
  | { ok: true; events: AgentEventEnvelope[]; olderCursor: string | null }
  | { ok: false; error: AgentConversationError };

export function validateHistoryPageResponse(value: unknown): ValidateHistoryPageResult {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: { message: 'Invalid history response', code: 'protocol.history' } };
  }

  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.events)) {
    return { ok: false, error: { message: 'Invalid history response', code: 'protocol.history' } };
  }

  const events: AgentEventEnvelope[] = [];
  for (const item of candidate.events) {
    const envelope = acceptEnvelope(item);
    if (envelope) {
      events.push(envelope);
    }
  }

  const olderCursor =
    candidate.olderCursor === null || typeof candidate.olderCursor === 'string' ? candidate.olderCursor : null;

  return { ok: true, events, olderCursor };
}
