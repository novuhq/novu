import type { AgentMessage } from '@novu/js';
import { describe, expect, it } from 'vitest';
import { getTryAgainPrompt } from './copilot-web-chat-utils';

function userMessage(id: string, text: string): AgentMessage {
  return {
    id,
    role: 'user',
    parts: [{ type: 'text', text, state: 'done' }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

function assistantMessage(id: string, text: string): AgentMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text, state: 'done' }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

function cardMessage(id: string): AgentMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'card', card: { type: 'card', children: [] }, sourceMessageId: id }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

describe('getTryAgainPrompt', () => {
  // The user stopped the first turn and sent another message before the stopped turn's review card arrived.
  const messages = [
    userMessage('msg_first', 'Add an SMS step'),
    assistantMessage('act_partial', 'Adding the SMS'),
    userMessage('msg_second', 'Make it high severity'),
    cardMessage('card_review'),
  ];

  it('resends the prompt the ready event names, not the last one before the card', () => {
    expect(
      getTryAgainPrompt(messages, { sourceMessageId: 'card_review', promptMessageId: 'msg_first' }, 'card_review')
    ).toBe('Add an SMS step');
  });

  it('falls back to the last user message before the card when the event names none', () => {
    expect(getTryAgainPrompt(messages, { sourceMessageId: 'card_review' }, 'card_review')).toBe(
      'Make it high severity'
    );
    expect(getTryAgainPrompt(messages, undefined, 'card_review')).toBe('Make it high severity');
  });

  it('falls back when the named message is not loaded', () => {
    expect(getTryAgainPrompt(messages, { promptMessageId: 'msg_paged_out' }, 'card_review')).toBe(
      'Make it high severity'
    );
  });

  it('ignores an assistant message with the named id', () => {
    expect(getTryAgainPrompt(messages, { promptMessageId: 'act_partial' }, 'card_review')).toBe(
      'Make it high severity'
    );
  });
});
