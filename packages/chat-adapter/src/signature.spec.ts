import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyNovuSignature } from './signature.js';

const SECRET = 'super-secret-key';

function sign(body: string, timestamp: number, secret = SECRET): string {
  const hmac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

  return `t=${timestamp},v1=${hmac}`;
}

describe('verifyNovuSignature', () => {
  const now = 1_700_000_000_000;
  const body = JSON.stringify({ conversationId: 'c1', event: 'onMessage' });

  it('accepts a valid, fresh signature', () => {
    const header = sign(body, now);
    expect(verifyNovuSignature(header, body, SECRET, { now: () => now })).toBe(true);
  });

  it('rejects a missing header', () => {
    expect(verifyNovuSignature(null, body, SECRET, { now: () => now })).toBe(false);
  });

  it('rejects a tampered body', () => {
    const header = sign(body, now);
    expect(verifyNovuSignature(header, `${body} `, SECRET, { now: () => now })).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const header = sign(body, now, 'other-secret');
    expect(verifyNovuSignature(header, body, SECRET, { now: () => now })).toBe(false);
  });

  it('rejects a stale timestamp beyond max age', () => {
    const header = sign(body, now - 10 * 60 * 1000);
    expect(verifyNovuSignature(header, body, SECRET, { now: () => now })).toBe(false);
  });

  it('rejects a timestamp too far in the future', () => {
    const header = sign(body, now + 60 * 1000);
    expect(verifyNovuSignature(header, body, SECRET, { now: () => now })).toBe(false);
  });

  it('rejects malformed headers', () => {
    for (const header of ['', 'garbage', 't=123', 'v1=abc', `t=${now}`]) {
      expect(verifyNovuSignature(header, body, SECRET, { now: () => now })).toBe(false);
    }
  });

  it('rejects invalid hex HMAC without throwing', () => {
    const header = `t=${now},v1=${'g'.repeat(64)}`;

    expect(verifyNovuSignature(header, body, SECRET, { now: () => now })).toBe(false);
  });
});
