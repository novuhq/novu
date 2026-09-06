import { expect } from 'chai';
import { requiresExplicitMention } from './requires-explicit-mention';

describe('requiresExplicitMention', () => {
  it('lets DMs through without a mention', () => {
    expect(requiresExplicitMention({ isDM: true } as any, { isMention: false } as any)).to.equal(false);
    expect(requiresExplicitMention({ isDM: true } as any, {} as any)).to.equal(false);
  });

  it('lets an explicit mention through in a shared room', () => {
    expect(requiresExplicitMention({ isDM: false } as any, { isMention: true } as any)).to.equal(false);
  });

  it('requires a mention for unmentioned messages in a shared room', () => {
    expect(requiresExplicitMention({ isDM: false } as any, { isMention: false } as any)).to.equal(true);
    expect(requiresExplicitMention({ isDM: false } as any, {} as any)).to.equal(true);
  });
});
