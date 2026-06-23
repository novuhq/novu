import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect, test, vi } from 'vitest';
import { resolveSafeChatWebhookUrl, safeChatWebhookJsonRequest } from './safe-chat-webhook-request';

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

test('throws on non-2xx HTTP responses', async () => {
  vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue({
    statusCode: 400,
    statusMessage: 'Bad Request',
    headers: {},
    body: { error: 'invalid_payload' },
  });

  await expect(
    safeChatWebhookJsonRequest({
      url: 'https://hooks.example.com/webhook',
      body: { text: 'hello' },
    })
  ).rejects.toThrow('Chat webhook URL blocked: Request failed with status 400');
});
