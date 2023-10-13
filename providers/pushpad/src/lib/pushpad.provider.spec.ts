import { PushpadPushProvider } from './pushpad.provider';

test('should trigger pushpad library correctly', async () => {
  const provider = new PushpadPushProvider({
    apiKey: 'test-token',
    appId: '012345',
  });

  const mockDeliverTo = jest.fn();
  const mockBuildNotification = jest
    .spyOn(provider, 'buildNotification' as any)
    .mockReturnValue({ deliverTo: mockDeliverTo });

  const result = await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: {},
    subscriber: {},
    step: {
      digest: false,
      events: [{}],
      total_count: 1,
    },
  });

  expect(mockBuildNotification).toHaveBeenCalled();
  expect(mockDeliverTo).toHaveBeenCalledTimes(1);

  expect(result).toHaveProperty('id');
  expect(result).toHaveProperty('date');
});
