import { expect, test, vi } from 'vitest';
import apn from '@parse/node-apn';
import { APNSPushProvider } from './apns.provider';

test('should trigger apns library correctly', async () => {
  const mockSend = vi.fn(() => {
    return {
      failed: [],
      sent: [
        {
          device: 'device',
        },
      ],
    };
  });

  vi.spyOn(apn as any, 'Provider').mockImplementation(() => {
    return {
      send: mockSend,
      shutdown: () => {},
    };
  });

  const provider = new APNSPushProvider({
    key: 'key',
    keyId: 'keyId',
    teamId: 'teamId',
    bundleId: 'bundleId',
    production: true,
  });

  await provider.sendMessage({
    target: ['target'],
    title: 'title',
    content: 'content',
    payload: {
      data: 'data',
    },
    step: {
      digest: false,
      events: undefined,
      total_count: undefined,
    },
    subscriber: {},
  });

  expect(mockSend).toBeCalledWith(
    {
      encoding: 'utf8',
      payload: { data: 'data' },
      compiled: false,
      aps: {
        alert: {
          body: 'content',
          title: 'title',
        },
      },
      expiry: -1,
      priority: 10,
      topic: 'bundleId',
    },
    ['target'],
  );
});

test('should trigger apns library correctly with _passthrough', async () => {
  const mockSend = vi.fn(() => {
    return {
      failed: [],
      sent: [
        {
          device: 'device',
        },
      ],
    };
  });

  vi.spyOn(apn as any, 'Provider').mockImplementation(() => {
    return {
      send: mockSend,
      shutdown: () => {},
    };
  });

  const provider = new APNSPushProvider({
    key: 'key',
    keyId: 'keyId',
    teamId: 'teamId',
    bundleId: 'bundleId',
    production: true,
  });

  await provider.sendMessage(
    {
      target: ['target'],
      title: 'title',
      content: 'content',
      payload: {
        data: 'data',
      },
      step: {
        digest: false,
        events: undefined,
        total_count: undefined,
      },
      subscriber: {},
    },
    {
      urlArgs: ['target'],
      _passthrough: {
        body: {
          topic: '_passthrough',
        },
      },
    },
  );

  expect(mockSend).toBeCalledWith(
    {
      encoding: 'utf8',
      payload: { data: 'data' },
      compiled: false,
      aps: {
        alert: {
          body: 'content',
          title: 'title',
        },
      },
      expiry: -1,
      priority: 10,
      topic: '_passthrough',
      'url-args': ['target'],
    },
    ['target'],
  );
});
