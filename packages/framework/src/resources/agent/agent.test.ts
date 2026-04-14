import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Client } from '../../client';
import { PostActionEnum } from '../../constants';
import { NovuRequestHandler } from '../../handler';
import { agent } from './agent.resource';
import type { AgentBridgeRequest } from './agent.types';

function createMockBridgeRequest(overrides?: Partial<AgentBridgeRequest>): AgentBridgeRequest {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    deliveryId: 'del-123',
    event: 'onMessage',
    agentId: 'test-bot',
    replyUrl: 'https://api.novu.co/v1/agents/test-bot/reply',
    conversationId: 'conv-456',
    integrationIdentifier: 'slack-main',
    message: {
      text: 'Hello bot!',
      platformMessageId: 'msg-789',
      author: { userId: 'u1', fullName: 'Alice', userName: 'alice', isBot: false },
      timestamp: new Date().toISOString(),
    },
    conversation: {
      identifier: 'conv-456',
      status: 'active',
      metadata: {},
      messageCount: 1,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    },
    subscriber: {
      subscriberId: 'sub-001',
      firstName: 'Alice',
      email: 'alice@example.com',
    },
    history: [],
    platform: 'slack',
    platformContext: { threadId: 't1', channelId: 'c1', isDM: false },
    ...overrides,
  };
}

describe('agent()', () => {
  it('should return an agent with id and handlers', () => {
    const bot = agent('wine-bot', { onMessage: async () => {} });

    expect(bot.id).toBe('wine-bot');
    expect(typeof bot.handlers.onMessage).toBe('function');
  });

  it('should throw when agentId is empty', () => {
    expect(() => agent('', { onMessage: async () => {} })).toThrow('non-empty agentId');
  });

  it('should throw when onMessage is missing', () => {
    expect(() => agent('wine-bot', {} as any)).toThrow('onMessage handler');
  });
});

describe('agent dispatch via NovuRequestHandler', () => {
  let client: Client;
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new Client({ secretKey: 'test-secret-key', strictAuthentication: false });
    fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}'), json: () => Promise.resolve({ status: 'ok' }) });
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should ACK immediately and run onMessage handler in background', async () => {
    const onMessageSpy = vi.fn(async (ctx) => {
      await ctx.reply('Echo: Hello bot!');
    });

    const testBot = agent('test-bot', { onMessage: onMessageSpy });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest();
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`);

        return {
          body: () => body,
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    const result = await handler.createHandler()();
    const parsed = JSON.parse(result.body);

    expect(result.status).toBe(200);
    expect(parsed.status).toBe('ack');

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    expect(replyCall).toBeDefined();

    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.text).toBe('Echo: Hello bot!');
    expect(replyBody.conversationId).toBe('conv-456');
    expect(replyBody.integrationIdentifier).toBe('slack-main');

    const replyHeaders = replyCall![1].headers;
    expect(replyHeaders.Authorization).toBe('ApiKey test-secret-key');
  });

  it('should return 404 for unknown agent', async () => {
    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [],
      client,
      handler: () => {
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=unknown-bot&event=onMessage`);

        return {
          body: () => ({}),
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    const result = await handler.createHandler()();

    expect(result.status).toBe(404);
    expect(JSON.parse(result.body).error).toContain('unknown-bot');
  });

  it('should batch metadata signals with reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        ctx.metadata.set('turnCount', 1);
        ctx.metadata.set('language', 'en');
        await ctx.reply('Got it');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest();
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`);

        return {
          body: () => body,
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    await handler.createHandler()();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);

    expect(replyBody.reply.text).toBe('Got it');
    expect(replyBody.signals).toHaveLength(2);
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', key: 'turnCount', value: 1 });
    expect(replyBody.signals[1]).toEqual({ type: 'metadata', key: 'language', value: 'en' });
  });

  it('should send update independently without signals', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        ctx.metadata.set('step', 'thinking');
        await ctx.update('Thinking...');
        await ctx.reply('Done thinking');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest();
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`);

        return {
          body: () => body,
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    await handler.createHandler()();

    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));

    const replyCalls = fetchMock.mock.calls.filter(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );

    const parsedBodies = replyCalls.map(([, init]: any[]) => JSON.parse(init.body));
    const updateBody = parsedBodies.find((body: any) => body.update);
    const replyBody = parsedBodies.find((body: any) => body.reply);

    expect(updateBody).toBeDefined();
    expect(updateBody.update.text).toBe('Thinking...');
    expect(updateBody.signals).toBeUndefined();

    expect(replyBody).toBeDefined();
    expect(replyBody.reply.text).toBe('Done thinking');
    expect(replyBody.signals).toHaveLength(1);
  });

  it('should flush remaining signals after onResolve', async () => {
    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onResolve: async (ctx) => {
        ctx.metadata.set('archived', true);
        ctx.trigger('post-resolve-workflow', { payload: { reason: 'done' } });
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({ event: 'onResolve', message: null });
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onResolve`);

        return {
          body: () => body,
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    await handler.createHandler()();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const flushBody = JSON.parse(replyCall![1].body);

    expect(flushBody.reply).toBeUndefined();
    expect(flushBody.signals).toHaveLength(2);
    expect(flushBody.signals[0]).toEqual({ type: 'metadata', key: 'archived', value: true });
    expect(flushBody.signals[1]).toEqual({
      type: 'trigger',
      workflowId: 'post-resolve-workflow',
      payload: { reason: 'done' },
    });
  });

  it('should provide read-only context properties from bridge payload', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        capturedCtx = ctx;
        await ctx.reply('ok');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest();
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`);

        return {
          body: () => body,
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    await handler.createHandler()();
    await vi.waitFor(() => expect(capturedCtx).toBeDefined());

    expect(capturedCtx.event).toBe('onMessage');
    expect(capturedCtx.message?.text).toBe('Hello bot!');
    expect(capturedCtx.conversation.identifier).toBe('conv-456');
    expect(capturedCtx.subscriber?.subscriberId).toBe('sub-001');
    expect(capturedCtx.platform).toBe('slack');
    expect(capturedCtx.platformContext.threadId).toBe('t1');
    expect(capturedCtx.history).toEqual([]);
  });
});
