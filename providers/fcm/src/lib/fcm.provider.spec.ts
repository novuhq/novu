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
