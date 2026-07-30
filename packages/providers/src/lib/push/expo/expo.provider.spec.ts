import { ExpoPushTicket } from 'expo-server-sdk';
import { describe, expect, test, vi } from 'vitest';
import { ExpoPushProvider } from './expo.provider';

const TICKET_ID = '501b1c08-292a-41d7-a36e-461c223e4744';

const basePushOptions = (target = 'tester') => ({
  title: 'Test',
  content: 'Test push',
  target: [target],
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

const baseExpectedMessage = (overrides: Record<string, unknown> = {}) => ({
  badge: undefined,
  body: 'Test push',
  data: {
    sound: 'test_sound',
  },
  sound: null,
  title: 'Test',
  to: ['tester'],
  ...overrides,
});

function createExpoProviderWithSendSpy(tickets: ExpoPushTicket[] = [{ status: 'ok', id: TICKET_ID }]) {
  const provider = new ExpoPushProvider({
    accessToken: 'access-token',
  });

  const spy = vi
    // @ts-expect-error
    .spyOn(provider.expo, 'sendPushNotificationsAsync')
    .mockImplementation(async () => {
      return tickets;
    });

  return { provider, spy };
}

describe('Expo', () => {
  test('should trigger expo correctly', async () => {
    const { provider, spy } = createExpoProviderWithSendSpy();

    const result = await provider.sendMessage(basePushOptions());

    // @ts-expect-error
    expect(provider.expo).toBeDefined();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([baseExpectedMessage()]);

    expect(result.id).toEqual(TICKET_ID);
  });

  test('should throw an error if expo returns an error', async () => {
    const { provider, spy } = createExpoProviderWithSendSpy([
      {
        status: 'error',
        message: '"invalidDeviceToken" is not a registered push notification recipient',
      },
    ]);

    try {
      await provider.sendMessage(basePushOptions('invalidDeviceToken'));
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error.message).toEqual('"invalidDeviceToken" is not a registered push notification recipient');
    }

    // @ts-expect-error
    expect(provider.expo).toBeDefined();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([baseExpectedMessage({ to: ['invalidDeviceToken'] })]);
  });

  test('should throw an error if expo returns an unexpected status code', async () => {
    const { provider, spy } = createExpoProviderWithSendSpy([
      {
        status: 'unknown-status',
        message: 'We changed our API',
      } as any as ExpoPushTicket,
    ]);

    try {
      await provider.sendMessage(basePushOptions('deviceToken'));
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error.message).toEqual('Unexpected Expo status');
    }

    // @ts-expect-error
    expect(provider.expo).toBeDefined();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([baseExpectedMessage({ to: ['deviceToken'] })]);
  });

  test('should trigger expo correctly with _passthrough', async () => {
    const { provider, spy } = createExpoProviderWithSendSpy();

    const result = await provider.sendMessage(basePushOptions(), {
      _passthrough: {
        body: {
          badge: '_passthrough',
        },
      },
    });

    // @ts-expect-error
    expect(provider.expo).toBeDefined();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([baseExpectedMessage({ badge: '_passthrough' })]);

    expect(result.id).toEqual(TICKET_ID);
  });

  test('should pass bridgeProviderData keys through to Expo unchanged', async () => {
    const { provider, spy } = createExpoProviderWithSendSpy();

    await provider.sendMessage(basePushOptions(), {
      tag: 'order-42',
      collapseId: 'orders',
      interruptionLevel: 'time-sensitive',
      badge: 3,
    });

    expect(spy).toHaveBeenCalledWith([
      baseExpectedMessage({
        badge: 3,
        tag: 'order-42',
        collapseId: 'orders',
        interruptionLevel: 'time-sensitive',
      }),
    ]);
  });
});
