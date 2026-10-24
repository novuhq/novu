import { IPushOptions } from '@novu/stateless';
import { cert, initializeApp } from 'firebase-admin/app';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { FcmPushProvider } from './fcm.provider';

const sendEachForMulticast = vi.fn().mockResolvedValue({ successCount: 1 });
const mockApp = {
  appCheck: vi.fn() as any,
  auth: vi.fn() as any,
  database: vi.fn() as any,
  firestore: vi.fn() as any,
  installations: vi.fn() as any,
  instanceId: vi.fn() as any,
  machineLearning: vi.fn() as any,
  projectManagement: vi.fn() as any,
  remoteConfig: vi.fn() as any,
  securityRules: vi.fn() as any,
  storage: vi.fn() as any,
  delete: vi.fn() as any,
};

vi.mock('firebase-admin/messaging', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin/messaging')>();

  return {
    ...actual,
    getMessaging: vi.fn(() => ({
      send: vi.fn(),
      sendEach: vi.fn(),
      sendAll: vi.fn(),
      sendEachForMulticast,
      sendToDevice: vi.fn(),
      sendToDeviceGroup: vi.fn(),
      sendToTopic: vi.fn(),
      sendToCondition: vi.fn(),
      subscribeToTopic: vi.fn(),
      unsubscribeFromTopic: vi.fn(),
      app: mockApp,
    })),
  };
});

vi.mock('firebase-admin/app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin/app')>();

  return {
    ...actual,
    getApp: vi.fn(() => mockApp),
    deleteApp: vi.fn(),
    cert: vi.fn(),
    initializeApp: vi.fn(() => mockApp),
  };
});

vi.mock('firebase-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin')>();

  return {
    ...actual,
    initializeApp: vi.fn(() => mockApp),
  };
});

describe('FcmPushProvider', () => {
  let provider: FcmPushProvider;
  let spy: ReturnType<typeof vi.spyOn>;
  const subscriber = {};
  const step: IPushOptions['step'] = {
    digest: false,
    events: [{}],
    total_count: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new FcmPushProvider({
      secretKey: '--BEGIN PRIVATE KEY--abc',
      projectId: 'test',
      email: 'test@iam.firebase.google.com',
    });

    spy = vi

      // @ts-expect-error
      .spyOn(provider.messaging, 'sendEachForMulticast')
      .mockImplementation(async () => {
        return {} as any;
      });
  });

  test('should trigger fcm correctly', async () => {
    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {
          sound: 'test_sound',
        },
        subscriber,
        step,
      },
      {
        registrationIds: ['test'],
        notification: {
          title: 'Test 1',
        },
      }
    );
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test 1',
        body: 'Test push',
      },
      tokens: ['tester'],
      registrationIds: ['test'],
      data: { sound: 'test_sound' },
    });
  });

  test('should preserve camelCase and nested bridge keys with NONE casing', async () => {
    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        fcmOptions: {
          analyticsLabel: 'checkout',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
        data: {
          orderId: 'ord_123',
        },
      }
    );

    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
      fcmOptions: {
        analyticsLabel: 'checkout',
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
      },
      data: {
        orderId: 'ord_123',
      },
    });
  });

  test('should trigger fcm with fcm options override', async () => {
    await provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        sound: 'test_sound',
      },
      overrides: {
        data: { foo: 'bar' },
        fcmOptions: {
          analyticsLabel: 'my-label',
        },
      },
      subscriber,
      step,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
      data: { sound: 'test_sound', foo: 'bar' },
      fcmOptions: {
        analyticsLabel: 'my-label',
      },
    });
  });

  test('should trigger fcm with android override', async () => {
    await provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        sound: 'test_sound',
      },
      overrides: {
        data: { foo: 'bar' },
        android: {
          notification: {
            title: 'Test',
            body: 'Test push',
          },
          data: {
            foo: 'bar',
          },
        },
      },
      subscriber,
      step,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
      data: { sound: 'test_sound', foo: 'bar' },
      android: {
        notification: {
          title: 'Test',
          body: 'Test push',
        },
        data: {
          foo: 'bar',
        },
      },
    });
  });

  test('should trigger fcm with apns (ios) override', async () => {
    await provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        sound: 'test_sound',
      },
      overrides: {
        apns: {
          payload: {
            aps: {
              notification: {
                title: 'Test',
                body: 'Test push',
              },
              data: {
                foo: 'bar',
              },
            },
          },
        },
      },
      subscriber,
      step,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
      data: { sound: 'test_sound' },
      apns: {
        payload: {
          aps: {
            notification: {
              title: 'Test',
              body: 'Test push',
            },
            data: {
              foo: 'bar',
            },
          },
        },
      },
    });
  });

  test('should trigger fcm data for ios with headers options', async () => {
    await provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        key_1: 'val_1',
        key_2: 'val_2',
      },
      overrides: {
        type: 'data',
        apns: {
          headers: {
            'apns-priority': '5',
          },
          payload: {
            aps: {
              alert: {
                'loc-key': 'some_body',
                'title-loc-key': 'some_title',
              },
              sound: 'demo.wav',
            },
          },
        },
      },
      subscriber,
      step,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      tokens: ['tester'],
      apns: {
        headers: {
          'apns-priority': '5',
        },
        payload: {
          aps: {
            alert: {
              'loc-key': 'some_body',
              'title-loc-key': 'some_title',
            },
            sound: 'demo.wav',
          },
        },
      },
      data: {
        key_1: 'val_1',
        key_2: 'val_2',
        title: 'Test',
        body: 'Test push',
        message: 'Test push',
      },
    });
  });

  test('should trigger fcm data for android with priority option', async () => {
    await provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        key_1: 'val_1',
        key_2: 'val_2',
      },
      overrides: {
        type: 'data',
        android: {
          data: {
            for_android: 'only',
          },
          priority: 'high',
        },
      },
      subscriber,
      step,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      tokens: ['tester'],
      android: {
        data: {
          for_android: 'only',
        },
        priority: 'high',
      },
      data: {
        key_1: 'val_1',
        key_2: 'val_2',
        title: 'Test',
        body: 'Test push',
        message: 'Test push',
      },
    });
  });

  test('should clean the payload for the FCM data message', async () => {
    const payload = {
      foo: 'bar',
      one: 1,
      isActive: true,
      object: { asd: 'asd' },
    };
    const cleanPayload = {
      foo: 'bar',
      one: '1',
      isActive: 'true',
      object: '{"asd":"asd"}',
      title: 'Test',
      body: 'Test push',
      message: 'Test push',
    };

    await provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload,
      overrides: {
        type: 'data',
        android: {
          data: {
            for_android: 'only',
          },
          priority: 'high',
        },
      },
      subscriber,
      step,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      tokens: ['tester'],
      android: {
        data: {
          for_android: 'only',
        },
        priority: 'high',
      },
      data: cleanPayload,
    });
  });

  test('should trigger fcm multiple times with the same overrides', async () => {
    const tokens = ['tester1', 'tester2'];
    const overrides: IPushOptions['overrides'] = {
      type: 'data',
      data: { foo: 'bar' },
    };

    await Promise.all(
      tokens.map(async (token) => {
        await provider.sendMessage({
          title: 'Test',
          content: 'Test push',
          target: [token],
          payload: {
            sound: 'test_sound',
          },
          overrides,
          subscriber,
          step,
        });
        expect(initializeApp).toHaveBeenCalledTimes(1);
        expect(cert).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith({
          tokens: [token],
          data: {
            foo: 'bar',
            title: 'Test',
            body: 'Test push',
            message: 'Test push',
            sound: 'test_sound',
          },
        });
      })
    );
  });

  test('should trigger fcm correctly with _passthrough', async () => {
    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {
          sound: 'test_sound',
        },
        subscriber,
        step,
      },
      {
        registrationIds: ['test'],
        notification: {
          title: 'Test 1',
        },
        _passthrough: {
          body: {
            android: { priority: 'high' },
          },
        },
      }
    );
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test 1',
        body: 'Test push',
      },
      tokens: ['tester'],
      registrationIds: ['test'],
      android: { priority: 'high' },
      data: { sound: 'test_sound' },
    });
  });

  test('should route from _passthrough.body when no schematized routing key is set', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/passthrough-topic');

    const result = await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        _passthrough: {
          body: {
            topic: 'news_updates',
          },
        },
      }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      topic: 'news_updates',
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
    expect(result.ids).toEqual(['projects/test/messages/passthrough-topic']);
  });

  test('should let _passthrough.body routing claim the whole group over a schematized destination', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/passthrough-wins');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['subscriber-token'],
        payload: {},
        subscriber,
        step,
      },
      {
        tokens: ['override-token-1', 'override-token-2'],
        _passthrough: {
          body: {
            topic: 'news_updates',
          },
        },
      }
    );

    // Exactly one destination reaches FCM — the losing `tokens` is not smuggled along.
    expect(sendSpy).toHaveBeenCalledWith({
      topic: 'news_updates',
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test('should ignore an unusable _passthrough.body routing value and keep the schematized destination', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('should-not-be-used');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['subscriber-token'],
        payload: {},
        subscriber,
        step,
      },
      {
        tokens: ['override-token-1'],
        _passthrough: {
          body: {
            topic: { $exists: true },
          },
        },
      }
    );

    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['override-token-1'],
      data: {},
    });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should send via messaging.send when bridgeProviderData has topic', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/topic-1');

    const result = await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        topic: 'news',
      }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      topic: 'news',
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
    expect(result.ids).toEqual(['projects/test/messages/topic-1']);
  });

  test('should send via messaging.send when bridgeProviderData has condition', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/condition-1');

    const result = await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        condition: "'stocks' in topics && 'tech' in topics",
      }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      condition: "'stocks' in topics && 'tech' in topics",
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
    expect(result.ids).toEqual(['projects/test/messages/condition-1']);
  });

  test('should send via messaging.send when bridgeProviderData has token', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/token-1');

    const result = await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        token: 'device-token-abc',
      }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      token: 'device-token-abc',
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
    expect(result.ids).toEqual(['projects/test/messages/token-1']);
  });

  test('should prefer token send path over topic when both are present in bridgeProviderData', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/token-wins');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        token: 'device-token-abc',
        topic: 'news',
      }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      token: 'device-token-abc',
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test('should prefer topic over tokens when both are present in bridgeProviderData', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/topic-wins');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        tokens: ['bridge-token-1', 'bridge-token-2'],
        topic: 'news',
      }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      topic: 'news',
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      data: {},
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test.each([
    ['topic', { topic: 'news' }],
    ['token', { token: 'device-token-abc' }],
    ['condition', { condition: "'stocks' in topics && 'tech' in topics" }],
  ])('should send a data-only message when type is data and routing is %s', async (_label, routing) => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/data-only');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {
          key_1: 'val_1',
        },
        overrides: {
          type: 'data',
          android: { priority: 'high' },
        },
        subscriber,
        step,
      },
      routing
    );

    expect(sendSpy).toHaveBeenCalledWith({
      ...routing,
      android: { priority: 'high' },
      data: {
        key_1: 'val_1',
        title: 'Test',
        body: 'Test push',
        message: 'Test push',
      },
    });
    expect(sendSpy.mock.calls[0][0]).not.toHaveProperty('notification');
    expect(spy).not.toHaveBeenCalled();
  });

  test('should merge payload and override data on a data-only topic send', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('projects/test/messages/data-only-merged');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {
          key_1: 'val_1',
        },
        overrides: {
          type: 'data',
          data: { foo: 'bar' },
        },
        subscriber,
        step,
      },
      { topic: 'news' }
    );

    expect(sendSpy).toHaveBeenCalledWith({
      topic: 'news',
      data: {
        key_1: 'val_1',
        foo: 'bar',
        title: 'Test',
        body: 'Test push',
        message: 'Test push',
      },
    });
    expect(sendSpy.mock.calls[0][0]).not.toHaveProperty('notification');
    expect(spy).not.toHaveBeenCalled();
  });

  test('should use multicast when bridgeProviderData has tokens alone', async () => {
    const sendSpy = vi
      // @ts-expect-error
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('should-not-be-used');

    await provider.sendMessage(
      {
        title: 'Test',
        content: 'Test push',
        target: ['tester'],
        payload: {},
        subscriber,
        step,
      },
      {
        tokens: ['bridge-token-1', 'bridge-token-2'],
      }
    );

    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      // routing.tokens replaces subscriber targets — not concatenated
      tokens: ['bridge-token-1', 'bridge-token-2'],
      data: {},
    });
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('FcmPushProvider notification message data', () => {
  let provider: FcmPushProvider;
  let multicastSpy: ReturnType<typeof vi.spyOn>;
  let topicSpy: ReturnType<typeof vi.spyOn>;
  const subscriber = {};
  const step: IPushOptions['step'] = {
    digest: false,
    events: [{}],
    total_count: 1,
  };

  const baseOptions: IPushOptions = {
    title: 'New transaction',
    content: 'You have a new transaction',
    target: ['tester'],
    payload: {},
    subscriber,
    step,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new FcmPushProvider({
      secretKey: '--BEGIN PRIVATE KEY--abc',
      projectId: 'test',
      email: 'test@iam.firebase.google.com',
    });

    multicastSpy = vi
      // @ts-expect-error - messaging is private
      .spyOn(provider.messaging, 'sendEachForMulticast')
      .mockResolvedValue({ successCount: 1, responses: [{ success: true, messageId: 'message-id' }] } as any);

    topicSpy = vi
      // @ts-expect-error - messaging is private
      .spyOn(provider.messaging, 'send')
      .mockResolvedValue('message-id' as any);
  });

  test('should send the trigger payload in the data object of a notification message', async () => {
    await provider.sendMessage({
      ...baseOptions,
      payload: {
        type: 'transaction',
        transaction_id: 'transaction_123',
        legal_entity_id: 'legalentity_456',
      },
    });

    expect(multicastSpy).toHaveBeenCalledWith({
      tokens: ['tester'],
      notification: {
        title: 'New transaction',
        body: 'You have a new transaction',
      },
      data: {
        type: 'transaction',
        transaction_id: 'transaction_123',
        legal_entity_id: 'legalentity_456',
      },
    });
  });

  test('should stringify non string payload values for the data object', async () => {
    await provider.sendMessage({
      ...baseOptions,
      payload: {
        amount: 1200,
        settled: false,
        meta: { currency: 'EUR' },
        tags: ['a', 'b'],
      },
    });

    expect((multicastSpy.mock.calls[0][0] as Record<string, unknown>).data).toEqual({
      amount: '1200',
      settled: 'false',
      meta: '{"currency":"EUR"}',
      tags: '["a","b"]',
    });
  });

  test('should let the fcm data override win over the trigger payload', async () => {
    await provider.sendMessage({
      ...baseOptions,
      payload: {
        transaction_id: 'from_payload',
        legal_entity_id: 'legalentity_456',
      },
      overrides: {
        data: { transaction_id: 'from_override' },
      },
    });

    expect((multicastSpy.mock.calls[0][0] as Record<string, unknown>).data).toEqual({
      transaction_id: 'from_override',
      legal_entity_id: 'legalentity_456',
    });
  });

  test('should drop payload keys that FCM reserves inside data', async () => {
    await provider.sendMessage({
      ...baseOptions,
      payload: {
        from: 'reserved',
        message_type: 'reserved',
        google_channel: 'reserved',
        gcm_channel: 'reserved',
        transaction_id: 'transaction_123',
      },
    });

    expect((multicastSpy.mock.calls[0][0] as Record<string, unknown>).data).toEqual({
      transaction_id: 'transaction_123',
    });
  });

  test('should keep the novu message id alongside the trigger payload', async () => {
    await provider.sendMessage({
      ...baseOptions,
      payload: {
        __nvMessageId: 'message_123',
        transaction_id: 'transaction_123',
      },
    });

    expect((multicastSpy.mock.calls[0][0] as Record<string, unknown>).data).toEqual({
      __nvMessageId: 'message_123',
      transaction_id: 'transaction_123',
    });
  });

  test('should send the trigger payload in the data object of a topic message', async () => {
    await provider.sendMessage(
      {
        ...baseOptions,
        payload: {
          transaction_id: 'transaction_123',
        },
      },
      { topic: 'topic-123' }
    );

    expect(multicastSpy).not.toHaveBeenCalled();
    expect(topicSpy).toHaveBeenCalledWith({
      topic: 'topic-123',
      notification: {
        title: 'New transaction',
        body: 'You have a new transaction',
      },
      data: {
        transaction_id: 'transaction_123',
      },
    });
  });
});
