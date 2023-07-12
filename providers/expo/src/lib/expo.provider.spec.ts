import { ExpoPushProvider } from './expo.provider';

test('should trigger expo correctly', async () => {
  const provider = new ExpoPushProvider({
    accessToken: 'access-token',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.expo, 'sendPushNotificationsAsync')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [{}] as any;
    });

  await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: {
      sound: 'test_sound',
    },
    subscriber: {},
    step: {
      digest: false,
      events: [{}],
      total_count: 1,
    },
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  expect(provider.expo).toBeDefined();
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith([
    {
      badge: undefined,
      body: 'Test push',
      data: {
        sound: 'test_sound',
      },
      sound: null,
      title: 'Test',
      to: ['tester'],
    },
  ]);
});
