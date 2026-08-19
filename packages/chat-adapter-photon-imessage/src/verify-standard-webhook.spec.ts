import { createHmac } from 'node:crypto';
import { expect, test } from 'vitest';
import { buildStandardWebhookVerifier } from './verify-standard-webhook.js';

const KEY_BYTES = Buffer.from('test-signing-key-material-123456');
const SECRET = `whsec_${KEY_BYTES.toString('base64')}`;

function sign(webhookId: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', KEY_BYTES).update(`${webhookId}.${timestamp}.${rawBody}`).digest('base64');
}

function buildRequest(headers: Record<string, string>): Request {
  return new Request('https://example.test/webhook', { method: 'POST', headers });
}

test('accepts a valid v1 signature', () => {
  const verify = buildStandardWebhookVerifier(SECRET);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = '{"event":"messages"}';

  const request = buildRequest({
    'webhook-id': 'msg_1',
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${sign('msg_1', timestamp, rawBody)}`,
  });

  expect(verify(request, rawBody)).toBe(true);
});

test('accepts when one of several rotation signatures matches', () => {
  const verify = buildStandardWebhookVerifier(SECRET);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = '{"event":"messages"}';

  const request = buildRequest({
    'webhook-id': 'msg_1',
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${Buffer.from('wrong').toString('base64')} v1,${sign('msg_1', timestamp, rawBody)}`,
  });

  expect(verify(request, rawBody)).toBe(true);
});

test('rejects a tampered body', () => {
  const verify = buildStandardWebhookVerifier(SECRET);
  const timestamp = String(Math.floor(Date.now() / 1000));

  const request = buildRequest({
    'webhook-id': 'msg_1',
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${sign('msg_1', timestamp, '{"event":"messages"}')}`,
  });

  expect(() => verify(request, '{"event":"tampered"}')).toThrow(/Invalid webhook signature/);
});

test('rejects a stale timestamp', () => {
  const verify = buildStandardWebhookVerifier(SECRET);
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600);
  const rawBody = '{}';

  const request = buildRequest({
    'webhook-id': 'msg_1',
    'webhook-timestamp': staleTimestamp,
    'webhook-signature': `v1,${sign('msg_1', staleTimestamp, rawBody)}`,
  });

  expect(() => verify(request, rawBody)).toThrow(/Stale webhook timestamp/);
});

test('rejects missing headers', () => {
  const verify = buildStandardWebhookVerifier(SECRET);

  expect(() => verify(buildRequest({}), '{}')).toThrow(/Missing Standard Webhooks headers/);
});
