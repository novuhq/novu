import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovuWebChatAdapterImpl } from './adapter.js';
import type { WebChatAdapterConfig, WebChatSession } from './types.js';

vi.mock('chat', () => {
  class Message {
    id: string;
    text: string;
    author: { userId: string };
    constructor(data: { id: string; text: string; author: { userId: string } }) {
      this.id = data.id;
      this.text = data.text;
      this.author = data.author;
    }
  }

  return {
    Message,
    parseMarkdown: (md: string) => ({ type: 'root', children: [{ type: 'text', value: md }] }),
  };
});

const SESSION: WebChatSession = {
  subscriberId: 'sub_1',
  environmentId: 'env_1',
  organizationId: 'org_1',
};

function createConfig(overrides: Partial<WebChatAdapterConfig> = {}): WebChatAdapterConfig {
  return {
    verifySession: vi.fn(async () => SESSION),
    deliverMessage: vi.fn(async ({ threadId }) => ({ id: 'act_delivered1ab', threadId })),
    editMessage: vi.fn(async ({ threadId, messageId }) => ({ id: messageId, threadId })),
    deleteMessage: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function createAdapter(config: WebChatAdapterConfig = createConfig()) {
  const adapter = new NovuWebChatAdapterImpl(config);
  const processMessage = vi.fn();
  await adapter.initialize({ processMessage, getState: () => ({}) } as never);

  return { adapter, processMessage, config };
}

function jsonRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request('https://api.novu.test/v1/web-chat/conversations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('NovuWebChatAdapterImpl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when verifySession returns null', async () => {
    const { adapter } = await createAdapter(createConfig({ verifySession: async () => null }));

    const response = await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: 'hi' }));

    expect(response.status).toBe(401);
  });

  it('returns 401 without leaking when verifySession throws', async () => {
    const { adapter } = await createAdapter(
      createConfig({
        verifySession: async () => {
          throw new Error('secret jwt detail');
        },
      })
    );

    const response = await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: 'hi' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain('secret jwt detail');
  });

  it('returns 400 for empty text and malformed conversation id', async () => {
    const { adapter } = await createAdapter();

    const empty = await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: '   ' }));
    const badId = await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: 'hi', id: 'not-a-conv' }));

    expect(empty.status).toBe(400);
    expect(badId.status).toBe(400);
  });

  it('acks fast with minted conv_ id and dispatches processMessage on prefixed thread id', async () => {
    const { adapter, processMessage } = await createAdapter();

    const response = await adapter.handleWebhook(jsonRequest({ agentId: 'agent_1', text: 'Hello' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.identifier).toMatch(/^conv_[0-9a-z]{12}$/);
    expect(processMessage).toHaveBeenCalledOnce();
    expect(processMessage.mock.calls[0]?.[1]).toBe(`web_chat:${body.data.identifier}`);
    expect(processMessage.mock.calls[0]?.[2].id).toMatch(/^msg_[0-9a-z]{12}$/);
    expect(processMessage.mock.calls[0]?.[2].text).toBe('Hello');
    expect(processMessage.mock.calls[0]?.[2].author.userId).toBe('sub_1');
  });

  it('ignores client messageId and always mints server message id (create-only)', async () => {
    const { adapter, processMessage } = await createAdapter();

    await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: 'retry me', messageId: 'msg_abcdefghijkl' }));

    expect(processMessage.mock.calls[0]?.[2].id).toMatch(/^msg_[0-9a-z]{12}$/);
    expect(processMessage.mock.calls[0]?.[2].id).not.toBe('msg_abcdefghijkl');
  });

  it('postMessage delegates to deliverMessage without inventing mongo semantics', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    const sent = await adapter.postMessage('web_chat:conv_abcdefghijkl', { markdown: 'Agent hi' });

    expect(config.deliverMessage).toHaveBeenCalledWith({
      threadId: 'web_chat:conv_abcdefghijkl',
      content: 'Agent hi',
      richContent: undefined,
    });
    expect(sent.id).toBe('act_delivered1ab');
  });

  it('editMessage and deleteMessage delegate to injected callbacks', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    await adapter.editMessage('web_chat:conv_abcdefghijkl', 'act_message0001', { markdown: 'edited' });
    await adapter.deleteMessage('web_chat:conv_abcdefghijkl', 'act_message0001');

    expect(config.editMessage).toHaveBeenCalledWith({
      threadId: 'web_chat:conv_abcdefghijkl',
      messageId: 'act_message0001',
      content: 'edited',
      richContent: undefined,
    });
    expect(config.deleteMessage).toHaveBeenCalledWith({
      threadId: 'web_chat:conv_abcdefghijkl',
      messageId: 'act_message0001',
    });
  });

  it('declares history off, thread lock scope, and no-op startTyping', async () => {
    const { adapter } = await createAdapter();

    expect(adapter.persistMessageHistory).toBe(false);
    expect(adapter.persistThreadHistory).toBe(false);
    expect(adapter.lockScope).toBe('thread');
    await expect(adapter.startTyping('web_chat:conv_abcdefghijkl')).resolves.toBeUndefined();
    expect(adapter.encodeThreadId({ conversationId: 'conv_abcdefghijkl' })).toBe('web_chat:conv_abcdefghijkl');
    expect(adapter.decodeThreadId('web_chat:conv_abcdefghijkl')).toEqual({ conversationId: 'conv_abcdefghijkl' });
  });
});
