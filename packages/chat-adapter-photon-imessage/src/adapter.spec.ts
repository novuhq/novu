import { createHmac } from 'node:crypto';
import { expect, test } from 'vitest';
import { PhotonImessageAdapterImpl } from './adapter.js';

const SECRET = 'adapter-spec-signing-secret';

function signedRequest(body: Record<string, unknown>): { request: Request; rawBody: string } {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', SECRET).update(`v0:${timestamp}:${rawBody}`).digest('hex');

  const request = new Request('https://example.test/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-spectrum-timestamp': timestamp,
      'x-spectrum-signature': `v0=${signature}`,
    },
    body: rawBody,
  });

  return { request, rawBody };
}

function buildAdapter(): PhotonImessageAdapterImpl {
  return new PhotonImessageAdapterImpl({
    projectId: 'spec-project',
    projectSecret: 'spec-secret',
    webhookSecret: SECRET,
  });
}

const receiptPayload = (type: string) => ({
  event: 'messages',
  space: { id: 'any;-;+15551234567', platform: 'imessage' },
  message: {
    id: `spec-${type}-1`,
    direction: 'inbound',
    platform: 'imessage',
    sender: { id: '+15551234567', platform: 'imessage' },
    space: { id: 'any;-;+15551234567', platform: 'imessage' },
    content: { type, target: { id: 'agent-msg-1' } },
  },
});

// Read receipts must never become inbound turns: the agent's own reply gets
// marked read by the user's device, and routing that receipt as a message
// makes the agent answer itself in a loop.
test.each(['read', 'delivered'])('acks a signed %s receipt without routing it', async (type) => {
  const adapter = buildAdapter();
  const { request } = signedRequest(receiptPayload(type));

  const response = await adapter.handleWebhook(request);

  expect(response.status).toBe(200);
});

test('rejects an unsigned receipt delivery', async () => {
  const adapter = buildAdapter();
  const request = new Request('https://example.test/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(receiptPayload('read')),
  });

  const response = await adapter.handleWebhook(request);

  expect(response.status).toBe(401);
});
