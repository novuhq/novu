import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { PusherBeamsPushProvider } from './pusher-beams.provider';

test('should trigger pusher-beams library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: { publishId: 'pubid-3a7e97ee-a4bc-4d8f-a40b-74915ce808ae' },
  });

  const provider = new PusherBeamsPushProvider({
    instanceId: '<instance-id>',
    secretKey: '<secret-key',
  });

  const result = await provider.sendMessage({
    target: ['tester'],
    title: 'Hello',
    content: 'Hello, world!',
    subscriber: {},
    step: {
      digest: false,
      events: [{}],
      total_count: 1,
    },
    payload: {
      custom_payload_1: 'custom_payload_1',
    },
    overrides: {
      sound: 'custom_sound',
    },
  });

  // @ts-expect-error
  expect(provider.axiosInstance).toBeDefined();
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(`/publishes/users`, {
    users: ['tester'],
    apns: {
      aps: {
        alert: {
          title: 'Hello',
          body: 'Hello, world!',
        },
        sound: 'custom_sound',
      },
    },
    fcm: {
      notification: {
        title: 'Hello',
        body: 'Hello, world!',
        sound: 'custom_sound',
      },
      data: {
        custom_payload_1: 'custom_payload_1',
      },
    },
    web: {
      notification: {
        title: 'Hello',
        body: 'Hello, world!',
      },
      data: {
        custom_payload_1: 'custom_payload_1',
      },
    },
  });

  expect(result.id).toEqual('pubid-3a7e97ee-a4bc-4d8f-a40b-74915ce808ae');
});

test('should trigger pusher-beams library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: { publishId: 'pubid-3a7e97ee-a4bc-4d8f-a40b-74915ce808ae' },
  });

  const provider = new PusherBeamsPushProvider({
    instanceId: '<instance-id>',
    secretKey: '<secret-key',
  });

  const result = await provider.sendMessage(
    {
      target: ['tester'],
      title: 'Hello',
      content: 'Hello, world!',
      subscriber: {},
      step: {
        digest: false,
        events: [{}],
        total_count: 1,
      },
      payload: {
        custom_payload_1: 'custom_payload_1',
      },
      overrides: {
        sound: 'custom_sound',
      },
    },
    {
      _passthrough: {
        body: {
          users: ['tester1'],
        },
      },
    },
  );

  // @ts-expect-error
  expect(provider.axiosInstance).toBeDefined();
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(`/publishes/users`, {
    users: ['tester', 'tester1'],
    apns: {
      aps: {
        alert: {
          title: 'Hello',
          body: 'Hello, world!',
        },
        sound: 'custom_sound',
      },
    },
    fcm: {
      notification: {
        title: 'Hello',
        body: 'Hello, world!',
        sound: 'custom_sound',
      },
      data: {
        custom_payload_1: 'custom_payload_1',
      },
    },
    web: {
      notification: {
        title: 'Hello',
        body: 'Hello, world!',
      },
      data: {
        custom_payload_1: 'custom_payload_1',
      },
    },
  });

  expect(result.id).toEqual('pubid-3a7e97ee-a4bc-4d8f-a40b-74915ce808ae');
});
