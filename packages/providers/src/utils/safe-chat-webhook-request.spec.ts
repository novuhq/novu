import { expect, test } from 'vitest';
import { resolveSafeChatWebhookUrl } from './safe-chat-webhook-request';

test('accepts public https webhook URLs', () => {
  const url = resolveSafeChatWebhookUrl('https://hooks.slack.com/services/T00/B00/xxx');

  expect(url).toBe('https://hooks.slack.com/services/T00/B00/xxx');
});

test('rejects localhost webhook URLs', () => {
  expect(() => resolveSafeChatWebhookUrl('http://localhost:8080/webhook')).toThrow(
    'Chat webhook URL blocked: Requests to "localhost" are not allowed.'
  );
});

test('rejects unsupported schemes', () => {
  expect(() => resolveSafeChatWebhookUrl('file:///etc/passwd')).toThrow(
    'Chat webhook URL blocked: Invalid URL format.'
  );
});
