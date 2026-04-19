import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx } from 'chat/jsx-runtime';

import { Client } from '../../client';
import { PostActionEnum } from '../../constants';
import { NovuRequestHandler } from '../../handler';
import { agent } from './agent.resource';
import type { AgentBridgeRequest } from './agent.types';
import { Button, Card, CardText } from './index';

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
    action: null,
    reaction: null,
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

  it('should accept agent without onReaction handler', () => {
    const bot = agent('wine-bot', { onMessage: async () => {} });

    expect(bot.handlers.onReaction).toBeUndefined();
  });
});

describe('Client.discover() includes agents', () => {
  it('should return registered agents in discover output', () => {
    const client = new Client({ secretKey: 'test-key', strictAuthentication: false });
    const bot1 = agent('bot-a', { onMessage: async () => {} });
    const bot2 = agent('bot-b', { onMessage: async () => {} });
    client.addAgents([bot1, bot2]);

    const output = client.discover();

    expect(output.agents).toEqual([{ agentId: 'bot-a' }, { agentId: 'bot-b' }]);
  });

  it('should return empty agents array when no agents registered', () => {
    const client = new Client({ secretKey: 'test-key', strictAuthentication: false });

    const output = client.discover();

    expect(output.agents).toEqual([]);
  });
});

describe('agent dispatch via NovuRequestHandler', () => {
  let client: Client;
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new Client({ secretKey: 'test-secret-key', strictAuthentication: false });
    let counter = 0;
    fetchMock = vi.fn().mockImplementation(() => {
      counter += 1;
      const body = {
        data: { status: 'ok', messageId: `msg-${counter}`, platformThreadId: 'thread-1' },
      };

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(body)),
        json: () => Promise.resolve(body),
      });
    });
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
        const url = new URL(
          `http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=unknown-bot&event=onMessage`
        );

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

  it('should edit a previously sent reply via the returned handle', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        const msg = await ctx.reply('Thinking...');
        await msg.edit('Done thinking');
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
    const initialReply = parsedBodies.find((body: any) => body.reply);
    const editBody = parsedBodies.find((body: any) => body.edit);

    expect(initialReply).toBeDefined();
    expect(initialReply.reply.text).toBe('Thinking...');

    expect(editBody).toBeDefined();
    expect(editBody.edit.content.text).toBe('Done thinking');
    expect(editBody.edit.messageId).toBe('msg-1');
    expect(editBody.reply).toBeUndefined();
    expect(editBody.signals).toBeUndefined();
  });

  it('should not attach signals or resolve to an edit call', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        ctx.metadata.set('step', 'thinking');
        const msg = await ctx.reply('Thinking...');
        await msg.edit('Done');
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

    const bodies = fetchMock.mock.calls
      .filter((call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply')
      .map(([, init]: any[]) => JSON.parse(init.body));

    const firstReply = bodies.find((b: any) => b.reply);
    const edit = bodies.find((b: any) => b.edit);

    expect(firstReply.signals).toHaveLength(1);
    expect(edit.signals).toBeUndefined();
    expect(edit.resolve).toBeUndefined();
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

  it('should serialize markdown content on reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        await ctx.reply({ markdown: '**bold** text' });
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

    expect(replyBody.reply.markdown).toBe('**bold** text');
    expect(replyBody.reply.text).toBeUndefined();
    expect(replyBody.reply.card).toBeUndefined();
  });

  it('should serialize markdown with file attachments', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        await ctx.reply({
          markdown: 'Here is the report',
          files: [{ filename: 'report.pdf', url: 'https://example.com/report.pdf' }],
        });
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

    expect(replyBody.reply.markdown).toBe('Here is the report');
    expect(replyBody.reply.files).toHaveLength(1);
    expect(replyBody.reply.files[0]).toEqual({ filename: 'report.pdf', url: 'https://example.com/report.pdf' });
  });

  it('should serialize CardElement on reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        await ctx.reply(
          Card({
            title: 'Order #123',
            children: [CardText('Your order is ready'), Button({ id: 'confirm', label: 'Confirm', style: 'primary' })],
          })
        );
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

    expect(replyBody.reply.card).toBeDefined();
    expect(replyBody.reply.card.type).toBe('card');
    expect(replyBody.reply.card.title).toBe('Order #123');
    expect(replyBody.reply.card.children).toHaveLength(2);
    expect(replyBody.reply.card.children[1].type).toBe('button');
    expect(replyBody.reply.card.children[1].id).toBe('confirm');
    expect(replyBody.reply.text).toBeUndefined();
    expect(replyBody.reply.markdown).toBeUndefined();
  });

  it('should serialize JSX Card elements on reply', async () => {
    const jsxCard = jsx(Card, {
      title: 'JSX Card',
      children: [jsx(CardText, { children: 'Hello from JSX' }), jsx(Button, { id: 'ok', label: 'OK', style: 'primary' })],
    });

    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        await ctx.reply(jsxCard);
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

    expect(replyBody.reply.card).toBeDefined();
    expect(replyBody.reply.card.type).toBe('card');
    expect(replyBody.reply.card.title).toBe('JSX Card');
    expect(replyBody.reply.text).toBeUndefined();
    expect(replyBody.reply.markdown).toBeUndefined();
  });

  it('should serialize CardElement on edit', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        const msg = await ctx.reply('Loading...');
        await msg.edit(Card({ title: 'Loaded', children: [] }));
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

    const editBody = parsedBodies.find((body: any) => body.edit);
    expect(editBody.edit.content.card).toBeDefined();
    expect(editBody.edit.content.card.type).toBe('card');
    expect(editBody.edit.content.card.title).toBe('Loaded');
    expect(editBody.edit.messageId).toBe('msg-1');

    const initialReply = parsedBodies.find((body: any) => body.reply);
    expect(initialReply.reply.text).toBe('Loading...');
  });

  it('should batch signals with card reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (ctx) => {
        ctx.metadata.set('intent', 'order_confirm');
        await ctx.reply(Card({ title: 'Confirm?', children: [Button({ id: 'yes', label: 'Yes', style: 'primary' })] }));
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

    expect(replyBody.reply.card.type).toBe('card');
    expect(replyBody.signals).toHaveLength(1);
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', key: 'intent', value: 'order_confirm' });
  });

  it('should dispatch onAction event with action data on ctx', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onAction: async (ctx) => {
        capturedCtx = ctx;
        await ctx.reply('Action received');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          event: 'onAction',
          action: { actionId: 'confirm', value: 'yes' },
          message: null,
        });
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onAction`);

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

    expect(capturedCtx.event).toBe('onAction');
    expect(capturedCtx.action).toEqual({ actionId: 'confirm', value: 'yes' });
    expect(capturedCtx.message).toBeNull();

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.text).toBe('Action received');
  });

  it('should have null action on onMessage events', async () => {
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

    expect(capturedCtx.action).toBeNull();
  });

  it('should silently skip onAction when no handler registered', async () => {
    const testBot = agent('test-bot', {
      onMessage: async () => {},
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          event: 'onAction',
          action: { actionId: 'btn-1' },
          message: null,
        });
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onAction`);

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
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).status).toBe('ack');
  });

  it('should silently skip onReaction when no handler registered', async () => {
    const testBot = agent('test-bot', {
      onMessage: async () => {},
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          event: 'onReaction',
          message: null,
          reaction: {
            messageId: 'msg-123',
            emoji: { name: 'thumbs_up' },
            added: true,
            message: null,
          },
        });
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onReaction`);

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
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).status).toBe('ack');
  });

  it('should dispatch onReaction event with reaction data on ctx', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onReaction: async (ctx) => {
        capturedCtx = ctx;
        await ctx.reply('Reaction received');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          event: 'onReaction',
          message: null,
          reaction: {
            messageId: 'msg-reacted',
            emoji: { name: 'thumbs_up' },
            added: true,
            message: {
              text: 'Hello bot!',
              platformMessageId: 'msg-reacted',
              author: { userId: 'u1', fullName: 'Alice', userName: 'alice', isBot: false },
              timestamp: new Date().toISOString(),
            },
          },
        });
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onReaction`);

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

    expect(capturedCtx.event).toBe('onReaction');
    expect(capturedCtx.reaction).toBeDefined();
    expect(capturedCtx.reaction.messageId).toBe('msg-reacted');
    expect(capturedCtx.reaction.emoji.name).toBe('thumbs_up');
    expect(capturedCtx.reaction.added).toBe(true);
    expect(capturedCtx.reaction.message).toBeDefined();
    expect(capturedCtx.reaction.message.text).toBe('Hello bot!');
    expect(capturedCtx.reaction.message.platformMessageId).toBe('msg-reacted');

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.text).toBe('Reaction received');
  });

  it('should have null reaction.message when messageText is not provided', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onReaction: async (ctx) => {
        capturedCtx = ctx;
        await ctx.reply('ok');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          event: 'onReaction',
          message: null,
          reaction: {
            messageId: 'msg-456',
            emoji: { name: 'heart' },
            added: false,
            message: null,
          },
        });
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onReaction`);

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

    expect(capturedCtx.reaction.emoji.name).toBe('heart');
    expect(capturedCtx.reaction.added).toBe(false);
    expect(capturedCtx.reaction.message).toBeNull();
  });

  it('should have null reaction on non-reaction events', async () => {
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

    expect(capturedCtx.reaction).toBeNull();
  });
});
