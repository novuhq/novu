import { expect } from 'chai';

import {
  extractTelegramChatIdFromUpdate,
  extractTelegramMessageText,
  extractTelegramStartToken,
  extractTelegramUsernameFromMessage,
  extractTelegramUsernameFromUpdate,
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

  it('reads the sender username when Telegram sent one', () => {
    const message = { chat: { id: 12345 }, from: { id: 12345, first_name: 'Dima', username: 'dima' } };

    expect(extractTelegramUsernameFromMessage(message)).to.equal('dima');
    expect(extractTelegramUsernameFromUpdate({ message })).to.equal('dima');
  });

  it('reports no username for accounts without one', () => {
    expect(extractTelegramUsernameFromMessage({ from: { id: 12345, first_name: 'Dima' } })).to.equal(undefined);
    expect(extractTelegramUsernameFromMessage({ from: { id: 12345, username: '' } })).to.equal(undefined);
    expect(extractTelegramUsernameFromMessage(undefined)).to.equal(undefined);
    expect(extractTelegramUsernameFromUpdate({})).to.equal(undefined);
  });
});
