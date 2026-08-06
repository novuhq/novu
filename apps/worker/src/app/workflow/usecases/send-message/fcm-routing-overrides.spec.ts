import { expect } from 'chai';
import { extractFcmRoutingCredentials, isFcmBroadcastRoutingOverride } from './fcm-routing-overrides';

describe('isFcmBroadcastRoutingOverride', () => {
  it('returns true for topic routing', () => {
    expect(isFcmBroadcastRoutingOverride({ topic: 'news_updates' })).to.equal(true);
  });

  it('returns true for condition routing', () => {
    expect(isFcmBroadcastRoutingOverride({ condition: "'news' in topics" })).to.equal(true);
  });

  it('returns false for token routing', () => {
    expect(isFcmBroadcastRoutingOverride({ token: 'abc' })).to.equal(false);
  });
});

describe('extractFcmRoutingCredentials', () => {
  it('maps a string tokens array to deviceTokens', () => {
    expect(extractFcmRoutingCredentials({ tokens: ['a', 'b'] })).to.deep.equal({
      deviceTokens: ['a', 'b'],
    });
  });

  it('drops non-string token entries so Mongo operators cannot reach $pull cleanup', () => {
    expect(
      extractFcmRoutingCredentials({
        tokens: [{ $exists: true }, 'safe-token', null, 1],
      })
    ).to.deep.equal({
      deviceTokens: ['safe-token'],
    });
  });

  it('returns null when tokens contains only non-string values', () => {
    expect(extractFcmRoutingCredentials({ tokens: [{ $exists: true }] })).to.equal(null);
  });
});
