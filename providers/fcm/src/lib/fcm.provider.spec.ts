import app from 'firebase-admin/app';
import { FcmPushProvider } from './fcm.provider';

let provider: FcmPushProvider;
let spy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mock('firebase-admin');

  provider = new FcmPushProvider({
    secretKey: '--BEGIN PRIVATE KEY--abc',
    projectId: 'test',
    email: 'test@iam.firebase.google.com',
  });

  spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.messaging, 'sendMulticast')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });
});

test('should trigger fcm correctly', async () => {
  await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: {
      sound: 'test_sound',
    },
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
    },
  });
});
