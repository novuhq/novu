import { expect, test } from 'vitest';
import axios from 'axios';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { EmailWebhookProvider } from './email-webhook.provider';

test('should trigger email-webhook-provider library correctly', async () => {
  const { mockPost } = axiosSpy({
    data: true,
  });

  const provider = new EmailWebhookProvider({
    webhookUrl: 'http://127.0.0.1:8080/webhook',
    hmacSecretKey: 'super-secret-key',
    retryDelay: 1,
    retryCount: 1,
  });

  const testTo = 'johndoe@example.com';
  const testFrom = 'janedoe@example.com';

  const payload = {
    to: [testTo],
    from: testFrom,
    subject: 'test',
    html: '<h1>test</h1>',
    text: 'test',
  };

  await provider.sendMessage(payload);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(
    'http://127.0.0.1:8080/webhook',
    '{"to":["johndoe@example.com"],"from":"janedoe@example.com","subject":"test","html":"<h1>test</h1>","text":"test"}',
    {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature':
          'd1e94cd19eeceec2e0717e36f7edacaa93612b311bde8756ee35b89d4a994767',
      },
    },
  );
});

test('should trigger email-webhook-provider library correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: true,
  });

  const provider = new EmailWebhookProvider({
    webhookUrl: 'http://127.0.0.1:8080/webhook',
    hmacSecretKey: 'super-secret-key',
    retryDelay: 1,
    retryCount: 1,
  });

  const testTo = 'johndoe@example.com';
  const testFrom = 'janedoe@example.com';

  const payload = {
    to: [testTo],
    from: testFrom,
    subject: 'test',
    html: '<h1>test</h1>',
    text: 'test',
  };

  await provider.sendMessage(payload, {
    _passthrough: {
      body: {
        subject: 'test _passthrough',
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(
    'http://127.0.0.1:8080/webhook',
    '{"to":["johndoe@example.com"],"from":"janedoe@example.com","subject":"test _passthrough","html":"<h1>test</h1>","text":"test"}',
    {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature':
          'b0bfe55e55cfc925891858e6a7a77d1da5e3917321ae4f440e1e81843b2f5fa7',
      },
    },
  );
});
