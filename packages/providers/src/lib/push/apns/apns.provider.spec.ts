import { APNSPushProvider } from './apns.provider';
import apn from '@parse/node-apn';

test('should trigger apns library correctly', async () => {
  const mockSend = jest.fn(() => {
    return {
      failed: [],
      sent: [
        {
          device: 'device',
        },
      ],
    };
  });

  jest.spyOn(apn, 'Provider').mockImplementation(() => {
    return {
      send: mockSend,
      shutdown: () => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
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
    ['target']
  );
});

test('should trigger apns library correctly with _passthrough', async () => {
  const mockSend = jest.fn(() => {
    return {
      failed: [],
      sent: [
        {
          device: 'device',
        },
      ],
    };
  });

  jest.spyOn(apn, 'Provider').mockImplementation(() => {
    return {
      send: mockSend,
      shutdown: () => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
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
    }
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
    ['target']
  );
});