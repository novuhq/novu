import { PushpadPushProvider } from './pushpad.provider';

jest.mock('pushpad', () => {
  class MockNotification {
    deliverTo(target, callback) {
      setTimeout(() => {
        callback(null, { id: 12345 });
      }, 100);
    }
  }

  return {
    ...jest.requireActual('pushpad'),
    Notification: MockNotification,
  };
});

test('should trigger pushpad library correctly', async () => {
  const provider = new PushpadPushProvider({
    apiKey: 'api-key-123',
    appId: '841',
  });

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

  expect(result.id).toBe('12345');
});
