import { expect, test, vi } from 'vitest';
import { PushpadPushProvider } from './pushpad.provider';
import Pushpad from 'pushpad';

test('should trigger pushpad library correctly', async () => {
  const spy = vi.spyOn(Pushpad, 'Notification').mockImplementation(() => {
    return {
      deliverTo: vi.fn((target, callback) => {
        callback(null, { id: 12345 });
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };
  });

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
  expect(spy).toBeCalledWith({
    project: { authToken: 'api-key-123', projectId: '841' },
    body: 'Test push',
    title: 'Test',
  });
});

test('should trigger pushpad library correctly with _passthrough', async () => {
  const spy = vi.spyOn(Pushpad, 'Notification').mockImplementation(() => {
    return {
      deliverTo: vi.fn((target, callback) => {
        callback(null, { id: 12345 });
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };
  });

  const provider = new PushpadPushProvider({
    apiKey: 'api-key-123',
    appId: '841',
  });

  const result = await provider.sendMessage(
    {
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
    },
    {
      _passthrough: {
        body: {
          title: 'Test passthrough',
        },
      },
    }
  );

  expect(result.id).toBe('12345');
  expect(spy).toBeCalledWith({
    project: { authToken: 'api-key-123', projectId: '841' },
    body: 'Test push',
    title: 'Test passthrough',
  });
});
