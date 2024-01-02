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
    webhookUrl: 'http://127.0.0.1:8080/webhook',
    hmacSecretKey: 'super-secret-key',
  });

  const subscriber = {};
  const step = { digest: false, events: [{}], total_count: 1 };

  await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: {
      sound: 'test_sound',
    },
    subscriber,
    step,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'http://127.0.0.1:8080/webhook',
    JSON.stringify({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        sound: 'test_sound',
        subscriber,
        step,
      },
    }),
    {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature':
          'ebb2ff6420df59a863a6ddfa64ca8721cbbce038d5432c441cde83dee43b70d9',
      },
    }
  );
});
