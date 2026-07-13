import { createMemoryState } from '@chat-adapter/state-memory';
import { Chat } from 'chat';
import { describe, expect, it } from 'vitest';
import { createNovuAdapter } from './index.js';

describe('bridge probe endpoints', () => {
  const adapter = createNovuAdapter({
    apiKey: 'api-key',
    agentIdentifier: 'support-agent',
    bridgeSecret: 'bridge-secret',
  });

  it('responds to health-check without HMAC', async () => {
    const response = await adapter.handleWebhook(
      new Request('http://localhost:3000/api/webhooks/novu?action=health-check')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('responds to discover without HMAC', async () => {
    const response = await adapter.handleWebhook(
      new Request('http://localhost:3000/api/webhooks/novu?action=discover')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      workflows: [],
      agents: [{ agentId: 'support-agent' }],
    });
  });

  it('still rejects unsigned POST bridge requests', async () => {
    const chat = new Chat({
      userName: 'support',
      adapters: { novu: adapter },
      state: createMemoryState(),
    });
    await chat.initialize();

    const response = await adapter.handleWebhook(
      new Request('http://localhost:3000/api/webhooks/novu', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'onMessage' }),
      })
    );

    expect(response.status).toBe(401);
  });
});
