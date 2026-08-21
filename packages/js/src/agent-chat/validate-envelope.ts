import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEventEnvelope,
  isAgentEventEnvelope,
} from '@novu/agent-event-protocol';
import type { AgentConversationError, AgentConversationState } from './agent-message.types';
import { applyEnvelope } from './apply-envelope';

export type AgentProtocolErrorCode = 'protocol.schema' | 'protocol.ordering' | 'protocol.history';

export function createProtocolError(message: string, code: AgentProtocolErrorCode): AgentConversationError {
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

export type FoldValidationContext = {
  messageStreams: Set<string>;
  thinkingStreams: Set<string>;
  toolStreams: Set<string>;
};

export function createFoldValidationContext(): FoldValidationContext {
  return {
    messageStreams: new Set(),
    thinkingStreams: new Set(),
    toolStreams: new Set(),
  };
}

export function resetFoldValidationContext(ctx: FoldValidationContext): void {
  ctx.messageStreams.clear();
  ctx.thinkingStreams.clear();
  ctx.toolStreams.clear();
}

export type OrderingValidationResult = { ok: true } | { ok: false; error: AgentConversationError };

export function validateEnvelopeOrdering(
  ctx: FoldValidationContext,
  envelope: AgentEventEnvelope
): OrderingValidationResult {
  const { event } = envelope;

  switch (event.type) {
    case 'run-start':
      resetFoldValidationContext(ctx);

      return { ok: true };

    case 'run-finish':
    case 'run-error':
      resetFoldValidationContext(ctx);

      return { ok: true };

    case 'message-start':
      ctx.messageStreams.add(event.messageId);

      return { ok: true };

    case 'message-delta':
      if (!ctx.messageStreams.has(event.messageId)) {
        return {
          ok: false,
          error: createProtocolError(
            `message-delta for "${event.messageId}" without a prior message-start`,
            'protocol.ordering'
          ),
        };
      }

      return { ok: true };

    case 'message-end':
      if (!ctx.messageStreams.has(event.messageId)) {
        return {
          ok: false,
          error: createProtocolError(
            `message-end for "${event.messageId}" without a prior message-start`,
            'protocol.ordering'
          ),
        };
      }

      ctx.messageStreams.delete(event.messageId);

      return { ok: true };

    case 'message':
      ctx.messageStreams.delete(event.messageId);

      return { ok: true };

    case 'thinking-start':
      ctx.thinkingStreams.add(event.thinkingId);

      return { ok: true };

    case 'thinking-delta':
      if (!ctx.thinkingStreams.has(event.thinkingId)) {
        return {
          ok: false,
          error: createProtocolError(
            `thinking-delta for "${event.thinkingId}" without a prior thinking-start`,
            'protocol.ordering'
          ),
        };
      }

      return { ok: true };

    case 'thinking-end':
      if (!ctx.thinkingStreams.has(event.thinkingId)) {
        return {
          ok: false,
          error: createProtocolError(
            `thinking-end for "${event.thinkingId}" without a prior thinking-start`,
            'protocol.ordering'
          ),
        };
      }

      ctx.thinkingStreams.delete(event.thinkingId);

      return { ok: true };

    case 'tool-use-start':
      ctx.toolStreams.add(event.toolUseId);

      return { ok: true };

    case 'tool-use-delta':
      if (!ctx.toolStreams.has(event.toolUseId)) {
        return {
          ok: false,
          error: createProtocolError(
            `tool-use-delta for "${event.toolUseId}" without a prior tool-use-start`,
            'protocol.ordering'
          ),
        };
      }

      return { ok: true };

    case 'tool-use-done':
      if (!ctx.toolStreams.has(event.toolUseId)) {
        return {
          ok: false,
          error: createProtocolError(
            `tool-use-done for "${event.toolUseId}" without a prior tool-use-start`,
            'protocol.ordering'
          ),
        };
      }

      ctx.toolStreams.delete(event.toolUseId);

      return { ok: true };

    default:
      return { ok: true };
  }
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

    if (parsed.reason === 'unknown-version') {
      continue;
    }

    return { ok: false, error: parsed.error };
  }

  return { ok: true, events, olderCursor };
}

export type ApplyValidatedEnvelopeResult =
  | { applied: true; state: AgentConversationState }
  | { applied: false; skip: true; reason: 'unknown-version' }
  | { applied: false; skip: true; reason: 'invalid-schema' | 'ordering'; error: AgentConversationError };

export function applyValidatedEnvelope(
  state: AgentConversationState,
  ctx: FoldValidationContext,
  envelope: AgentEventEnvelope
): ApplyValidatedEnvelopeResult {
  const parsed = parseAgentEventEnvelope(envelope);

  if (!parsed.ok) {
    if (parsed.reason === 'unknown-version') {
      return {
        applied: false,
        skip: true,
        reason: 'unknown-version',
      };
    }

    return {
      applied: false,
      skip: true,
      reason: 'invalid-schema',
      error: parsed.error,
    };
  }

  const ordering = validateEnvelopeOrdering(ctx, parsed.envelope);

  if (!ordering.ok) {
    return {
      applied: false,
      skip: true,
      reason: 'ordering',
      error: ordering.error,
    };
  }

  return {
    applied: true,
    state: applyEnvelope(state, parsed.envelope),
  };
}

export function applyValidatedEnvelopes(
  initialState: AgentConversationState,
  envelopes: AgentEventEnvelope[],
  ctx: FoldValidationContext = createFoldValidationContext()
): { state: AgentConversationState; error?: AgentConversationError; ctx: FoldValidationContext } {
  let state = initialState;
  let error: AgentConversationError | undefined;

  for (const envelope of envelopes) {
    const result = applyValidatedEnvelope(state, ctx, envelope);

    if (result.applied) {
      state = result.state;
      continue;
    }

    if (result.reason === 'unknown-version') {
      state = {
        ...state,
        lastSequence: Math.max(state.lastSequence, envelope.sequence),
      };
      continue;
    }

    error = result.error;
    state = {
      ...state,
      lastSequence: Math.max(state.lastSequence, envelope.sequence),
      error: result.error,
    };
  }

  return { state, error, ctx };
}
