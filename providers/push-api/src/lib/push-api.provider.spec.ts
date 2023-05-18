import { SendResult } from 'web-push';
import { PushApiPushProvider } from './push-api.provider';
import webpush from 'web-push';

const createProvider = () =>
  new PushApiPushProvider({
    vapidPublicKey:
      'BDPVLslNDLYS8V4w_fLeRk4NQAycUR6iiMN3JeE5VdupdaNowZ8y-uoQvRDSe4IFuXg9my0KIXhMuF8itqL41hk    ',
    vapidPrivateKey: '-qVrW2wrDZSrSt7KUXCPCYLfhrxly2DfbxwnJhuKbOU',
  });

const createMockSend = (result: SendResult) =>
  jest.fn(() => {
    return Promise.resolve(result);
  });

const createMockSubscription = () =>
  ({
    endpoint: '',
    keys: {},
  } as PushSubscriptionJSON);

test('should trigger push-api library correctly', async () => {
  const startTime = new Date();
  const mockSend = createMockSend({
    statusCode: 200,
  } as SendResult);

  jest.spyOn(webpush, 'sendNotification').mockImplementation(mockSend);

  const provider = createProvider();
  const subscription = createMockSubscription();
  const subscriptionJSON = JSON.stringify(subscription);

  const target = [Buffer.from(subscriptionJSON, 'ascii').toString('base64')];

  const result = await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target,
    payload: {},
  });

  expect(mockSend).toHaveBeenCalled();
  expect(mockSend).toHaveReturned();

  expect(result.id).not.toBeUndefined();
  expect(new Date(result.date).getTime()).toBeGreaterThan(startTime.getTime());
});

test('push-api send should fail due to dependency failure', async () => {
  const mockSend = createMockSend({
    statusCode: 404,
  } as SendResult);

  jest.spyOn(webpush, 'sendNotification').mockImplementation(mockSend);

  const provider = createProvider();
  const subscription = createMockSubscription();
  const subscriptionJSON = JSON.stringify(subscription);
  const target = [Buffer.from(subscriptionJSON, 'ascii').toString('base64')];

  const result = provider.sendMessage({
    title: 'Test Failure',
    content: 'Test Failure',
    target,
    payload: {},
  });

  expect(result).rejects.toThrow();
  expect(result).rejects.toHaveProperty(
    'failures',
    expect.arrayContaining([{ statusCode: 404 }])
  );
});

test('push-api send should fail due to malformed target', async () => {
  const mockSend = createMockSend({
    statusCode: 404,
  } as SendResult);

  jest.spyOn(webpush, 'sendNotification').mockImplementation(mockSend);

  const provider = createProvider();
  const subscription = createMockSubscription();
  const malformedSubscriptionJSON = JSON.stringify(subscription);
  const target = [malformedSubscriptionJSON];

  const result = provider.sendMessage({
    title: 'Test Failure',
    content: 'Test Failure',
    target,
    payload: {},
  });

  expect(result).rejects.toThrow();
  expect(result).rejects.toHaveProperty(
    'failures',
    expect.arrayContaining([
      {
        statusCode: -1,
        body: new SyntaxError('Unexpected token z in JSON at position 0'),
      },
    ])
  );
});
