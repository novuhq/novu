import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WebhookHandler } from './webhook-handler.js';

const SIGNING_SECRET = 'current_secret';
const OLD_SECRET = 'previous_secret';
const UNRELATED_SECRET = 'unrelated_secret';

const body = JSON.stringify({ messageId: 'msg_1', from: { address: 'sender@example.com' } });

function sign(secret: string, timestamp: number, payload = body): string {
  return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

function buildRequest(signatureHeader: string | null, payload = body): Request {
  const headers: Record<string, string> = {};
  if (signatureHeader !== null) {
    headers['novu-signature'] = signatureHeader;
  }

  return new Request('https://adapter.example.com/webhook', { method: 'POST', headers, body: payload });
}

describe('WebhookHandler signature verification', () => {
  const handler = new WebhookHandler(SIGNING_SECRET);

  it('accepts a header with a single valid v1 signature', async () => {
    const timestamp = Date.now();
    const request = buildRequest(`t=${timestamp},v1=${sign(SIGNING_SECRET, timestamp)}`);

    const result = await handler.parseAndVerify(request);

    expect(result.status).toBe(200);
    expect(result.payload?.messageId).toBe('msg_1');
  });

  it('accepts a later v1 when the earlier v1 was signed with the previous key', async () => {
    const timestamp = Date.now();
    const request = buildRequest(
      `t=${timestamp},v1=${sign(OLD_SECRET, timestamp)},v1=${sign(SIGNING_SECRET, timestamp)}`
    );

    const result = await handler.parseAndVerify(request);

    expect(result.status).toBe(200);
  });

  it('skips a malformed earlier v1 and accepts a later valid v1', async () => {
    const timestamp = Date.now();
    const request = buildRequest(`t=${timestamp},v1=not-a-hmac,v1=${sign(SIGNING_SECRET, timestamp)}`);

    const result = await handler.parseAndVerify(request);

    expect(result.status).toBe(200);
  });

  it('rejects a header where no v1 matches this handler secret', async () => {
    const timestamp = Date.now();
    const request = buildRequest(
      `t=${timestamp},v1=${sign(OLD_SECRET, timestamp)},v1=${sign(UNRELATED_SECRET, timestamp)}`
    );

    const result = await handler.parseAndVerify(request);

    expect(result.status).toBe(401);
    expect(result.payload).toBeNull();
  });

  it('rejects a valid signature whose timestamp is outside the allowed window', async () => {
    const staleTimestamp = Date.now() - 10 * 60 * 1000;
    const request = buildRequest(`t=${staleTimestamp},v1=${sign(SIGNING_SECRET, staleTimestamp)}`);

    const result = await handler.parseAndVerify(request);

    expect(result.status).toBe(401);
  });

  it('rejects a request without a novu-signature header', async () => {
    const result = await handler.parseAndVerify(buildRequest(null));

    expect(result.status).toBe(401);
  });

  it('rejects a valid-looking signature computed over a different body', async () => {
    const timestamp = Date.now();
    const tamperedBody = JSON.stringify({ messageId: 'msg_2', from: { address: 'attacker@example.com' } });
    const request = buildRequest(`t=${timestamp},v1=${sign(SIGNING_SECRET, timestamp)}`, tamperedBody);

    const result = await handler.parseAndVerify(request);

    expect(result.status).toBe(401);
  });
});
