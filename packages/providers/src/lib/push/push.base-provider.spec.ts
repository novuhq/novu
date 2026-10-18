import { PushEventStatusEnum } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { APNSPushProvider } from './apns/apns.provider';
import { AppioPushProvider } from './appio/appio.provider';
import { ExpoPushProvider } from './expo/expo.provider';
import { FcmPushProvider } from './fcm/fcm.provider';
import { OneSignalPushProvider } from './one-signal/one-signal.provider';
import { PushBaseProvider } from './push.base-provider';
import { PushWebhookPushProvider } from './push-webhook/push-webhook.provider';
import { PusherBeamsPushProvider } from './pusher-beams/pusher-beams.provider';
import { PushpadPushProvider } from './pushpad/pushpad.provider';

const pushProviderClasses = [
  ExpoPushProvider,
  FcmPushProvider,
  APNSPushProvider,
  PushpadPushProvider,
  PushWebhookPushProvider,
  OneSignalPushProvider,
  PusherBeamsPushProvider,
  AppioPushProvider,
] as const;

describe('PushBaseProvider inbound webhook parsing', () => {
  test.each(pushProviderClasses.map((Provider) => [Provider.name, Provider] as const))(
    '%s inherits getMessageId and parseEventBody from PushBaseProvider',
    (_name, Provider) => {
      expect(Object.getPrototypeOf(Provider.prototype)).toBe(PushBaseProvider.prototype);
      expect(typeof Provider.prototype.getMessageId).toBe('function');
      expect(typeof Provider.prototype.parseEventBody).toBe('function');
    }
  );

  test.each([
    ['Expo', () => new ExpoPushProvider({ accessToken: 'test-token' })],
    [
      'PushWebhook',
      () =>
        new PushWebhookPushProvider({
          webhookUrl: 'https://example.com/webhook',
          hmacSecretKey: 'secret',
        }),
    ],
    ['OneSignal', () => new OneSignalPushProvider({ appId: 'app-id', apiKey: 'api-key' })],
    ['PusherBeams', () => new PusherBeamsPushProvider({ instanceId: 'instance-id', secretKey: 'secret' })],
    ['AppIO', () => new AppioPushProvider({})],
    ['Pushpad', () => new PushpadPushProvider({ apiKey: 'api-key', appId: 'app-id' })],
  ] as const)('%s parses generic { eventId, eventType } activity payloads', (_name, createProvider) => {
    const provider = createProvider();
    const eventId = 'A0E2DB50-21D8-4F99-93C9-2BC0A4D32228';
    const body = {
      eventId,
      eventType: PushEventStatusEnum.CLICKED,
      platform: 'ios',
    };

    expect(provider.getMessageId(body)).toEqual([eventId]);
    expect(provider.getMessageId({})).toEqual([]);

    const parsed = provider.parseEventBody(body, eventId);

    expect(parsed?.status).toBe(PushEventStatusEnum.CLICKED);
    expect(parsed?.row).toBe(JSON.stringify(body));
    expect(parsed?.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
