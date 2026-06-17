import { createHmac } from 'node:crypto';
import { createMemoryState } from '@chat-adapter/state-memory';
import { Chat } from 'chat';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNovuAdapter } from './index.js';
import type { AgentBridgeRequest } from './types.js';

const BRIDGE_SECRET = 'bridge-secret';
const API_KEY = 'api-key';

function sign(body: string, secret = BRIDGE_SECRET): string {
  const ts = Date.now();
  const hmac = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

  return `t=${ts},v1=${hmac}`;
}

function bridgeRequest(overrides: Partial<AgentBridgeRequest> = {}): AgentBridgeRequest {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    deliveryId: `d-${Math.random()}`,
    event: 'onMessage',
    agentId: 'support-agent',
    replyUrl: 'https://attacker.example.com/steal',
    conversationId: 'conv-1',
    integrationIdentifier: 'slack-prod',
    action: null,
    message: {
      text: 'hello',
      platformMessageId: 'pm-1',
      author: { userId: 'u1', userName: 'alice', fullName: 'Alice', isBot: false },
      timestamp: new Date().toISOString(),
    },
    reaction: null,
    conversation: {
      identifier: 'conv-1',
      status: 'open',
      metadata: {},
      messageCount: 2,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    },
    subscriber: { subscriberId: 'sub-1', firstName: 'Alice' },
    history: [{ role: 'user', type: 'text', content: 'earlier', createdAt: new Date().toISOString() }],
    platform: 'slack',
    platformContext: { threadId: 'pm-1', channelId: 'C1', isDM: false },
    ...overrides,
  };
}

async function deliver(adapter: ReturnType<typeof createNovuAdapter>, req: AgentBridgeRequest): Promise<Response> {
  const body = JSON.stringify(req);
  const request = new Request('https://bridge.example.com/api/novu', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'novu-signature': sign(body) },
    body,
  });

  return adapter.handleWebhook(request);
}

describe('Novu adapter end-to-end', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ messageId: 'm-1', platformThreadId: 't-1' }), { status: 200 })
    );
  });

  function buildChat() {
    const adapter = createNovuAdapter({
      apiKey: API_KEY,
      agentIdentifier: 'support-agent',
      bridgeSecret: BRIDGE_SECRET,
      fetch: fetchMock as unknown as typeof fetch,
    });
    const chat = new Chat({ userName: 'support', adapters: { novu: adapter }, state: createMemoryState() });

    return { adapter, chat };
  }

  it('routes an ongoing conversation to onSubscribedMessage and replies via the derived URL', async () => {
    const { adapter, chat } = buildChat();
    const seen: string[] = [];
    chat.onSubscribedMessage(async (thread, message) => {
      seen.push(message.text);
      await thread.post(`echo: ${message.text}`);
    });
    await chat.initialize();

    const res = await deliver(adapter, bridgeRequest());
    expect(res.status).toBe(200);
    expect(seen).toEqual(['hello']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    // Reply went to the derived URL, NOT the attacker-controlled replyUrl in the request.
    expect(url).toBe('https://api.novu.co/v1/agents/support-agent/reply');
    expect((init.headers as Record<string, string>).authorization).toBe(`ApiKey ${API_KEY}`);
    expect(JSON.parse(init.body as string)).toMatchObject({
      conversationId: 'conv-1',
      integrationIdentifier: 'slack-prod',
      reply: { markdown: 'echo: hello' },
    });
  });

  it('routes a brand-new channel conversation to onNewMention', async () => {
    const { adapter, chat } = buildChat();
    const mentions: string[] = [];
    chat.onNewMention(async (_thread, message) => {
      mentions.push(message.text);
    });
    chat.onSubscribedMessage(async () => {
      throw new Error('should not be subscribed on first message');
    });
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({ conversation: { ...bridgeRequest().conversation, messageCount: 1 }, history: [] })
    );

    expect(mentions).toEqual(['hello']);
  });

  it('rejects an invalid signature with 401 and does not dispatch', async () => {
    const { adapter, chat } = buildChat();
    const handler = vi.fn();
    chat.onSubscribedMessage(handler);
    await chat.initialize();

    const body = JSON.stringify(bridgeRequest());
    const request = new Request('https://bridge.example.com/api/novu', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'novu-signature': sign(body, 'wrong-secret') },
      body,
    });
    const res = await adapter.handleWebhook(request);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dedupes a replayed deliveryId (same delivery processed once)', async () => {
    const { adapter, chat } = buildChat();
    const handler = vi.fn();
    chat.onSubscribedMessage(handler);
    await chat.initialize();

    const req = bridgeRequest({ deliveryId: 'fixed-delivery' });
    await deliver(adapter, req);
    await deliver(adapter, req);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
