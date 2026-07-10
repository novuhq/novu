import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchAgentEvent } from './agent-dispatch';

const bridge = {
  version: 1 as const,
  timestamp: '2026-01-01T00:00:00.000Z',
  deliveryId: 'd1',
  event: 'onMessage',
  agentId: 'bot',
  replyUrl: 'https://api.test/v1/agents/bot/reply',
  conversationId: 'conv1',
  integrationIdentifier: 'slack-prod',
  message: {
    text: 'hi',
    platformMessageId: 'm1',
    author: { userId: 'u', fullName: 'U', userName: 'u', isBot: false },
    timestamp: '2026-01-01T00:00:00.000Z',
  },
  conversation: {
    identifier: 'c',
    status: 'active',
    metadata: {},
    messageCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActivityAt: '2026-01-01T00:00:00.000Z',
  },
  subscriber: null,
  history: [],
  platform: 'slack',
  platformContext: { threadId: 't', channelId: 'ch', isDM: false },
  action: null,
  reaction: null,
};

describe('dispatchAgentEvent errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('auto-reports when onMessage throws', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        posts.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    const logger = { error: vi.fn() };
    await dispatchAgentEvent({
      agent: {
        id: 'bot',
        handlers: {
          onMessage: () => {
            throw new Error('boom');
          },
        },
      },
      event: 'onMessage',
      bridge: bridge as never,
      secretKey: 'sk',
      logger,
    });

    expect(logger.error).toHaveBeenCalled();
    expect(posts.some((p) => (p as { error?: boolean }).error === true)).toBe(true);
    expect(posts[0]).toMatchObject({ conversationId: 'conv1', integrationIdentifier: 'slack-prod', error: true });
  });

  it('honors onError suppress', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        posts.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    await dispatchAgentEvent({
      agent: {
        id: 'bot',
        handlers: {
          onMessage: () => {
            throw new Error('expected');
          },
          onError: () => ({ suppress: true }),
        },
      },
      event: 'onMessage',
      bridge: bridge as never,
      secretKey: 'sk',
    });

    expect(posts.filter((p) => (p as { error?: boolean }).error === true)).toHaveLength(0);
  });

  it('delivers custom onError reply instead of error report', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        posts.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    await dispatchAgentEvent({
      agent: {
        id: 'bot',
        handlers: {
          onMessage: () => {
            throw new Error('boom');
          },
          onError: () => 'Custom sorry',
        },
      },
      event: 'onMessage',
      bridge: bridge as never,
      secretKey: 'sk',
    });

    const replyPosts = posts.filter((p) => (p as { reply?: unknown }).reply);
    expect(replyPosts).toHaveLength(1);
    expect(replyPosts[0]).toMatchObject({ reply: { markdown: 'Custom sorry' } });
    expect(replyPosts[0]).not.toHaveProperty('error');
  });

  it('calls typing.stop in finally after handler throw', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        posts.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ messageId: 'm', platformThreadId: 't' }), { status: 200 });
      })
    );

    await dispatchAgentEvent({
      agent: {
        id: 'bot',
        handlers: {
          onMessage: () => {
            throw new Error('boom');
          },
        },
      },
      event: 'onMessage',
      bridge: bridge as never,
      secretKey: 'sk',
    });

    expect(posts.some((p) => (p as { typing?: string }).typing === 'stop')).toBe(true);
  });
});
