import { expect } from 'chai';
import { IsValidReplyContent } from './agent-reply-payload.dto';

describe('IsValidReplyContent', () => {
  const validator = new IsValidReplyContent();

  it('rejects non-string markdown without throwing', () => {
    expect(validator.validate({ markdown: 123 } as never)).to.equal(false);
  });

  it('rejects null card without throwing', () => {
    expect(validator.validate({ card: null } as never)).to.equal(false);
  });

  it('rejects empty markdown', () => {
    expect(validator.validate({ markdown: '   ' })).to.equal(false);
  });

  it('accepts a card with type card', () => {
    expect(
      validator.validate({
        card: { type: 'card', children: [{ type: 'text', content: 'hi' }] },
      })
    ).to.equal(true);
  });

  it('rejects a card missing type card', () => {
    expect(validator.validate({ card: { type: 'section', children: [] } as never })).to.equal(false);
  });
});
