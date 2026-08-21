import type { AgentMessage, AgentTextPart } from './agent-message.types';
import { preserveMessageReferences } from './preserve-message-references';

describe('preserveMessageReferences', () => {
  it('reuses unchanged message references across streaming updates', () => {
    const userMessage: AgentMessage = {
      id: 'msg_user',
      role: 'user',
      status: 'sent',
      createdAt: '2026-01-01T00:00:00.000Z',
      parts: [{ type: 'text', text: 'hello', state: 'done' }],
    };
    const assistantPart: AgentTextPart = { type: 'text', text: 'Hel', state: 'streaming' };
    const assistantMessage: AgentMessage = {
      id: 'msg_asst',
      role: 'assistant',
      status: 'sent',
      createdAt: '2026-01-01T00:00:01.000Z',
      parts: [assistantPart],
    };

    const previous = [userMessage, assistantMessage];
    const next: AgentMessage[] = [
      userMessage,
      {
        ...assistantMessage,
        parts: [{ type: 'text' as const, text: 'Hello', state: 'streaming' as const }],
      },
    ];

    const preserved = preserveMessageReferences(previous, next);

    expect(preserved[0]).toBe(userMessage);
    expect(preserved[1]).not.toBe(assistantMessage);
    expect(preserved[1]?.parts[0]).not.toBe(assistantPart);
  });

  it('reuses unchanged part references within a message', () => {
    const thinkingPart = { type: 'thinking' as const, thinkingId: 't1', text: 'plan', state: 'done' as const };
    const textPart: AgentTextPart = { type: 'text', text: 'Hi', state: 'streaming' };
    const previous: AgentMessage = {
      id: 'msg_asst',
      role: 'assistant',
      status: 'sent',
      createdAt: '2026-01-01T00:00:01.000Z',
      parts: [thinkingPart, textPart],
    };

    const next: AgentMessage = {
      ...previous,
      parts: [thinkingPart, { type: 'text', text: 'Hi there', state: 'streaming' }],
    };

    const preserved = preserveMessageReferences([previous], [next])[0];

    expect(preserved?.parts[0]).toBe(thinkingPart);
    expect(preserved?.parts[1]).not.toBe(textPart);
  });
});
