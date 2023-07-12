import { OneSignalPushProvider } from './one-signal.provider';

test('should trigger OneSignal library correctly', async () => {
  const provider = new OneSignalPushProvider({
    appId: 'test-app-id',
    apiKey: 'test-key',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.oneSignal, 'createNotification')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { body: { id: 'result' } } as any;
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
  expect(provider.oneSignal).toBeDefined();
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    include_player_ids: ['tester'],
    headings: { en: 'Test' },
    contents: { en: 'Test push' },
    subtitle: { en: undefined },
    data: {
      sound: 'test_sound',
    },
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    ios_sound: undefined,
    android_sound: undefined,
    mutable_content: undefined,
    android_channel_id: undefined,
    small_icon: undefined,
    large_icon: undefined,
    chrome_icon: undefined,
    firefox_icon: undefined,
    ios_category: undefined,
  });
});
