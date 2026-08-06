import { PushProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  extractFcmRoutingCredentials,
  hasTokenlessRoutingOverride,
  isBroadcastRoutingOverride,
} from './fcm-routing-overrides';

describe('isBroadcastRoutingOverride', () => {
  it('returns true for topic routing', () => {
    expect(isBroadcastRoutingOverride({ topic: 'news_updates' })).to.equal(true);
  });

  it('returns true for condition routing', () => {
    expect(isBroadcastRoutingOverride({ condition: "'news' in topics" })).to.equal(true);
  });

  it('returns false for token routing', () => {
    expect(isBroadcastRoutingOverride({ token: 'abc' })).to.equal(false);
  });
});

describe('hasTokenlessRoutingOverride', () => {
  it('returns true for FCM topic without relying on shared exclusiveKeyGroups', () => {
    expect(hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, { topic: 'news_updates' })).to.equal(true);
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
