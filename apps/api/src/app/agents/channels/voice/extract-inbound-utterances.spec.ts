import { expect } from 'chai';
import { extractNewInboundUtterances } from './extract-inbound-utterances';

describe('extractNewInboundUtterances', () => {
  it('returns nothing when the inbound count already matches', () => {
    const messages = [
      { role: 'assistant' as const, content: 'hi' },
      { role: 'user' as const, content: 'yes' },
    ];

    expect(extractNewInboundUtterances(messages, 1)).to.deep.equal([]);
  });

  it('returns the tail of user messages beyond the known count', () => {
    const messages = [
      { role: 'user' as const, content: 'first' },
      { role: 'assistant' as const, content: 'ok' },
      { role: 'user' as const, content: 'yes' },
      { role: 'user' as const, content: 'yes' },
    ];

    expect(extractNewInboundUtterances(messages, 1)).to.deep.equal(['yes', 'yes']);
  });

  it('skips empty user content', () => {
    const messages = [
      { role: 'user' as const, content: 'hello' },
      { role: 'user' as const, content: '   ' },
      { role: 'user' as const, content: 'world' },
    ];

    expect(extractNewInboundUtterances(messages, 1)).to.deep.equal(['world']);
  });
});
