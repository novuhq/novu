import { createHmac } from 'node:crypto';
import { expect, test } from 'vitest';
import { buildSpectrumWebhookVerifier } from './verify-spectrum-webhook.js';

const SECRET = 'test-signing-secret-material-123456';

function sign(timestamp: string, rawBody: string): string {
  return createHmac('sha256', SECRET).update(`v0:${timestamp}:${rawBody}`).digest('hex');
}

function buildRequest(headers: Record<string, string>): Request {
  return new Request('https://example.test/webhook', { method: 'POST', headers });
}

test('accepts a valid v0 signature', () => {
  const verify = buildSpectrumWebhookVerifier(SECRET);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = '{"event":"messages"}';

  const request = buildRequest({
    'x-spectrum-timestamp': timestamp,
    'x-spectrum-signature': `v0=${sign(timestamp, rawBody)}`,
  });

  expect(verify(request, rawBody)).toBe(true);
});

test('accepts a bare hex signature without the v0= prefix', () => {
  const verify = buildSpectrumWebhookVerifier(SECRET);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = '{"event":"messages"}';

  const request = buildRequest({
    'x-spectrum-timestamp': timestamp,
    'x-spectrum-signature': sign(timestamp, rawBody),
  });

  expect(verify(request, rawBody)).toBe(true);
});

test('rejects a tampered body', () => {
  const verify = buildSpectrumWebhookVerifier(SECRET);
  const timestamp = String(Math.floor(Date.now() / 1000));

  const request = buildRequest({
    'x-spectrum-timestamp': timestamp,
    'x-spectrum-signature': `v0=${sign(timestamp, '{"event":"messages"}')}`,
  });

  expect(() => verify(request, '{"event":"tampered"}')).toThrow(/Invalid webhook signature/);
});

test('rejects a stale timestamp', () => {
  const verify = buildSpectrumWebhookVerifier(SECRET);
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600);
  const rawBody = '{}';

  const request = buildRequest({
    'x-spectrum-timestamp': staleTimestamp,
    'x-spectrum-signature': `v0=${sign(staleTimestamp, rawBody)}`,
  });

  expect(() => verify(request, rawBody)).toThrow(/Stale webhook timestamp/);
});

test('rejects missing headers', () => {
  const verify = buildSpectrumWebhookVerifier(SECRET);

  expect(() => verify(buildRequest({}), '{}')).toThrow(/Missing Spectrum signature headers/);
});
