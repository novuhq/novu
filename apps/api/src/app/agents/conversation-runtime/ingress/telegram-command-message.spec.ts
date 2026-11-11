import { expect } from 'chai';
import type { SlashCommandEvent } from 'chat';
import { resolveTelegramCommandMessage } from './telegram-command-message';

describe('resolveTelegramCommandMessage', () => {
  it('keeps an over-budget command argument as one verbatim text paragraph when the cached message is gone', async () => {
    // 129 closing brackets is one over the Chat SDK inbound budget. The unbounded parse
    // would still turn `**bold**` into a strong node.
    const text = `/start **bold** ${']'.repeat(129)}`;
    const event = {
      command: '/start',
      text: text.slice('/start '.length),
      user: { userId: 'u1', userName: 'ada', fullName: 'Ada', isBot: false, isMe: false },
      raw: { message_id: 7, chat: { id: 42 }, date: 1_700_000_000 },
      adapter: { fetchMessage: async () => null },
    } as unknown as SlashCommandEvent;

    const message = await resolveTelegramCommandMessage(event, '42');

    expect(message.text).to.equal(text);
    expect(message.formatted).to.deep.equal({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }],
    });
  });
});
