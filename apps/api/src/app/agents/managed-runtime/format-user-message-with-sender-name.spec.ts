import { expect } from 'chai';
import { formatUserMessageWithSenderName } from './format-user-message-with-sender-name';

describe('formatUserMessageWithSenderName', () => {
  it('prefixes content when a sender name is present', () => {
    expect(formatUserMessageWithSenderName('hello', 'Ada')).to.equal('Ada: hello');
  });

  it('leaves content unchanged without a usable sender name', () => {
    expect(formatUserMessageWithSenderName('hello', '  ')).to.equal('hello');
    expect(formatUserMessageWithSenderName('hello', null)).to.equal('hello');
    expect(formatUserMessageWithSenderName('', 'Ada')).to.equal('');
  });
});
