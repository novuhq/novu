import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEventEnvelope,
  isAgentEventEnvelope,
} from '@novu/agent-event-protocol';
import type { AgentConversationError } from './agent-message.types';

type AgentProtocolErrorCode = 'protocol.schema' | 'protocol.history';

function createProtocolError(message: string, code: AgentProtocolErrorCode): AgentConversationError {
  return { message, code };
}

export type ParseEnvelopeResult =
  | { ok: true; envelope: AgentEventEnvelope }
  | { ok: false; skip: true; reason: 'unknown-version' }
  | { ok: false; skip: true; reason: 'invalid-schema'; error: AgentConversationError };

export function parseAgentEventEnvelope(value: unknown): ParseEnvelopeResult {
  if (typeof value !== 'object' || value === null) {
    return {
      ok: false,
      skip: true,
      reason: 'invalid-schema',
      error: createProtocolError('Agent event envelope must be an object', 'protocol.schema'),
    };
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.version !== undefined && typeof candidate.version !== 'number') {
    return { ok: false, skip: true, reason: 'unknown-version' };
  }

  if (typeof candidate.version === 'number' && candidate.version !== AGENT_EVENT_PROTOCOL_VERSION) {
    return { ok: false, skip: true, reason: 'unknown-version' };
  }

  if (!isAgentEventEnvelope(value)) {
    return {
      ok: false,
      skip: true,
      reason: 'invalid-schema',
      error: createProtocolError('Agent event envelope failed schema validation', 'protocol.schema'),
    };
  }

  return { ok: true, envelope: value };
}

export type ValidateHistoryPageResult =
  | { ok: true; events: AgentEventEnvelope[]; olderCursor: string | null }
  | { ok: false; error: AgentConversationError };

export function validateHistoryPageResponse(value: unknown): ValidateHistoryPageResult {
  if (typeof value !== 'object' || value === null) {
    return {
      ok: false,
      error: createProtocolError('History response must be an object', 'protocol.history'),
    };
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.events)) {
    return {
      ok: false,
      error: createProtocolError('History response missing events array', 'protocol.history'),
    };
  }

  const olderCursor =
    candidate.olderCursor === null || typeof candidate.olderCursor === 'string' ? candidate.olderCursor : null;

  if (
    candidate.olderCursor !== undefined &&
    candidate.olderCursor !== null &&
    typeof candidate.olderCursor !== 'string'
  ) {
    return {
      ok: false,
      error: createProtocolError('History response olderCursor must be a string or null', 'protocol.history'),
    };
  }

  const events: AgentEventEnvelope[] = [];

  for (const item of candidate.events) {
    const parsed = parseAgentEventEnvelope(item);

    if (parsed.ok) {
      events.push(parsed.envelope);
      continue;
    }

    console.warn('[novu agent-chat] skipping history envelope:', parsed.reason);
  }

  return { ok: true, events, olderCursor };
}
