import { expect, test, vi, beforeEach, describe } from 'vitest';
import { IPushOptions } from '@novu/stateless';
import app from 'firebase-admin/app';

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

vi.mock(import('firebase-admin/messaging'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    getMessaging: vi.fn(() => {
      return {
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
      };
    }),
  };
});

vi.mock(import('firebase-admin/app'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    default: vi.fn(),
    getApp: vi.fn(() => mockApp),
    deleteApp: vi.fn(),
    cert: vi.fn(),
    initializeApp: vi.fn(() => mockApp),
  };
});

vi.mock(import('firebase-admin'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    initializeApp: vi.fn(),
  };
});

describe.skip('FcmPushProvider', () => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      },
    );
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test 1',
        body: 'Test push',
      },
      tokens: ['tester'],
      registration_ids: ['test'],
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
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
      data: { foo: 'bar' },
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
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
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
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test',
        body: 'Test push',
      },
      tokens: ['tester'],
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
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
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
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
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
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
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
        expect(app.initializeApp).toHaveBeenCalledTimes(1);
        expect(app.cert).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith({
          tokens: [token],
          data: {
            title: 'Test',
            body: 'Test push',
            message: 'Test push',
            sound: 'test_sound',
          },
        });
      }),
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
            tokens: ['tokens'],
          },
        },
      },
    );
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      notification: {
        title: 'Test 1',
        body: 'Test push',
      },
      tokens: ['tester', 'tokens'],
      registration_ids: ['test'],
    });
  });
});
