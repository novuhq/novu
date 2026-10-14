import { INTEGRATION_OVERRIDES_OUTPUT_KEY, PushProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { extractFcmRoutingCredentials, isFcmBroadcastRoutingOverride, resolvePushRoute } from './fcm-routing-overrides';

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

describe('resolvePushRoute', () => {
  function routeFor(
    providerOverride: Record<string, unknown>,
    providerId = PushProviderIdEnum.FCM,
    identifier?: string
  ) {
    return resolvePushRoute(
      { bridgeData: { providers: { [providerId]: providerOverride } } } as never,
      providerId,
      identifier
    );
  }

  it('detects a schematized routing key', () => {
    expect(routeFor({ topic: 'news_updates' }).credentials).to.deep.equal({ topic: 'news_updates' });
  });

  it('detects a routing key set only in _passthrough.body', () => {
    expect(routeFor({ _passthrough: { body: { topic: 'news_updates' } } }).credentials).to.deep.equal({
      topic: 'news_updates',
    });
  });

  it('ignores content-only overrides', () => {
    const route = routeFor({
      notification: { title: 'hi' },
      _passthrough: { body: { android: { priority: 'high' } } },
    });

    expect(route.credentials).to.equal(null);
  });

  it('detects token and tokens, which choose the destination instead of the stored device tokens', () => {
    expect(routeFor({ token: 'abc' }).credentials).to.deep.equal({ deviceTokens: [] });
    expect(routeFor({ tokens: ['a', 'b'] }).credentials).to.deep.equal({ deviceTokens: ['a', 'b'] });
  });

  it('ignores routing keys with no usable value', () => {
    expect(routeFor({ topic: '' }).credentials).to.equal(null);
    expect(routeFor({ tokens: [] }).credentials).to.equal(null);
  });

  it('returns no destination for providers without exclusive routing groups', () => {
    expect(routeFor({ topic: 'news_updates' }, PushProviderIdEnum.EXPO).credentials).to.equal(null);
  });

  it('applies the integration override only for the matching integration identifier', () => {
    const providerOverride = { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'fcm-main': { topic: 'updates' } } };

    expect(routeFor(providerOverride, PushProviderIdEnum.FCM, 'fcm-main')).to.deep.equal({
      bridgeProviderData: { topic: 'updates' },
      credentials: { topic: 'updates' },
      isIntegrationScoped: true,
    });
    expect(routeFor(providerOverride, PushProviderIdEnum.FCM, 'fcm-other').credentials).to.equal(null);
    expect(routeFor(providerOverride).credentials).to.equal(null);
  });

  it('is integration-scoped when the integration override repeats the provider-wide topic', () => {
    const providerOverride = { topic: 'news', [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'fcm-main': { topic: 'news' } } };

    expect(routeFor(providerOverride, PushProviderIdEnum.FCM, 'fcm-main').isIntegrationScoped).to.equal(true);
    expect(routeFor(providerOverride, PushProviderIdEnum.FCM, 'fcm-other').isIntegrationScoped).to.equal(false);
  });

  it('is not integration-scoped when a trigger override evicts the integration topic', () => {
    const route = resolvePushRoute(
      {
        bridgeData: {
          providers: {
            [PushProviderIdEnum.FCM]: { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'fcm-main': { topic: 'a' } } },
          },
        },
        overrides: { providers: { [PushProviderIdEnum.FCM]: { topic: 'b' } } },
      } as never,
      PushProviderIdEnum.FCM,
      'fcm-main'
    );

    expect(route.credentials).to.deep.equal({ topic: 'b' });
    expect(route.isIntegrationScoped).to.equal(false);
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

  it('prefers broadcast destinations over tokens in the same claiming layer', () => {
    expect(extractFcmRoutingCredentials({ tokens: ['a', 'b'], topic: 'news_updates' })).to.deep.equal({
      topic: 'news_updates',
    });
    expect(
      extractFcmRoutingCredentials({ _passthrough: { body: { tokens: ['a'], topic: 'news_updates' } } })
    ).to.deep.equal({ topic: 'news_updates' });
    expect(extractFcmRoutingCredentials({ tokens: ['a'], condition: "'a' in topics" })).to.deep.equal({
      deviceTokens: [],
    });
  });

  it('keeps the schematized destination when the passthrough routing value is unusable', () => {
    expect(
      extractFcmRoutingCredentials({ topic: 'news_updates', _passthrough: { body: { tokens: [{ $exists: true }] } } })
    ).to.deep.equal({ topic: 'news_updates' });
  });
});
