import { expect } from 'chai';
import { parseWebOutboundEvent } from './web-relay-events';
import { decodeWebThreadId, encodeWebThreadId, WEB_CONVERSATION_ID_PATTERN } from './web-thread-id.util';

describe('web thread id utils', () => {
  it('round-trips a plain subscriber id', () => {
    const threadId = encodeWebThreadId({ subscriberId: 'user-123', conversationId: 'conv_1' });

    expect(threadId).to.equal('web:user-123:conv_1');
    expect(decodeWebThreadId(threadId)).to.deep.equal({ subscriberId: 'user-123', conversationId: 'conv_1' });
  });

  it('escapes subscriber ids containing colons (chat SDK thread-id delimiter)', () => {
    const threadId = encodeWebThreadId({ subscriberId: 'org:42:user', conversationId: 'abc' });

    expect(threadId.split(':')).to.have.length(3);
    expect(decodeWebThreadId(threadId)).to.deep.equal({ subscriberId: 'org:42:user', conversationId: 'abc' });
  });

  it('rejects malformed thread ids', () => {
    expect(decodeWebThreadId('slack:C123:456')).to.equal(null);
    expect(decodeWebThreadId('web:only-two')).to.equal(null);
    expect(decodeWebThreadId('web::conv')).to.equal(null);
  });

  it('constrains conversation ids to the colon-free alphabet', () => {
    expect(WEB_CONVERSATION_ID_PATTERN.test('abc-DEF_123')).to.equal(true);
    expect(WEB_CONVERSATION_ID_PATTERN.test('has:colon')).to.equal(false);
    expect(WEB_CONVERSATION_ID_PATTERN.test('')).to.equal(false);
    expect(WEB_CONVERSATION_ID_PATTERN.test('x'.repeat(65))).to.equal(false);
  });
});

describe('parseWebOutboundEvent', () => {
  it('parses known event kinds', () => {
    const event = parseWebOutboundEvent(
      JSON.stringify({ kind: 'message', messageId: 'web-1', content: { markdown: 'hi' }, ts: 1 })
    );

    expect(event).to.deep.equal({ kind: 'message', messageId: 'web-1', content: { markdown: 'hi' }, ts: 1 });
  });

  it('rejects unknown kinds and malformed payloads', () => {
    expect(parseWebOutboundEvent(JSON.stringify({ kind: 'nope' }))).to.equal(null);
    expect(parseWebOutboundEvent('not-json')).to.equal(null);
    expect(parseWebOutboundEvent(JSON.stringify('string'))).to.equal(null);
  });
});
