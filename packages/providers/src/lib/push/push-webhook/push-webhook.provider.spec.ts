import { expect, test } from 'vitest';
import { PushWebhookPushProvider } from './push-webhook.provider';
import { axiosSpy } from '../../../utils/test/spy-axios';

test('should trigger push-webhook library correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: {
      id: '123',
    },
  });

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
    },
  );
});

test('should trigger push-webhook library correctly with _passthrough', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: {
      id: '123',
    },
  });

  const provider = new PushWebhookPushProvider({
    webhookUrl: 'http://127.0.0.1:8080/webhook',
    hmacSecretKey: 'super-secret-key',
  });

  const subscriber = {};
  const step = { digest: false, events: [{}], total_count: 1 };

  await provider.sendMessage(
    {
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {
        sound: 'test_sound',
      },
      subscriber,
      step,
    },
    {
      _passthrough: {
        body: {
          content: 'test _passthrough',
        },
      },
    },
  );

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'http://127.0.0.1:8080/webhook',
    JSON.stringify({
      title: 'Test',
      content: 'test _passthrough',
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
          '5147e1613526bad56a1c0e318ebbdd7d312c7760dcb8230f3f4c80c07d9ebdd0',
      },
    },
  );
});
