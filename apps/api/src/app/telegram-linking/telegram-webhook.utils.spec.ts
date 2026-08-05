import { expect } from 'chai';

import {
  extractTelegramChatIdFromUpdate,
  extractTelegramMessageText,
  extractTelegramStartToken,
} from './telegram-webhook.utils';

describe('telegram-webhook.utils', () => {
  it('extractTelegramStartToken parses /start payloads', () => {
    expect(extractTelegramStartToken('/start abc123')).to.equal('abc123');
    expect(extractTelegramStartToken('/start@my_bot token-here')).to.equal('token-here');
    expect(extractTelegramStartToken('/start')).to.equal(null);
    expect(extractTelegramStartToken('hello')).to.equal(null);
  });

  it('extractTelegramChatIdFromUpdate reads chat.id from message updates', () => {
    const update = {
      message: {
        chat: { id: 12345, type: 'private' },
        text: '/start abc',
      },
    };

    expect(extractTelegramChatIdFromUpdate(update)).to.equal('12345');
    expect(extractTelegramMessageText(update)).to.equal('/start abc');
  });
});
