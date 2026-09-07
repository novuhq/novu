import { describe, expect, it, vi } from 'vitest';
import { ReplyClient } from './reply-client.js';
import type { NovuAdapterConfig } from './types.js';

function makeClient(overrides: Partial<NovuAdapterConfig> = {}) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify({ messageId: 'm-1', platformThreadId: 't-1' }), { status: 200 })
  );
  const config: NovuAdapterConfig = {
    apiKey: 'secret-123',
    agentIdentifier: 'support-agent',
    bridgeSecret: 'bridge-secret',
    fetch: fetchMock as unknown as typeof fetch,
    ...overrides,
  };

  return { client: new ReplyClient(config), fetchMock };
}

describe('ReplyClient', () => {
  it('derives the reply URL from apiBaseUrl + agentIdentifier (default cloud)', () => {
    const { client } = makeClient();
    expect(client.getReplyUrl()).toBe('https://api.novu.co/v1/agents/support-agent/reply');
  });

  it('honors a custom apiBaseUrl and strips a trailing slash', () => {
    const { client } = makeClient({ apiBaseUrl: 'https://eu.api.novu.co/' });
    expect(client.getReplyUrl()).toBe('https://eu.api.novu.co/v1/agents/support-agent/reply');
  });

  it('posts with ApiKey auth and JSON body, returning SentMessageInfo', async () => {
    const { client, fetchMock } = makeClient();
    const info = await client.send({
      conversationId: 'c1',
      integrationIdentifier: 'slack-prod',
      reply: { markdown: 'hi' },
    });

    expect(info).toEqual({ messageId: 'm-1', platformThreadId: 't-1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.novu.co/v1/agents/support-agent/reply');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('ApiKey secret-123');
    expect(JSON.parse(init.body as string)).toEqual({
      conversationId: 'c1',
      integrationIdentifier: 'slack-prod',
      reply: { markdown: 'hi' },
    });
  });

  it('throws on non-2xx responses', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 403, statusText: 'Forbidden' }));
    const client = new ReplyClient({
      apiKey: 'k',
      agentIdentifier: 'a',
      bridgeSecret: 'b',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await expect(client.send({ conversationId: 'c', integrationIdentifier: 'i' })).rejects.toThrow(/403/);
  });
});
