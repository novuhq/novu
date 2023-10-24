import { PusherBeamsPushProvider } from './pusher-beams.provider';

test('should trigger pusher-beams library correctly', async () => {
  const provider = new PusherBeamsPushProvider({
    instanceId: '<instance-id>',
    secretKey: '<secret-key',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.beamsClient, 'publishToUsers')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { body: { id: 'result' } } as any;
    });

  await provider.sendMessage({
    target: ['tester'],
    title: '',
    subscriber: {},
    step: {
      digest: false,
      events: [{}],
      total_count: 1,
    },
    content: '',
    payload: {
      apns: {
        aps: {
          alert: {
            title: 'Hello',
            body: 'Hello, world!',
          },
        },
      },
      fcm: {
        notification: {
          title: 'Hello',
          body: 'Hello, world!',
        },
      },
      web: {
        notification: {
          title: 'Hello',
          body: 'Hello, world!',
        },
      },
    },
  });
});
