import { createHmac } from 'node:crypto';
import { createMemoryState } from '@chat-adapter/state-memory';
import { Actions, Button, Card, CardText, Chat } from 'chat';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NovuAdapterImpl } from './adapter.js';
import { createNovuAdapter, getNovuContext } from './index.js';
import { encodeThreadId } from './thread-id.js';
import type { AgentBridgeRequest, AgentSubscriber, NovuRawMessage } from './types.js';

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
      author: {
        userId: 'u1',
        userName: 'alice',
        fullName: 'Alice',
        isBot: false,
      },
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
    history: [
      {
        role: 'user',
        type: 'text',
        content: 'earlier',
        createdAt: new Date().toISOString(),
      },
    ],
    platform: 'slack',
    platformContext: { threadId: 'pm-1', channelId: 'C1', isDM: false },
    ...overrides,
  };
}

async function deliver(adapter: ReturnType<typeof createNovuAdapter>, req: AgentBridgeRequest): Promise<Response> {
  const body = JSON.stringify(req);
  const request = new Request('https://bridge.example.com/api/novu', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'novu-signature': sign(body),
    },
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
    const chat = new Chat({
      userName: 'support',
      adapters: { novu: adapter },
      state: createMemoryState(),
    });

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
      bridgeRequest({
        conversation: { ...bridgeRequest().conversation, messageCount: 1 },
        history: [],
      })
    );

    expect(mentions).toEqual(['hello']);
  });

  it('routes first channel mention to onNewMention when history includes the current message', async () => {
    const { adapter, chat } = buildChat();
    const mentions: string[] = [];
    chat.onNewMention(async (_thread, message) => {
      mentions.push(message.text);
    });
    chat.onSubscribedMessage(async () => {
      throw new Error('first mention should not route to onSubscribedMessage');
    });
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        conversation: { ...bridgeRequest().conversation, messageCount: 1 },
        history: [
          {
            role: 'user',
            type: 'text',
            content: 'hello',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );

    expect(mentions).toEqual(['hello']);
  });

  it('routes an ongoing DM conversation to onSubscribedMessage (not onDirectMessage)', async () => {
    const { adapter, chat } = buildChat();
    const subscribed: string[] = [];
    chat.onNewMention(async () => {
      throw new Error('ongoing DM should not route to onNewMention');
    });
    chat.onSubscribedMessage(async (_thread, message) => {
      subscribed.push(message.text);
    });
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        platformContext: {
          threadId: 'dm-thread',
          channelId: 'dm-channel',
          isDM: true,
        },
        conversation: { ...bridgeRequest().conversation, messageCount: 3 },
      })
    );

    expect(subscribed).toEqual(['hello']);
  });

  it('rejects an invalid signature with 401 and does not dispatch', async () => {
    const { adapter, chat } = buildChat();
    const handler = vi.fn();
    chat.onSubscribedMessage(handler);
    await chat.initialize();

    const body = JSON.stringify(bridgeRequest());
    const request = new Request('https://bridge.example.com/api/novu', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'novu-signature': sign(body, 'wrong-secret'),
      },
      body,
    });
    const res = await adapter.handleWebhook(request);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes a chat-sdk Card posted by a handler into reply.card', async () => {
    const { adapter, chat } = buildChat();
    chat.onSubscribedMessage(async (thread) => {
      await thread.post(
        Card({
          title: 'Card title',
          subtitle: 'Card subtitle',
          children: [
            CardText('Hello from a card'),
            Actions([
              Button({
                id: 'approve',
                label: 'Approve',
                style: 'primary',
                value: 'yes',
              }),
            ]),
          ],
        })
      );
    });
    await chat.initialize();

    await deliver(adapter, bridgeRequest());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    expect(payload.reply.markdown).toBeUndefined();
    expect(payload.reply.card).toMatchObject({
      type: 'card',
      title: 'Card title',
      subtitle: 'Card subtitle',
    });
    expect(payload.reply.card.children).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'text', content: 'Hello from a card' })])
    );
  });

  it('exposes the full subscriber via getNovuContext(thread).getSubscriber()', async () => {
    const { adapter, chat } = buildChat();
    const richSubscriber: AgentSubscriber = {
      subscriberId: 'sub-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      phone: '+15550001111',
      avatar: 'https://cdn.example.com/alice.png',
      locale: 'en-US',
      data: { plan: 'enterprise' },
    };
    let captured: AgentSubscriber | null = null;
    chat.onSubscribedMessage(async (thread) => {
      captured = await getNovuContext(thread).getSubscriber();
    });
    await chat.initialize();

    await deliver(adapter, bridgeRequest({ subscriber: richSubscriber }));

    expect(captured).toEqual(richSubscriber);
  });

  it('presents the subscriber as the message author so getUser(author.userId) resolves', async () => {
    const { adapter, chat } = buildChat();
    let authorUserId = '';
    let resolvedFullName: string | undefined;
    chat.onSubscribedMessage(async (_thread, message) => {
      authorUserId = message.author.userId;
      // The platform-native author is still available on the raw escape hatch.
      expect((message.raw as NovuRawMessage).author.userId).toBe('u1');
      const user = await adapter.getUser?.(message.author.userId);
      resolvedFullName = user?.fullName;
    });
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        message: {
          text: 'hello',
          platformMessageId: 'pm-1',
          author: {
            userId: 'u1',
            userName: 'alice',
            fullName: 'Alice',
            isBot: false,
          },
          timestamp: new Date().toISOString(),
        },
        subscriber: {
          subscriberId: 'sub-1',
          firstName: 'Alice',
          lastName: 'Smith',
        },
      })
    );

    expect(authorUserId).toBe('sub-1');
    expect(resolvedFullName).toBe('Alice Smith');
  });

  it('resolves the subscriber as portable UserInfo via getUser(subscriberId)', async () => {
    const { adapter, chat } = buildChat();
    chat.onSubscribedMessage(async () => {});
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        subscriber: {
          subscriberId: 'sub-1',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          avatar: 'https://cdn.example.com/alice.png',
        },
      })
    );

    expect(await adapter.getUser?.('sub-1')).toEqual({
      userId: 'sub-1',
      userName: 'sub-1',
      fullName: 'Alice Smith',
      email: 'alice@example.com',
      avatarUrl: 'https://cdn.example.com/alice.png',
      isBot: false,
    });
    expect(await adapter.getUser?.('unknown')).toBeNull();
  });

  it('exposes conversation, history, metadata, and email context via getNovuContext', async () => {
    const { adapter, chat } = buildChat();
    let ctx: ReturnType<typeof getNovuContext> | null = null;
    chat.onSubscribedMessage(async (thread) => {
      ctx = getNovuContext(thread);
    });
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        platform: 'email',
        conversation: {
          identifier: 'conv-1',
          status: 'open',
          metadata: { ticketId: 'T-42' },
          messageCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          lastActivityAt: '2026-01-02T00:00:00.000Z',
        },
        history: [
          {
            role: 'user',
            type: 'text',
            content: 'earlier with attachment',
            richContent: {
              attachments: [
                {
                  type: 'image',
                  url: 'https://cdn.example.com/a.png',
                  name: 'a.png',
                },
              ],
            },
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        platformContext: {
          threadId: 'email-thread',
          channelId: 'email-channel',
          isDM: false,
          email: {
            domain: { id: 'dom-1', name: 'support.example.com' },
            route: { address: 'help@support.example.com' },
            rootMessageId: '<root@example.com>',
          },
        },
      })
    );

    expect(ctx).not.toBeNull();
    const novu = ctx!;

    expect(await novu.getConversation()).toMatchObject({
      identifier: 'conv-1',
      status: 'open',
      messageCount: 2,
      metadata: { ticketId: 'T-42' },
    });
    expect(await novu.getMetadata('ticketId')).toBe('T-42');
    expect(await novu.getHistory()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'earlier with attachment',
          richContent: expect.objectContaining({
            attachments: expect.arrayContaining([expect.objectContaining({ url: 'https://cdn.example.com/a.png' })]),
          }),
        }),
      ])
    );
    expect(await novu.getEmailContext()).toMatchObject({
      domain: { id: 'dom-1', name: 'support.example.com' },
      route: { address: 'help@support.example.com' },
      rootMessageId: '<root@example.com>',
    });

    await novu.clearMetadata();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"action":"clear"'),
      })
    );
    expect(await novu.getMetadata('ticketId')).toBeUndefined();
    expect((await novu.getConversation())?.metadata).toEqual({});
  });

  it('updates metadata snapshot optimistically after setMetadata in the same handler turn', async () => {
    const { adapter, chat } = buildChat();
    let ctx: ReturnType<typeof getNovuContext> | null = null;
    chat.onSubscribedMessage(async (thread) => {
      ctx = getNovuContext(thread);
      await ctx.setMetadata('ticketId', 'T-99');
      expect(await ctx.getMetadata('ticketId')).toBe('T-99');
      expect((await ctx.getConversation())?.metadata.ticketId).toBe('T-99');
    });
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        conversation: {
          identifier: 'conv-1',
          status: 'open',
          metadata: { ticketId: 'T-42' },
          messageCount: 2,
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        },
      })
    );

    expect(ctx).not.toBeNull();
  });

  it('marks conversation resolved in snapshot after resolve()', async () => {
    const { adapter, chat } = buildChat();
    let ctx: ReturnType<typeof getNovuContext> | null = null;
    chat.onSubscribedMessage(async (thread) => {
      ctx = getNovuContext(thread);
      await ctx.resolve('done');
      expect((await ctx.getConversation())?.status).toBe('resolved');
    });
    await chat.initialize();

    await deliver(adapter, bridgeRequest());
    expect(ctx).not.toBeNull();
  });

  it('preserves Novu history fields on fetchMessages', async () => {
    const { adapter, chat } = buildChat();
    chat.onSubscribedMessage(async () => {});
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        history: [
          {
            role: 'assistant',
            type: 'card',
            content: 'Card fallback text',
            richContent: {
              card: { type: 'card', title: 'Saved card', children: [] },
            },
            senderName: 'Agent',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      })
    );

    const threadId = encodeThreadId({
      platform: 'slack',
      integrationIdentifier: 'slack-prod',
      conversationId: 'conv-1',
      isDM: false,
    });
    const { messages } = await adapter.fetchMessages(threadId);
    const historyMsg = messages[0]!;

    expect(historyMsg.text).toBe('Card fallback text');
    expect((historyMsg.raw as NovuRawMessage).history).toMatchObject({
      role: 'assistant',
      type: 'card',
      richContent: expect.objectContaining({
        card: expect.objectContaining({ title: 'Saved card' }),
      }),
    });
  });

  it('normalizes outbound files on markdown replies into reply.files', async () => {
    const { adapter, chat } = buildChat();
    chat.onSubscribedMessage(async (thread) => {
      await thread.post({
        markdown: 'See attached',
        files: [
          {
            filename: 'note.txt',
            data: Buffer.from('hello'),
            mimeType: 'text/plain',
          },
        ],
      });
    });
    await chat.initialize();

    await deliver(adapter, bridgeRequest());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const payload = JSON.parse(init.body as string);
    expect(payload.reply.markdown).toBe('See attached');
    expect(payload.reply.files).toEqual([
      expect.objectContaining({
        filename: 'note.txt',
        mimeType: 'text/plain',
        data: Buffer.from('hello').toString('base64'),
      }),
    ]);
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

  it('allows retry after transient dispatch failure (does not permanently dedupe)', async () => {
    const { adapter, chat } = buildChat();
    const handler = vi.fn();
    chat.onSubscribedMessage(handler);
    await chat.initialize();

    const req = bridgeRequest({ deliveryId: 'retry-delivery' });
    const cacheSnapshot = vi.spyOn(NovuAdapterImpl.prototype, 'cacheSnapshot');
    cacheSnapshot.mockRejectedValueOnce(new Error('transient cache failure'));

    await expect(deliver(adapter, req)).rejects.toThrow('transient cache failure');
    await deliver(adapter, req);

    expect(handler).toHaveBeenCalledTimes(1);
    cacheSnapshot.mockRestore();
  });

  it('applies fetchMessages limit and pagination cursor', async () => {
    const { adapter, chat } = buildChat();
    chat.onSubscribedMessage(async () => {});
    await chat.initialize();

    await deliver(
      adapter,
      bridgeRequest({
        history: Array.from({ length: 5 }, (_, index) => ({
          role: 'user' as const,
          type: 'text' as const,
          content: `msg-${index}`,
          createdAt: `2026-01-01T00:00:0${index}.000Z`,
        })),
      })
    );

    const threadId = encodeThreadId({
      platform: 'slack',
      integrationIdentifier: 'slack-prod',
      conversationId: 'conv-1',
      isDM: false,
    });

    const firstPage = await adapter.fetchMessages(threadId, { limit: 2 });
    expect(firstPage.messages.map((message) => message.text)).toEqual(['msg-3', 'msg-4']);
    expect(firstPage.nextCursor).toBe('3');

    const secondPage = await adapter.fetchMessages(threadId, {
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.messages.map((message) => message.text)).toEqual(['msg-1', 'msg-2']);
    expect(secondPage.nextCursor).toBe('1');
  });
});
