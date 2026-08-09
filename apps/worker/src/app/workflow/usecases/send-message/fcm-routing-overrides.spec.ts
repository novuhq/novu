import { PushProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  extractFcmRoutingCredentials,
  hasTokenlessRoutingOverride,
  isFcmBroadcastRoutingOverride,
} from './fcm-routing-overrides';

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

  it('returns true for a topic set in _passthrough.body', () => {
    expect(isFcmBroadcastRoutingOverride({ _passthrough: { body: { topic: 'news_updates' } } })).to.equal(true);
  });

  it('returns true when a passthrough topic claims the group over schematized tokens', () => {
    expect(
      isFcmBroadcastRoutingOverride({ tokens: ['t1'], _passthrough: { body: { topic: 'news_updates' } } })
    ).to.equal(true);
  });

  it('returns true when passthrough topic wins group order over a sibling tokens', () => {
    expect(
      isFcmBroadcastRoutingOverride({ _passthrough: { body: { tokens: ['a'], topic: 'news_updates' } } })
    ).to.equal(true);
  });

  it('returns false when the passthrough topic is unusable', () => {
    expect(isFcmBroadcastRoutingOverride({ _passthrough: { body: { topic: '' } } })).to.equal(false);
    expect(isFcmBroadcastRoutingOverride({ _passthrough: { body: { topic: { $exists: true } } } })).to.equal(false);
  });
});

describe('hasTokenlessRoutingOverride', () => {
  it('detects a schematized routing key', () => {
    expect(hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, { topic: 'news_updates' })).to.equal(true);
  });

  it('detects a routing key set only in _passthrough.body', () => {
    expect(
      hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, { _passthrough: { body: { topic: 'news_updates' } } })
    ).to.equal(true);
  });

  it('ignores content-only overrides', () => {
    expect(
      hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, {
        notification: { title: 'hi' },
        _passthrough: { body: { android: { priority: 'high' } } },
      })
    ).to.equal(false);
  });

  it('ignores routing keys with no usable value', () => {
    expect(hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, { topic: '' })).to.equal(false);
    expect(hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, { tokens: [] })).to.equal(false);
  });

  it('returns false for providers without exclusive routing groups', () => {
    expect(hasTokenlessRoutingOverride(PushProviderIdEnum.EXPO, { topic: 'news_updates' })).to.equal(false);
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

  it('maps routing set in _passthrough.body', () => {
    expect(extractFcmRoutingCredentials({ _passthrough: { body: { topic: 'news_updates' } } })).to.deep.equal({
      topic: 'news_updates',
    });

    expect(extractFcmRoutingCredentials({ _passthrough: { body: { tokens: ['a', 'b'] } } })).to.deep.equal({
      deviceTokens: ['a', 'b'],
    });
  });

  it('lets a passthrough topic claim the group over schematized tokens', () => {
    expect(
      extractFcmRoutingCredentials({ tokens: ['a', 'b'], _passthrough: { body: { topic: 'news_updates' } } })
    ).to.deep.equal({ topic: 'news_updates' });
  });

  it('prefers topic over tokens when both appear in the same claiming layer', () => {
    expect(extractFcmRoutingCredentials({ tokens: ['a', 'b'], topic: 'news_updates' })).to.deep.equal({
      topic: 'news_updates',
    });
    expect(
      extractFcmRoutingCredentials({ _passthrough: { body: { tokens: ['a'], topic: 'news_updates' } } })
    ).to.deep.equal({ topic: 'news_updates' });
  });

  it('keeps the schematized destination when the passthrough routing value is unusable', () => {
    expect(
      extractFcmRoutingCredentials({ topic: 'news_updates', _passthrough: { body: { tokens: [{ $exists: true }] } } })
    ).to.deep.equal({ topic: 'news_updates' });
  });
});
