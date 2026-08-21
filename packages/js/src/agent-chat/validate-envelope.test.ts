import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { validateHistoryPageResponse } from './validate-envelope';

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

  it('skips invalid envelopes in history pages', () => {
    const known = envelope(1, { type: 'run-start' });
    const invalid = { version: AGENT_EVENT_PROTOCOL_VERSION, event: { type: 'run-start' } };
    const result = validateHistoryPageResponse({ events: [known, invalid], olderCursor: null });

    expect(result).toEqual({ ok: true, events: [known], olderCursor: null });
  });
});
