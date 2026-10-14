import { INTEGRATION_OVERRIDES_OUTPUT_KEY, PushProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  createUnroutedPushRoute,
  extractFcmRoutingCredentials,
  hasCandidatePushRoutingOverride,
  hasDestinationRoutingOverride,
  isFcmBroadcastRoutingOverride,
  resolvePushDeliveryTargets,
  resolvePushRoute,
  selectPushChannels,
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

describe('hasDestinationRoutingOverride', () => {
  it('detects a schematized routing key', () => {
    expect(hasDestinationRoutingOverride(PushProviderIdEnum.FCM, { topic: 'news_updates' })).to.equal(true);
  });

  it('detects a routing key set only in _passthrough.body', () => {
    expect(
      hasDestinationRoutingOverride(PushProviderIdEnum.FCM, { _passthrough: { body: { topic: 'news_updates' } } })
    ).to.equal(true);
  });

  it('ignores content-only overrides', () => {
    expect(
      hasDestinationRoutingOverride(PushProviderIdEnum.FCM, {
        notification: { title: 'hi' },
        _passthrough: { body: { android: { priority: 'high' } } },
      })
    ).to.equal(false);
  });

  it('detects token and tokens, which choose the destination instead of the stored device tokens', () => {
    expect(hasDestinationRoutingOverride(PushProviderIdEnum.FCM, { token: 'abc' })).to.equal(true);
    expect(hasDestinationRoutingOverride(PushProviderIdEnum.FCM, { tokens: ['a', 'b'] })).to.equal(true);
  });

  it('ignores routing keys with no usable value', () => {
    expect(hasDestinationRoutingOverride(PushProviderIdEnum.FCM, { topic: '' })).to.equal(false);
    expect(hasDestinationRoutingOverride(PushProviderIdEnum.FCM, { tokens: [] })).to.equal(false);
  });

  it('returns false for providers without exclusive routing groups', () => {
    expect(hasDestinationRoutingOverride(PushProviderIdEnum.EXPO, { topic: 'news_updates' })).to.equal(false);
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

describe('resolvePushRoute & reusable channel routing helpers', () => {
  it('resolves an integration-scoped topic override into a broadcast route', () => {
    const route = resolvePushRoute(
      {
        bridgeData: {
          providers: {
            [PushProviderIdEnum.FCM]: {
              [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {
                'fcm-main': { topic: 'updates' },
              },
            },
          },
        } as never,
      },
      PushProviderIdEnum.FCM,
      'fcm-main'
    );

    expect(route).to.deep.equal({
      providerId: PushProviderIdEnum.FCM,
      integrationIdentifier: 'fcm-main',
      bridgeProviderData: { topic: 'updates' },
      credentials: { topic: 'updates' },
      hasDestinationOverride: true,
      isBroadcast: true,
      isIntegrationScoped: true,
      broadcastKey: 'fcm:fcm-main',
    });
  });

  it('ignores integration overrides that target a different integration identifier', () => {
    const route = resolvePushRoute(
      {
        bridgeData: {
          providers: {
            [PushProviderIdEnum.FCM]: {
              [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {
                'fcm-other': { topic: 'updates' },
              },
            },
          },
        } as never,
      },
      PushProviderIdEnum.FCM,
      'fcm-main'
    );

    expect(route.hasDestinationOverride).to.equal(false);
    expect(route.isBroadcast).to.equal(false);
    expect(route.credentials).to.equal(null);
    expect(route.bridgeProviderData).to.deep.equal({});
  });

  it('detects candidate routing overrides packed inside integrationOverrides', () => {
    const sourceWithIntegrationOverride = {
      bridgeData: {
        providers: {
          [PushProviderIdEnum.FCM]: {
            [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {
              'fcm-main': { topic: 'updates' },
            },
          },
        },
      } as never,
    };

    const sourceWithContentOnly = {
      bridgeData: {
        providers: {
          [PushProviderIdEnum.FCM]: {
            [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {
              'fcm-main': { notification: { title: 'hi' } },
            },
          },
        },
      } as never,
    };

    expect(hasCandidatePushRoutingOverride(sourceWithIntegrationOverride, PushProviderIdEnum.FCM)).to.equal(true);
    expect(hasCandidatePushRoutingOverride(sourceWithContentOnly, PushProviderIdEnum.FCM)).to.equal(false);
  });

  it('selectPushChannels keeps per-integration routes without dropping sibling integrations', () => {
    const unroutedCandidate = {
      id: 'sub-main',
      route: createUnroutedPushRoute(PushProviderIdEnum.FCM),
      isMissingDeviceTokens: false,
    };
    const broadcastCandidate = {
      id: 'sub-alerts',
      route: {
        providerId: PushProviderIdEnum.FCM,
        integrationIdentifier: 'fcm-alerts',
        bridgeProviderData: { topic: 'alerts' },
        credentials: { topic: 'alerts' },
        hasDestinationOverride: true,
        isBroadcast: true,
        broadcastKey: 'fcm:fcm-alerts',
      },
      isMissingDeviceTokens: false,
    };

    const selected = selectPushChannels([unroutedCandidate, broadcastCandidate], []);
    expect(selected.map((c) => c.id)).to.deep.equal(['sub-main', 'sub-alerts']);
  });

  it('selectPushChannels keeps distinct integrations when both configure explicit integration-scoped broadcasts to the same topic', () => {
    const source = {
      bridgeData: {
        providers: {
          [PushProviderIdEnum.FCM]: {
            [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {
              'fcm-ios': { topic: 'breaking-news' },
              'fcm-android': { topic: 'breaking-news' },
            },
          },
        },
      } as never,
    };

    const iosCandidate = {
      id: 'ios',
      route: resolvePushRoute(source, PushProviderIdEnum.FCM, 'fcm-ios'),
      isMissingDeviceTokens: false,
    };
    const androidCandidate = {
      id: 'android',
      route: resolvePushRoute(source, PushProviderIdEnum.FCM, 'fcm-android'),
      isMissingDeviceTokens: false,
    };

    const selected = selectPushChannels([iosCandidate, androidCandidate], []);
    expect(selected.map((c) => c.id)).to.deep.equal(['ios', 'android']);
  });

  it('resolvePushDeliveryTargets collapses device fan-out when route has a destination override', () => {
    const topicRoute = {
      providerId: PushProviderIdEnum.FCM,
      bridgeProviderData: { topic: 'updates' },
      credentials: { topic: 'updates' },
      hasDestinationOverride: true,
      isBroadcast: true,
    };
    const unrouted = createUnroutedPushRoute(PushProviderIdEnum.FCM);

    expect(resolvePushDeliveryTargets(topicRoute, ['d1', 'd2'])).to.deep.equal({
      targetDeviceTokens: [''],
      recordedDeviceTokens: undefined,
    });
    expect(resolvePushDeliveryTargets(unrouted, ['d1', 'd2'])).to.deep.equal({
      targetDeviceTokens: ['d1', 'd2'],
      recordedDeviceTokens: ['d1', 'd2'],
    });
  });
});
