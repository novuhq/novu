import app from 'firebase-admin/app';
import { FcmPushProvider } from './fcm.provider';

test('should trigger fcm correctly', async () => {
  jest.mock('firebase-admin');

  const provider = new FcmPushProvider({
    secretKey: '--BEGIN PRIVATE KEY--abc',
    projectId: 'test',
    email: 'test@iam.firebase.google.com',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.messaging, 'sendMulticast')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

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
