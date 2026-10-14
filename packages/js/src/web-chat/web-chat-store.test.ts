import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { describe, expect, it } from 'vitest';
import { WebChatStore } from './web-chat-store';

function messageEnvelope(sequence: number): AgentEventEnvelope {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: 'internal',
    conversationIdentifier: 'conv_abcdefghijkl',
    agentId: 'agent_1',
    runId: 'history',
    turnId: `t${sequence}`,
    sequence,
    timestamp: '2026-08-07T12:00:00.000Z',
    event: {
      type: 'message',
      role: sequence % 2 === 1 ? 'user' : 'assistant',
      messageId: `msg_${sequence}`,
      content: { markdown: `message ${sequence}` },
    },
  } as AgentEventEnvelope;
}

function envelopes(from: number, to: number): AgentEventEnvelope[] {
  return Array.from({ length: to - from + 1 }, (_, index) => messageEnvelope(from + index));
}

function messageIds(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => `msg_${from + index}`);
}

describe('WebChatStore', () => {
  it('keeps cached history above the newest page when a conversation longer than one page is reloaded', () => {
    const store = new WebChatStore(() => undefined);
    const entry = store.getOrCreate({
      agentId: 'agent_1',
      key: 'conv_abcdefghijkl',
      conversationId: 'conv_abcdefghijkl',
    });

    store.absorbHistoryPage(entry, envelopes(7, 56), 'cursor_before_7');
    store.applyLiveEnvelope(entry, messageEnvelope(57));

    store.absorbHistoryPage(entry, envelopes(8, 57), 'cursor_before_8');

    expect(entry.messages.map((message) => message.id)).toEqual(messageIds(7, 57));
    expect(entry.olderCursor).toBe('cursor_before_7');
  });
});
