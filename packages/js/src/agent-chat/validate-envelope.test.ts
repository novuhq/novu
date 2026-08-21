import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { createInitialAgentConversationState } from './agent-message.types';
import {
  applyValidatedEnvelope,
  applyValidatedEnvelopes,
  createFoldValidationContext,
  parseAgentEventEnvelope,
  validateEnvelopeOrdering,
  validateHistoryPageResponse,
} from './validate-envelope';

const BASE_IDS = {
  conversationId: 'conv-1',
  agentId: 'agent-1',
  runId: 'run-1',
  turnId: 'turn-1',
} as const;

function envelope(sequence: number, event: AgentEvent, overrides: Partial<typeof BASE_IDS> = {}): AgentEventEnvelope {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    sequence,
    timestamp: `2026-07-28T12:00:${String(sequence).padStart(2, '0')}.000Z`,
    ...BASE_IDS,
    ...overrides,
    event,
  };
}

describe('parseAgentEventEnvelope', () => {
  it('accepts a valid envelope', () => {
    const value = envelope(1, { type: 'run-start' });
    const result = parseAgentEventEnvelope(value);

    expect(result).toEqual({ ok: true, envelope: value });
  });

  it('skips unknown protocol versions without error', () => {
    const value = { ...envelope(1, { type: 'run-start' }), version: 99 };
    const result = parseAgentEventEnvelope(value);

    expect(result).toEqual({ ok: false, skip: true, reason: 'unknown-version' });
  });

  it('rejects invalid envelope shape', () => {
    const result = parseAgentEventEnvelope({ version: AGENT_EVENT_PROTOCOL_VERSION, event: { type: 1 } });

    expect(result).toMatchObject({
      ok: false,
      skip: true,
      reason: 'invalid-schema',
      error: { code: 'protocol.schema' },
    });
  });

  it('rejects durable message without role', () => {
    const result = parseAgentEventEnvelope(
      envelope(1, {
        type: 'message',
        messageId: 'm1',
        role: 'system' as 'assistant',
        content: { markdown: 'Hi' },
      })
    );

    expect(result).toMatchObject({ ok: false, reason: 'invalid-schema' });
  });
});

describe('validateEnvelopeOrdering', () => {
  it('flags message-delta without message-start', () => {
    const ctx = createFoldValidationContext();
    const result = validateEnvelopeOrdering(ctx, envelope(1, { type: 'message-delta', messageId: 'm1', delta: 'Hi' }));

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'protocol.ordering',
        message: expect.stringContaining('message-delta'),
      },
    });
  });

  it('flags thinking-delta without thinking-start', () => {
    const ctx = createFoldValidationContext();
    const result = validateEnvelopeOrdering(
      ctx,
      envelope(1, { type: 'thinking-delta', thinkingId: 't1', delta: 'Hmm' })
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'protocol.ordering' },
    });
  });

  it('flags tool-use-delta without tool-use-start', () => {
    const ctx = createFoldValidationContext();
    const result = validateEnvelopeOrdering(
      ctx,
      envelope(1, { type: 'tool-use-delta', toolUseId: 'tu1', delta: '{}' })
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'protocol.ordering' },
    });
  });

  it('accepts a well-formed streaming sequence', () => {
    const ctx = createFoldValidationContext();
    const envelopes = [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'message-delta', messageId: 'm1', delta: 'Hello' }),
      envelope(4, { type: 'message-end', messageId: 'm1' }),
    ];

    for (const item of envelopes) {
      expect(validateEnvelopeOrdering(ctx, item)).toEqual({ ok: true });
    }
  });
});

describe('applyValidatedEnvelopes', () => {
  it('does not apply malformed ordering and records a protocol error', () => {
    const { state } = applyValidatedEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-delta', messageId: 'm1', delta: 'Orphan delta' }),
    ]);

    expect(state.messages).toEqual([]);
    expect(state.error).toMatchObject({
      code: 'protocol.ordering',
      message: expect.stringContaining('message-delta'),
    });
    expect(state.lastSequence).toBe(2);
  });

  it('skips unknown versions while advancing lastSequence', () => {
    const unknown = { ...envelope(1, { type: 'run-start' }), version: 99 as typeof AGENT_EVENT_PROTOCOL_VERSION };
    const { state } = applyValidatedEnvelopes(createInitialAgentConversationState(), [
      unknown,
      envelope(2, { type: 'run-start' }),
    ]);

    expect(state.isRunning).toBe(true);
    expect(state.error).toBeUndefined();
    expect(state.lastSequence).toBe(2);
  });
});

describe('validateHistoryPageResponse', () => {
  it('accepts a valid history payload', () => {
    const events = [envelope(1, { type: 'run-start' })];
    const result = validateHistoryPageResponse({ events, olderCursor: 'cursor-1' });

    expect(result).toEqual({ ok: true, events, olderCursor: 'cursor-1' });
  });

  it('rejects missing events array', () => {
    const result = validateHistoryPageResponse({ olderCursor: null });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'protocol.history' },
    });
  });

  it('filters unknown-version envelopes from history', () => {
    const known = envelope(1, { type: 'run-start' });
    const unknown = { ...envelope(2, { type: 'run-finish', outcome: 'completed' as const }), version: 99 };
    const result = validateHistoryPageResponse({ events: [known, unknown], olderCursor: null });

    expect(result).toEqual({ ok: true, events: [known], olderCursor: null });
  });
});

describe('applyValidatedEnvelope', () => {
  it('applies valid envelopes and updates validation context', () => {
    const ctx = createFoldValidationContext();
    const initial = createInitialAgentConversationState();
    const result = applyValidatedEnvelope(initial, ctx, envelope(1, { type: 'run-start' }));

    expect(result).toMatchObject({ applied: true, state: { isRunning: true } });
  });
});
