import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyNovuSignature } from './signature.js';

const SECRET = 'sk_test_secret';

function sign(rawBody: string, timestamp: number, secret = SECRET): string {
  const hmac = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

describe('verifyNovuSignature', () => {
  const body = JSON.stringify({ hello: 'world' });
  const now = 1_700_000_000_000;
  const clock = () => now;

  it('accepts a valid, fresh signature', () => {
    expect(verifyNovuSignature(sign(body, now), body, SECRET, { now: clock })).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verifyNovuSignature(sign(body, now), `${body} `, SECRET, { now: clock })).toBe(false);
  });

  it('rejects a wrong secret', () => {
    expect(verifyNovuSignature(sign(body, now, 'other'), body, SECRET, { now: clock })).toBe(false);
  });

  it('rejects an expired signature', () => {
    const old = now - 6 * 60 * 1000;
    expect(verifyNovuSignature(sign(body, old), body, SECRET, { now: clock })).toBe(false);
  });

  it('rejects a signature too far in the future', () => {
    const future = now + 60 * 1000;
    expect(verifyNovuSignature(sign(body, future), body, SECRET, { now: clock })).toBe(false);
  });

  it.each([null, '', 'garbage', 't=123', `v1=${'a'.repeat(64)}`])(
    'rejects malformed header: %s',
    (header) => {
      expect(verifyNovuSignature(header, body, SECRET, { now: clock })).toBe(false);
    },
  );
});
