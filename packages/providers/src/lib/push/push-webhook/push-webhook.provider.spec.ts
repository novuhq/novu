import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { PushWebhookPushProvider } from './push-webhook.provider';

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
        'X-Novu-Signature': 'ebb2ff6420df59a863a6ddfa64ca8721cbbce038d5432c441cde83dee43b70d9',
      },
    }
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
    }
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
        'X-Novu-Signature': '5147e1613526bad56a1c0e318ebbdd7d312c7760dcb8230f3f4c80c07d9ebdd0',
      },
    }
  );
});

test('should use webhookUrl from bridgeProviderData over config', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: {
      id: '456',
    },
  });

  const provider = new PushWebhookPushProvider({
    webhookUrl: 'http://127.0.0.1:8080/default-webhook',
    hmacSecretKey: 'super-secret-key',
  });

  const subscriber = {};
  const step = { digest: false, events: [{}], total_count: 1 };

  await provider.sendMessage(
    {
      title: 'Override Test',
      content: 'Test override',
      target: ['tester'],
      payload: {},
      subscriber,
      step,
    },
    {
      webhookUrl: 'http://127.0.0.1:9090/subscriber-webhook',
    }
  );

  expect(fakePost).toHaveBeenCalled();
  // The override URL should be used, not the config URL
  expect(fakePost.mock.calls[0][0]).toBe('http://127.0.0.1:9090/subscriber-webhook');
});

test('should use hmacSecretKey from bridgeProviderData over config', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: {
      id: '789',
    },
  });

  const provider = new PushWebhookPushProvider({
    webhookUrl: 'http://127.0.0.1:8080/webhook',
    hmacSecretKey: 'default-secret',
  });

  const subscriber = {};
  const step = { digest: false, events: [{}], total_count: 1 };

  await provider.sendMessage(
    {
      title: 'HMAC Test',
      content: 'Test hmac override',
      target: ['tester'],
      payload: {},
      subscriber,
      step,
    },
    {
      hmacSecretKey: 'override-secret',
    }
  );

  expect(fakePost).toHaveBeenCalled();
  // The URL should still be the config URL
  expect(fakePost.mock.calls[0][0]).toBe('http://127.0.0.1:8080/webhook');

  // The HMAC signature should be computed with the override secret, not the default
  const body = fakePost.mock.calls[0][1] as string;
  const headers = fakePost.mock.calls[0][2] as { headers: Record<string, string> };
  const crypto = await import('crypto');
  const expectedHmac = crypto.createHmac('sha256', 'override-secret').update(body, 'utf-8').digest('hex');
  expect(headers.headers['X-Novu-Signature']).toBe(expectedHmac);
});

test('should not leak webhookUrl or hmacSecretKey into the request body', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: {
      id: '101',
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
      title: 'Leak Test',
      content: 'Test no leak',
      target: ['tester'],
      payload: {},
      subscriber,
      step,
    },
    {
      webhookUrl: 'http://127.0.0.1:9090/override',
      hmacSecretKey: 'override-secret',
    }
  );

  const sentBody = JSON.parse(fakePost.mock.calls[0][1] as string);
  expect(sentBody).not.toHaveProperty('webhookUrl');
  expect(sentBody).not.toHaveProperty('hmacSecretKey');
});
