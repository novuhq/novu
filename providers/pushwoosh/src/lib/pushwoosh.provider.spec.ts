import { PushwooshPushProvider } from './pushwoosh.provider';

test('should trigger pushwoosh library correctly', async () => {
  const provider = new PushwooshPushProvider({
    applicationCode: 'Some code',
    autoSubscribe: true,
    defaultNotificationTitle: 'Test Title',
    triggeredFunction: () => console.log('Test'),
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.pushwoosh, 'addEventHandler')
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
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  expect(provider.expo).toBeDefined();
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith([
    {
      triggeredFunction: () => console.log('Test'),
    },
  ]);
});
