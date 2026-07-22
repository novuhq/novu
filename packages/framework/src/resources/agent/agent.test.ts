import { jsx } from 'chat/jsx-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Client } from '../../client';
import { PostActionEnum } from '../../constants';
import { NovuRequestHandler } from '../../handler';
import { AgentDeliveryError, AgentError } from './agent.errors';
import { agent } from './agent.resource';
import type { AgentBridgeRequest } from './agent.types';
import { PendingApproval } from './agent.types';
import { dispatchAgentEvent } from './agent-dispatch';
import { Button, Card, CardText } from './index';
import { buildApprovalActionId } from './tool-approval/action-id';

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
    const onMessageSpy = vi.fn(async (_message: any, ctx: any) => {
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
    expect(replyBody.reply.markdown).toBe('Echo: Hello bot!');
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
      onMessage: async (_message, ctx) => {
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

    expect(replyBody.reply.markdown).toBe('Got it');
    expect(replyBody.signals).toHaveLength(2);
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', action: 'set', key: 'turnCount', value: 1 });
    expect(replyBody.signals[1]).toEqual({ type: 'metadata', action: 'set', key: 'language', value: 'en' });
  });

  it('should edit a previously sent reply via the returned handle', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
    expect(initialReply.reply.markdown).toBe('Thinking...');

    expect(editBody).toBeDefined();
    expect(editBody.edit.content.markdown).toBe('Done thinking');
    expect(editBody.edit.messageId).toBe('msg-1');
    expect(editBody.reply).toBeUndefined();
    expect(editBody.signals).toBeUndefined();
  });

  it('should not attach signals or resolve to an edit call', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
    expect(flushBody.signals[0]).toEqual({ type: 'metadata', action: 'set', key: 'archived', value: true });
    expect(flushBody.signals[1]).toEqual({
      type: 'trigger',
      workflowId: 'post-resolve-workflow',
      payload: { reason: 'done' },
    });
  });

  it('should provide read-only context properties from bridge payload', async () => {
    let capturedCtx: any;
    let capturedMessage: any;

    const testBot = agent('test-bot', {
      onMessage: async (message, ctx) => {
        capturedCtx = ctx;
        capturedMessage = message;
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
    expect(capturedMessage.text).toBe('Hello bot!');
    expect(capturedCtx.conversation.identifier).toBe('conv-456');
    expect(capturedCtx.subscriber?.subscriberId).toBe('sub-001');
    expect(capturedCtx.platform).toBe('slack');
    expect(capturedCtx.platformContext.threadId).toBe('t1');
    expect(capturedCtx.history).toEqual([]);
    // context defaults to null when the bridge payload omits it (backward-compatible wire)
    expect(capturedCtx.context).toBeNull();
  });

  it('should expose ctx.context when the bridge payload includes resolved connect context', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
          context: { tenant: { id: 'org-123', data: { environmentId: 'env-1', userId: 'user-1' } } },
        });
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

    expect(capturedCtx.context).toEqual({
      tenant: { id: 'org-123', data: { environmentId: 'env-1', userId: 'user-1' } },
    });
  });

  it('should expose platformContext.message and platformContext.email for email agents', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        capturedCtx = ctx;
        await ctx.reply('ok');
      },
    });

    const emailRaw = {
      messageId: 'msg-1@example.com',
      subject: 'Hello',
      domain: { id: 'domain-1', name: 'inbox.example.com', data: { tier: 'pro' } },
      route: { address: 'support', data: { queue: 'tier-1' } },
    };

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          platform: 'email',
          platformContext: {
            threadId: 'email:user@example.com:abc',
            channelId: 'email:user@example.com',
            isDM: false,
            message: emailRaw,
            email: {
              domain: emailRaw.domain,
              route: emailRaw.route,
              rootMessageId: 'root@example.com',
            },
          },
        });
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

    expect(capturedCtx.platform).toBe('email');
    expect(capturedCtx.platformContext.message).toEqual(emailRaw);
    expect(capturedCtx.platformContext.email).toEqual({
      domain: emailRaw.domain,
      route: emailRaw.route,
      rootMessageId: 'root@example.com',
    });
  });

  it('should serialize markdown content on reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('**bold** text');
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
    expect(replyBody.reply.card).toBeUndefined();
  });

  it('should serialize markdown with file attachments', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('Here is the report', {
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

  it.each([
    { label: 'Buffer', data: Buffer.from('hello') },
    { label: 'Uint8Array', data: new Uint8Array([104, 101, 108, 108, 111]) },
    { label: 'ArrayBuffer', data: new Uint8Array([104, 101, 108, 108, 111]).buffer },
    { label: 'Blob', data: new Blob(['hello'], { type: 'text/plain' }) },
  ])('should serialize markdown with $label file data as base64', async ({ data }) => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('Here is the report', {
          files: [{ filename: 'sample.txt', mimeType: 'text/plain', data }],
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

    expect(replyBody.reply.files[0]).toEqual({
      filename: 'sample.txt',
      mimeType: 'text/plain',
      data: 'aGVsbG8=',
    });
  });

  it('should serialize large Uint8Array file data without overflowing the call stack', async () => {
    const bytes = Uint8Array.from({ length: 200 * 1024 }, (_, index) => index % 256);
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('Here is the report', {
          files: [{ filename: 'sample.bin', data: bytes }],
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

    expect(replyBody.reply.files[0].data).toBe(Buffer.from(bytes).toString('base64'));
  });

  it('should reject inline file data over 5 MB in aggregate before posting a reply', async () => {
    let caughtError: unknown;
    const bytes = new Uint8Array(3 * 1024 * 1024);
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        try {
          await ctx.reply('Here are the files', {
            files: [
              { filename: 'a.bin', data: bytes },
              { filename: 'b.bin', data: bytes },
            ],
          });
        } catch (err) {
          caughtError = err;
          throw err;
        }
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
    await vi.waitFor(() => expect(caughtError).toBeDefined());

    expect((caughtError as Error).message).toBe(
      'Invalid files: total inline data must be 5 MB or smaller. Use publicly-accessible URLs for larger files.'
    );

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    expect(replyCall).toBeUndefined();
  });

  it('should reject unsupported file data before posting a reply', async () => {
    let caughtError: unknown;
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        try {
          await ctx.reply('Here is the report', {
            files: [{ filename: 'sample.txt', data: { type: 'Buffer', data: [104, 101, 108, 108, 111] } } as any],
          });
        } catch (err) {
          caughtError = err;
          throw err;
        }
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
    await vi.waitFor(() => expect(caughtError).toBeDefined());

    expect((caughtError as Error).message).toBe(
      'Invalid file "sample.txt": data must be a base64 string, Buffer, Uint8Array, ArrayBuffer, or Blob.'
    );

    const replyCalls = fetchMock.mock.calls.filter(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBodies = replyCalls.map((call: any[]) => JSON.parse(call[1].body));
    expect(replyBodies.every((body) => body.reply === undefined)).toBe(true);
    expect(replyBodies.some((body) => body.error === true)).toBe(true);
  });

  it('should serialize CardElement on reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
    expect(replyBody.reply.markdown).toBeUndefined();
  });

  it('should serialize JSX Card elements on reply', async () => {
    const jsxCard = jsx(Card, {
      title: 'JSX Card',
      children: [
        jsx(CardText, { children: 'Hello from JSX' }),
        jsx(Button, { id: 'ok', label: 'OK', style: 'primary' }),
      ],
    });

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
    expect(replyBody.reply.markdown).toBeUndefined();
  });

  it('should serialize CardElement on edit', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
    expect(initialReply.reply.markdown).toBe('Loading...');
  });

  it('should batch signals with card reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', action: 'set', key: 'intent', value: 'order_confirm' });
  });

  it('should emit delete signal for ctx.metadata.delete()', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.metadata.delete('board');
        await ctx.reply('Deleted');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () =>
          createMockBridgeRequest({
            conversation: {
              identifier: 'conv-456',
              status: 'active',
              metadata: { board: 'chess' },
              messageCount: 2,
              createdAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
            },
          }),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    const result = await handler.createHandler()();
    expect(result.status).toBe(200);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);

    expect(replyBody.signals).toHaveLength(1);
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', action: 'delete', key: 'board' });
  });

  it('should emit clear signal for ctx.metadata.clear()', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.metadata.clear();
        await ctx.reply('Cleared');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () => createMockBridgeRequest(),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    const result = await handler.createHandler()();
    expect(result.status).toBe(200);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);

    expect(replyBody.signals).toHaveLength(1);
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', action: 'clear' });
  });

  it('should preserve signal ordering for mixed clear, set, and delete', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.metadata.clear();
        ctx.metadata.set('newGame', true);
        ctx.metadata.delete('oldKey');
        await ctx.reply('Mixed');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () => createMockBridgeRequest(),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    const result = await handler.createHandler()();
    expect(result.status).toBe(200);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);

    expect(replyBody.signals).toHaveLength(3);
    expect(replyBody.signals[0]).toEqual({ type: 'metadata', action: 'clear' });
    expect(replyBody.signals[1]).toEqual({ type: 'metadata', action: 'set', key: 'newGame', value: true });
    expect(replyBody.signals[2]).toEqual({ type: 'metadata', action: 'delete', key: 'oldKey' });
  });

  it('should track local state across get, set, delete, and current', async () => {
    let getResult: unknown;
    let currentSnapshot: Record<string, unknown>;

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.metadata.set('score', 42);
        getResult = ctx.metadata.get('score');
        ctx.metadata.delete('score');
        currentSnapshot = { ...ctx.metadata.current };
        await ctx.reply('Done');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () => createMockBridgeRequest(),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    await handler.createHandler()();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(getResult).toBe(42);
    expect(currentSnapshot!).toEqual({});
  });

  it('should dispatch onAction event with action data on ctx', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onAction: async (_action, ctx) => {
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
          action: { id: 'confirm', value: 'yes', sourceMessageId: 'msg-card-001' },
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
    expect(capturedCtx.action).toEqual({ id: 'confirm', value: 'yes', sourceMessageId: 'msg-card-001' });

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.markdown).toBe('Action received');
  });

  it('should expose sourceMessageId on action so handler can react to the card message', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onAction: async (_action, ctx) => {
        capturedCtx = ctx;
        if (ctx.action?.sourceMessageId) {
          ctx.addReaction(ctx.action.sourceMessageId, 'eyes');
        }
        await ctx.reply('Acknowledged');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({
          event: 'onAction',
          action: { id: 'play', sourceMessageId: 'msg-ttt-board' },
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

    expect(capturedCtx.action?.sourceMessageId).toBe('msg-ttt-board');

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.addReactions).toEqual([{ messageId: 'msg-ttt-board', emojiName: 'eyes' }]);
  });

  it('should have null action on onMessage events', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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
          action: { id: 'btn-1' },
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
      onReaction: async (_reaction, ctx) => {
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
    expect(replyBody.reply.markdown).toBe('Reaction received');
  });

  it('should have null reaction.message when messageText is not provided', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async () => {},
      onReaction: async (_reaction, ctx) => {
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

  it('should flush addReaction without a reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.addReaction('msg-123', 'eyes');
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
    const flushBody = JSON.parse(replyCall![1].body);

    expect(flushBody.reply).toBeUndefined();
    expect(flushBody.addReactions).toHaveLength(1);
    expect(flushBody.addReactions[0]).toEqual({ messageId: 'msg-123', emojiName: 'eyes' });
  });

  it('should batch addReaction with reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.addReaction('msg-reacted', 'thumbs_up');
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

    expect(replyBody.reply.markdown).toBe('Got it');
    expect(replyBody.addReactions).toHaveLength(1);
    expect(replyBody.addReactions[0]).toEqual({ messageId: 'msg-reacted', emojiName: 'thumbs_up' });
  });

  it('should delete a previously sent reply via the returned handle', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        const msg = await ctx.reply('Temporary notice');
        await msg.delete();
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
    const deleteBody = parsedBodies.find((body: any) => body.deleteMessages);

    expect(deleteBody).toBeDefined();
    expect(deleteBody.deleteMessages).toEqual([{ messageId: 'msg-1' }]);
    expect(deleteBody.reply).toBeUndefined();
  });

  it('should flush deleteMessage without a reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.deleteMessage('msg-stale');
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
    const flushBody = JSON.parse(replyCall![1].body);

    expect(flushBody.reply).toBeUndefined();
    expect(flushBody.deleteMessages).toEqual([{ messageId: 'msg-stale' }]);
  });

  it('should batch deleteMessage with reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        ctx.deleteMessage('msg-stale');
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
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply' && JSON.parse(call[1].body).reply
    );
    const replyBody = JSON.parse(replyCall![1].body);

    expect(replyBody.reply.markdown).toBe('Got it');
    expect(replyBody.deleteMessages).toEqual([{ messageId: 'msg-stale' }]);
  });

  it('should have null reaction on non-reaction events', async () => {
    let capturedCtx: any;

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
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

  it('should send handler return value as reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async () => 'hello from return',
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
    expect(replyCall).toBeDefined();
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.markdown).toBe('hello from return');
  });

  it('should send onAction handler return value as reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('noop');
      },
      onAction: async () => 'action handled',
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const body = createMockBridgeRequest({ event: 'onAction', action: { id: 'btn', value: '1' } });
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
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    expect(replyCall).toBeDefined();
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.markdown).toBe('action handled');
  });

  it('should send onReaction handler return value as reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('noop');
      },
      onReaction: (reaction) => {
        if (!reaction.added) return;

        return "Sorry that wasn't helpful!";
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
            emoji: { name: 'thumbs_down' },
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

    await handler.createHandler()();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    expect(replyCall).toBeDefined();
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.markdown).toBe("Sorry that wasn't helpful!");
  });

  it.each([
    {
      status: 502,
      body: '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>',
      label: 'gateway HTML page',
      message: 'Delivery failed: Bad Gateway',
    },
    {
      status: 401,
      body: '{"message":"Invalid API key"}',
      label: 'JSON credentials error',
      message: 'Delivery failed: Unauthorized: Invalid API key',
    },
    { status: 403, body: 'Forbidden', label: 'plain text forbidden', message: 'Delivery failed: Forbidden' },
    {
      status: 429,
      body: '{"statusCode":429,"message":"Rate limit exceeded"}',
      label: 'rate limit',
      message: 'Delivery failed: Too Many Requests: Rate limit exceeded',
    },
    { status: 500, body: '', label: 'empty body', message: 'Delivery failed: Internal Server Error' },
    { status: 599, body: 'weird', label: 'unknown status code', message: 'Delivery failed: 599' },
  ])('should throw AgentDeliveryError with clean message for $label ($status)', async ({ status, body, message }) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status, text: () => Promise.resolve(body) });

    let caughtError: unknown;
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        try {
          await ctx.reply('Hello');
        } catch (err) {
          caughtError = err;
          throw err;
        }
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
    await vi.waitFor(() => expect(caughtError).toBeDefined());

    expect(caughtError).toBeInstanceOf(AgentDeliveryError);
    expect(caughtError).toBeInstanceOf(AgentError);
    const err = caughtError as AgentDeliveryError;
    expect(err.message).toBe(message);
    expect(err.statusCode).toBe(status);
    expect(err.responseBody).toBe(body);
    expect(err.delivery?.statusCode).toBe(status);
  });

  it('should include nested API delivery error details in AgentDeliveryError', async () => {
    const body = JSON.stringify({
      error: 'delivery_failed',
      message: {
        error: 'delivery_failed',
        message: 'Invalid file "sample.txt": data must be a base64-encoded string.',
      },
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve(body) });

    let caughtError: unknown;
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        try {
          await ctx.reply('Hello');
        } catch (err) {
          caughtError = err;
          throw err;
        }
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => {
        const requestBody = createMockBridgeRequest();
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`);

        return {
          body: () => requestBody,
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: any) => res,
        };
      },
    });

    await handler.createHandler()();
    await vi.waitFor(() => expect(caughtError).toBeDefined());

    expect((caughtError as Error).message).toBe(
      'Delivery failed: Bad Request: Invalid file "sample.txt": data must be a base64-encoded string.'
    );
  });

  it('should log delivery errors without leaking the response body', async () => {
    const longBody = '<!DOCTYPE html>' + '<p>error</p>'.repeat(500);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, text: () => Promise.resolve(longBody) });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('Hello');
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
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());

    const logged = errorSpy.mock.calls[0].join(' ');
    expect(logged).toContain('[agent:test-bot] Turn failed (onMessage): Delivery failed: Bad Gateway');

    const replyBodies = fetchMock.mock.calls
      .filter((call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply')
      .map((call: any[]) => JSON.parse(call[1].body));
    expect(replyBodies.some((body) => body.error === true)).toBe(true);

    errorSpy.mockRestore();
  });

  it('should not send a reply when onReaction returns nothing (reaction removed)', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('noop');
      },
      onReaction: (reaction) => {
        if (!reaction.added) return;

        return 'thumbs up noted';
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
            emoji: { name: 'thumbs_down' },
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
    await new Promise((r) => setTimeout(r, 50));

    const replyCalls = fetchMock.mock.calls.filter(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const replyBodies = replyCalls.map((call: any[]) => JSON.parse(call[1].body));
    expect(replyBodies.every((body) => body.reply === undefined)).toBe(true);
  });

  it('should send onResolve handler return value as reply', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('noop');
      },
      onResolve: async () => 'Conversation closed. Thanks for reaching out!',
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
    expect(replyCall).toBeDefined();
    const replyBody = JSON.parse(replyCall![1].body);
    expect(replyBody.reply.markdown).toBe('Conversation closed. Thanks for reaching out!');
  });

  it('should send two replies when ctx.reply() is called and handler also returns a value', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.reply('Thinking…');

        return 'Final answer';
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

    const collectReplyBodies = () =>
      fetchMock.mock.calls
        .filter((call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply')
        .map((call: any[]) => JSON.parse(call[1].body))
        .filter((body) => body.reply !== undefined);

    await vi.waitFor(() => expect(collectReplyBodies()).toHaveLength(2));

    const replyBodies = collectReplyBodies();
    expect(replyBodies[0].reply.markdown).toBe('Thinking…');
    expect(replyBodies[1].reply.markdown).toBe('Final answer');
  });

  it('should post a typing status op for ctx.typing(text)', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.typing('Searching the docs…');
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () => createMockBridgeRequest(),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    await handler.createHandler()();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const body = JSON.parse(replyCall![1].body);

    expect(body.typing).toEqual({ status: 'Searching the docs…' });
    expect(body.reply).toBeUndefined();
    expect(body.conversationId).toBe('conv-456');
    expect(body.integrationIdentifier).toBe('slack-main');
  });

  it('should post an empty status op for ctx.typing() with no text', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.typing();
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () => createMockBridgeRequest(),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    await handler.createHandler()();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const body = JSON.parse(replyCall![1].body);

    expect(body.typing).toEqual({});
  });

  it('should post a stop op for ctx.typing.stop()', async () => {
    const testBot = agent('test-bot', {
      onMessage: async (_message, ctx) => {
        await ctx.typing.stop();
      },
    });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      handler: () => ({
        body: () => createMockBridgeRequest(),
        headers: () => null,
        method: () => 'POST',
        url: () => new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`),
        transformResponse: (res: any) => res,
      }),
    });

    await handler.createHandler()();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const replyCall = fetchMock.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.novu.co/v1/agents/test-bot/reply'
    );
    const body = JSON.parse(replyCall![1].body);

    expect(body.typing).toBe('stop');
    expect(body.reply).toBeUndefined();
  });
});

describe('turn error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubReplyFetch() {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: { body: string }) => {
        posts.push(JSON.parse(init.body));

        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    return posts;
  }

  it('auto-reports turn failures when onError is not defined', async () => {
    const posts = stubReplyFetch();
    const testAgent = agent('a', {
      onMessage: async () => {
        throw new Error('handler blew up');
      },
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: approvalBridge(),
      secretKey: 's',
    });

    expect(posts.some((body) => body.error === true)).toBe(true);
    expect(posts.some((body) => body.typing === 'stop')).toBe(true);
  });

  it('suppresses auto-report when onError returns { suppress: true }', async () => {
    const posts = stubReplyFetch();
    const testAgent = agent('a', {
      onMessage: async () => {
        throw new Error('handler blew up');
      },
      onError: async () => ({ suppress: true }),
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: approvalBridge(),
      secretKey: 's',
    });

    expect(posts.some((body) => body.error === true)).toBe(false);
    expect(posts.some((body) => body.typing === 'stop')).toBe(true);
  });

  it('delivers a custom reply from onError instead of auto-reporting', async () => {
    const posts = stubReplyFetch();
    const testAgent = agent('a', {
      onMessage: async () => {
        throw new Error('handler blew up');
      },
      onError: async () => 'custom failure copy',
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: approvalBridge(),
      secretKey: 's',
    });

    expect(posts.some((body) => body.error === true)).toBe(false);
    expect(posts.some((body) => (body.reply as { markdown?: string })?.markdown === 'custom failure copy')).toBe(true);
    expect(posts.some((body) => body.typing === 'stop')).toBe(true);
  });

  it('passes onError through from agent registration', () => {
    const onError = async () => ({ suppress: true as const });
    const testAgent = agent('a', {
      onMessage: async () => undefined,
      onError,
    });

    expect(testAgent.handlers.onError).toBe(onError);
  });
});

function approvalBridge(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    timestamp: '',
    deliveryId: 'd',
    event: 'onMessage',
    agentId: 'a',
    replyUrl: 'https://example.test/reply',
    conversationId: 'c',
    integrationIdentifier: 'i',
    message: { text: 'hi' },
    action: null,
    reaction: null,
    conversation: { metadata: {} },
    subscriber: null,
    history: [],
    platform: 'slack',
    platformContext: {},
    ...overrides,
  } as never;
}

describe('tool approval', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts an approval card and does not reply with the PendingApproval sentinel', async () => {
    const posts: any[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: any) => {
        posts.push(JSON.parse(init.body));

        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    const testAgent = {
      id: 'a',
      handlers: {
        onMessage: (_m: unknown, ctx: any) => ctx.toolApproval.request({ id: 'tc', name: 'doIt', input: { x: 1 } }),
        onToolApproval: async () => undefined,
      },
    };

    await dispatchAgentEvent({
      agent: testAgent as never,
      event: 'onMessage',
      bridge: approvalBridge(),
      secretKey: 's',
    });

    expect(posts.filter((p) => p.reply !== undefined)).toHaveLength(1);
    expect(posts[0].reply.toolApprovalCard).toEqual({ type: 'tool-approval-card' });
    // The tool-call payload rides in toolApprovalRequest (persisted as toolData), not in the button id.
    expect(posts[0].toolApprovalRequest).toMatchObject({
      approvalId: 'tc',
      toolCallId: 'tc',
      name: 'doIt',
      input: { x: 1 },
    });
    expect(JSON.stringify(posts[0].reply)).not.toContain('"x":1');
    expect(posts.some((p) => p.reply instanceof PendingApproval)).toBe(false);
  });

  it('routes an approval click to onToolApproval without auto card cleanup when user-defined', async () => {
    const posts: any[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: any) => {
        posts.push(JSON.parse(init.body));

        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    const seen: { decision?: { approved: boolean; toolCall: unknown } } = {};
    const testAgent = {
      id: 'a',
      userOnToolApproval: true,
      handlers: {
        onMessage: () => undefined,
        onToolApproval: (decision: { approved: boolean; toolCall: unknown }) => {
          seen.decision = decision;

          return undefined;
        },
      },
    };

    await dispatchAgentEvent({
      agent: testAgent as never,
      event: 'onAction',
      bridge: approvalBridge({
        event: 'onAction',
        message: null,
        // The tool call is reconstructed from persisted history, not the action id.
        history: [
          {
            role: 'agent',
            type: 'tool_approval_request',
            content: '',
            toolData: { approvalId: 'tc', toolCallId: 'tc', toolName: 'doIt', input: { x: 1 } },
            createdAt: '1',
          },
        ],
        action: { id: buildApprovalActionId('approve', 'tc'), sourceMessageId: 'm_prev' },
      }),
      secretKey: 's',
    });

    expect(seen.decision?.approved).toBe(true);
    expect(seen.decision?.toolCall).toMatchObject({ id: 'tc', name: 'doIt', input: { x: 1 } });
    expect(posts.find((p) => p.edit?.messageId === 'm_prev')).toBeUndefined();
    expect(
      posts.find((p) => p.deleteMessages?.some((d: { messageId: string }) => d.messageId === 'm_prev'))
    ).toBeUndefined();
  });

  it('does not auto-delete when userOnToolApproval is unset on a hand-built agent', async () => {
    const posts: any[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: any) => {
        posts.push(JSON.parse(init.body));

        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    const testAgent = {
      id: 'a',
      handlers: {
        onMessage: () => undefined,
        onToolApproval: () => undefined,
      },
    };

    await dispatchAgentEvent({
      agent: testAgent as never,
      event: 'onAction',
      bridge: approvalBridge({
        event: 'onAction',
        message: null,
        history: [
          {
            role: 'agent',
            type: 'tool_approval_request',
            content: '',
            toolData: { approvalId: 'tc', toolCallId: 'tc', toolName: 'doIt', input: { x: 1 } },
            createdAt: '1',
          },
        ],
        action: { id: buildApprovalActionId('approve', 'tc'), sourceMessageId: 'm_prev' },
      }),
      secretKey: 's',
    });

    expect(posts.find((p) => p.typing !== undefined && p.typing !== 'stop')).toBeUndefined();
    expect(
      posts.find((p) => p.deleteMessages?.some((d: { messageId: string }) => d.messageId === 'm_prev'))
    ).toBeUndefined();
  });

  it('auto-deletes the approval card when onToolApproval is framework-provided', async () => {
    const posts: any[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: any) => {
        posts.push(JSON.parse(init.body));

        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    const testAgent = {
      id: 'a',
      userOnToolApproval: false,
      handlers: {
        onMessage: () => undefined,
        onToolApproval: async () => undefined,
      },
    };

    await dispatchAgentEvent({
      agent: testAgent as never,
      event: 'onAction',
      bridge: approvalBridge({
        event: 'onAction',
        message: null,
        history: [
          {
            role: 'agent',
            type: 'tool_approval_request',
            content: '',
            toolData: { approvalId: 'tc', toolCallId: 'tc', toolName: 'doIt', input: { x: 1 } },
            createdAt: '1',
          },
        ],
        action: { id: buildApprovalActionId('approve', 'tc'), sourceMessageId: 'm_prev' },
      }),
      secretKey: 's',
    });

    expect(posts[0].typing).toEqual({});
    const deletePost = posts.find((p) =>
      p.deleteMessages?.some((d: { messageId: string }) => d.messageId === 'm_prev')
    );
    expect(deletePost).toBeTruthy();
    expect(posts.indexOf(deletePost!)).toBe(1);
    expect(posts.find((p) => p.edit?.messageId === 'm_prev')).toBeUndefined();
  });

  it('starts typing before handler when onToolApproval is framework-provided', async () => {
    const posts: any[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: any) => {
        posts.push(JSON.parse(init.body));

        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    const testAgent = {
      id: 'a',
      userOnToolApproval: false,
      handlers: {
        onMessage: () => undefined,
        onToolApproval: async (_decision: unknown, ctx: { reply: (text: string) => Promise<unknown> }) => {
          await ctx.reply('resumed');
        },
      },
    };

    await dispatchAgentEvent({
      agent: testAgent as never,
      event: 'onAction',
      bridge: approvalBridge({
        event: 'onAction',
        message: null,
        history: [
          {
            role: 'agent',
            type: 'tool_approval_request',
            content: '',
            toolData: { approvalId: 'tc', toolCallId: 'tc', toolName: 'doIt', input: { x: 1 } },
            createdAt: '1',
          },
        ],
        action: { id: buildApprovalActionId('approve', 'tc'), sourceMessageId: 'm_prev' },
      }),
      secretKey: 's',
    });

    expect(posts[0].typing).toEqual({});
    expect(posts[1].deleteMessages).toEqual([{ messageId: 'm_prev' }]);
    expect(posts[2].reply).toEqual({ markdown: 'resumed' });
  });
});

describe('event mode (AgentEvent protocol)', () => {
  const EVENTS_URL = 'https://api.novu.co/v1/agents/events';
  const REPLY_URL = 'https://api.novu.co/v1/agents/test-bot/reply';

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function eventModeBridge(overrides?: Partial<AgentBridgeRequest>): AgentBridgeRequest {
    return createMockBridgeRequest({
      eventsUrl: EVENTS_URL,
      ...overrides,
    });
  }

  function stubEventModeFetch() {
    const eventBatches: Array<{ sequence: number; event: { type: string; [key: string]: unknown } }[]> = [];
    const replyPosts: Record<string, unknown>[] = [];

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => '00000000-0000-4000-8000-000000000001'),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { body?: string }) => {
        if (url === EVENTS_URL) {
          const body = JSON.parse(init!.body!);
          eventBatches.push(body.events);

          return new Response(
            JSON.stringify({
              data: {
                results: body.events.map((envelope: { sequence: number }) => ({
                  sequence: envelope.sequence,
                  status: 'accepted',
                })),
              },
            }),
            { status: 200 }
          );
        }

        if (url === REPLY_URL) {
          replyPosts.push(JSON.parse(init!.body!));

          return new Response(JSON.stringify({ data: { messageId: 'msg-legacy', platformThreadId: 'thread-1' } }), {
            status: 200,
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      })
    );

    return { eventBatches, replyPosts };
  }

  it('reply emits message with minted id and returns handle exposing it', async () => {
    const { eventBatches } = stubEventModeFetch();
    let handleMessageId = '';

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          const handle = await ctx.reply('Hello from event mode');
          handleMessageId = handle.messageId;
          expect(handle.platformThreadId).toBe('');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(3);
    expect(eventBatches[0]).toHaveLength(2);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'message',
      messageId: 'msg_00000000-0000-4000-8000-000000000001',
      content: { markdown: 'Hello from event mode' },
    });
    expect(eventBatches[1][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[2][0].event).toEqual({ type: 'channel.typing', state: 'off' });
    expect(handleMessageId).toBe('msg_00000000-0000-4000-8000-000000000001');
  });

  it('reply with url file emits AgentFileRef including url', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.reply('Here is the report', {
            files: [{ filename: 'report.pdf', url: 'https://example.com/report.pdf' }],
          });
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches[0][1].event).toEqual({
      type: 'message',
      messageId: 'msg_00000000-0000-4000-8000-000000000001',
      content: { markdown: 'Here is the report' },
      files: [
        {
          fileId: 'report.pdf',
          name: 'report.pdf',
          url: 'https://example.com/report.pdf',
        },
      ],
    });
  });

  it('handle.edit emits channel.edit with the same message id', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          const handle = await ctx.reply('Draft');
          await handle.edit('Final');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(4);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event.type).toBe('message');
    expect(eventBatches[1][0].event).toEqual({
      type: 'channel.edit',
      messageId: 'msg_00000000-0000-4000-8000-000000000001',
      content: { markdown: 'Final' },
    });
    expect(eventBatches[2][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[3][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  it('typing emits channel.typing events', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.typing('Searching…');
          await ctx.typing.stop();
          await ctx.reply('Done');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'channel.typing',
      state: 'on',
      status: 'Searching…',
    });
    expect(eventBatches[1][0].event).toEqual({ type: 'channel.typing', state: 'off' });
    expect(eventBatches[2][0].event.type).toBe('message');
    expect(eventBatches[3][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[4][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  it('batches queued signal then message in one flush on reply', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          ctx.metadata.set('language', 'en');
          await ctx.reply('Got it');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(3);
    expect(eventBatches[0]).toHaveLength(3);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'signal',
      signal: { type: 'metadata', action: 'set', key: 'language', value: 'en' },
    });
    expect(eventBatches[0][2].event).toMatchObject({
      type: 'message',
      content: { markdown: 'Got it' },
    });
    expect(eventBatches[1][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[2][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  it('legacy mode without eventsUrl still POSTs to replyUrl', async () => {
    const { eventBatches, replyPosts } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.reply('Legacy reply');
        },
      }),
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(0);
    expect(replyPosts).toHaveLength(2);
    expect(replyPosts[0].reply).toEqual({ markdown: 'Legacy reply' });
    expect(replyPosts[1].typing).toBe('stop');
  });

  it('replyApprovalCard drains tool-approval-request without a message event', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.toolApproval.request({ id: 'tc-1', name: 'doIt', input: { x: 1 } });
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(3);
    expect(eventBatches[0]).toHaveLength(2);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'tool-approval-request',
      approvalId: 'tc-1',
      toolUseId: 'tc-1',
      toolName: 'doIt',
      input: { x: 1 },
    });
    expect(eventBatches[0].some((envelope) => envelope.event.type === 'message')).toBe(false);
    expect(eventBatches[1][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[2][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  function flattenEventTypes(
    eventBatches: Array<{ sequence: number; event: { type: string; [key: string]: unknown } }[]>
  ) {
    return eventBatches.flat().map((envelope) => envelope.event);
  }

  it('brackets successful dispatch with run-start first and run-finish last', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.reply('Hello');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    const events = flattenEventTypes(eventBatches);
    expect(events[0]).toEqual({ type: 'run-start' });
    expect(events.some((event) => event.type === 'run-error')).toBe(false);

    const runFinishIndex = events.findIndex((event) => event.type === 'run-finish');
    expect(runFinishIndex).toBeGreaterThan(-1);
    expect(events[runFinishIndex]).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(events.slice(runFinishIndex + 1).every((event) => event.type === 'channel.typing')).toBe(true);
  });

  it('emits run-error without run-finish when handler throws and onError is absent', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async () => {
          throw new Error('boom');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    const events = flattenEventTypes(eventBatches);
    expect(events[0]).toEqual({ type: 'run-start' });
    expect(events.some((event) => event.type === 'run-error' && event.message === 'boom')).toBe(true);
    expect(events.some((event) => event.type === 'run-finish')).toBe(false);
  });

  it('emits message and run-finish when onError replies after handler throw', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async () => {
          throw new Error('handler blew up');
        },
        onError: async () => 'recovered',
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    const events = flattenEventTypes(eventBatches);
    expect(
      events.some(
        (event) =>
          event.type === 'message' && (event as { content?: { markdown?: string } }).content?.markdown === 'recovered'
      )
    ).toBe(true);
    expect(events.some((event) => event.type === 'run-finish' && event.outcome === 'completed')).toBe(true);
    expect(events.some((event) => event.type === 'run-error')).toBe(false);
  });

  it('legacy error path does not call events endpoint', async () => {
    const { eventBatches, replyPosts } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async () => {
          throw new Error('fail');
        },
      }),
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(0);
    expect(replyPosts.some((body) => body.error === true)).toBe(true);
  });
});
