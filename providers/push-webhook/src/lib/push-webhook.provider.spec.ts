import { PushWebhookPushProvider } from './push-webhook.provider';
import axios from 'axios';

test('should trigger push-webhook library correctly', async () => {
  const fakePost = jest.fn(() => {
    return Promise.resolve({
      data: {
        id: '123',
      },
    });
  });

  jest.spyOn(axios, 'post').mockImplementation(fakePost);

  const provider = new PushWebhookPushProvider({
    webhookUrl: 'http://localhost:8080/webhook',
    hmacSecretKey: 'super-secret-key',
  });

  await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: {
      sound: 'test_sound',
    },
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'http://localhost:8080/webhook',
    JSON.stringify({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        sound: 'test_sound',
      },
    }),
    {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature':
          '39350928c49e8a2bde72d29f43325e5d99291a756ced0f9034f7659cfd2c5d34',
      },
    }
  );
});
