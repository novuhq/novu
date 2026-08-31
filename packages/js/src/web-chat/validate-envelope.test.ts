import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { parseAgentEventEnvelope, validateHistoryPageResponse } from './validate-envelope';

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
  it('skips unknown protocol versions without error', () => {
    const value = { ...envelope(1, { type: 'run-start' }), version: 99 };
    const result = parseAgentEventEnvelope(value);

    expect(result).toEqual({ ok: false, skip: true, reason: 'unknown-version' });
  });

  it('skips non-numeric protocol versions', () => {
    const value = { ...envelope(1, { type: 'run-start' }), version: '1' };
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

describe('validateHistoryPageResponse', () => {
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

  it('skips invalid envelopes and returns the valid ones', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const known = envelope(1, { type: 'run-start' });
    const invalid = { version: AGENT_EVENT_PROTOCOL_VERSION, event: { type: 'run-start' } };
    const result = validateHistoryPageResponse({ events: [known, invalid], olderCursor: null });

    expect(result).toEqual({ ok: true, events: [known], olderCursor: null });
    expect(warnSpy).toHaveBeenCalledWith('[novu web-chat] skipping history envelope:', 'invalid-schema');
    warnSpy.mockRestore();
  });
});
