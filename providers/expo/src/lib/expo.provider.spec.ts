import { ExpoPushTicket } from 'expo-server-sdk';
import { ExpoPushProvider } from './expo.provider';

describe('Expo', () => {
  test('should trigger expo correctly', async () => {
    const provider = new ExpoPushProvider({
      accessToken: 'access-token',
    });

    const spy = jest
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .spyOn(provider.expo, 'sendPushNotificationsAsync')
      .mockImplementation(async () => {
        return [{ status: 'ok', id: '501b1c08-292a-41d7-a36e-461c223e4744' }];
      });

    const result = await provider.sendMessage({
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

    expect(result.id).toEqual('501b1c08-292a-41d7-a36e-461c223e4744');
  });

  test('should throw an error if expo returns an error', async () => {
    const provider = new ExpoPushProvider({
      accessToken: 'access-token',
    });

    const spy = jest
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .spyOn(provider.expo, 'sendPushNotificationsAsync')
      .mockImplementation(async () => {
        return [
          {
            status: 'error',
            message:
              '"invalidDeviceToken" is not a registered push notification recipient',
          },
        ];
      });

    try {
      await provider.sendMessage({
        title: 'Test',
        content: 'Test push',
        target: ['invalidDeviceToken'],
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
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error.message).toEqual(
        '"invalidDeviceToken" is not a registered push notification recipient'
      );
    }

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
        to: ['invalidDeviceToken'],
      },
    ]);
  });

  test('should throw an error if expo returns an unexpected status code', async () => {
    const provider = new ExpoPushProvider({
      accessToken: 'access-token',
    });

    const spy = jest
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .spyOn(provider.expo, 'sendPushNotificationsAsync')
      .mockImplementation(async () => {
        return [
          {
            status: 'unknown-status',
            message: 'We changed our API',
          } as any as ExpoPushTicket,
        ];
      });

    try {
      await provider.sendMessage({
        title: 'Test',
        content: 'Test push',
        target: ['deviceToken'],
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
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error.message).toEqual('Unexpected Expo status');
    }

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
        to: ['deviceToken'],
      },
    ]);
  });
});
