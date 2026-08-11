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
    startTyping: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function createAdapter(config: WebChatAdapterConfig = createConfig()) {
  const adapter = new NovuWebChatAdapterImpl(config);
  const processMessage = vi.fn();
  const processAction = vi.fn();
  await adapter.initialize({ processMessage, processAction, getState: () => ({}) } as never);

  return { adapter, processMessage, processAction, config };
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
    expect(await empty.json()).toEqual({ message: 'text or actionId is required' });
    expect(badId.status).toBe(400);
  });

  it('returns 400 when both text and actionId are provided', async () => {
    const { adapter, processMessage, processAction } = await createAdapter();

    const response = await adapter.handleWebhook(
      jsonRequest({
        agentId: 'a',
        text: 'hi',
        actionId: 'tool-approval:approve:tc1',
        sourceMessageId: 'act_card0000001',
        conversationIdentifier: 'conv_abcdefghijkl',
      })
    );

    expect(response.status).toBe(400);
    expect(processMessage).not.toHaveBeenCalled();
    expect(processAction).not.toHaveBeenCalled();
  });

  it('returns 402 when checkAcceptLimits blocks a new thread', async () => {
    const checkAcceptLimits = vi.fn(async () => ({
      reason: 'agents' as const,
      message: 'Upgrade your plan',
    }));
    const { adapter, processMessage } = await createAdapter(createConfig({ checkAcceptLimits }));

    const response = await adapter.handleWebhook(jsonRequest({ agentId: 'agent_1', text: 'Hello' }));
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body).toEqual({ reason: 'agents', message: 'Upgrade your plan' });
    expect(processMessage).not.toHaveBeenCalled();
    expect(checkAcceptLimits).toHaveBeenCalledWith({ session: SESSION, isNewThread: true });
  });

  it('returns 402 on resume when checkAcceptLimits blocks agent/channel limits', async () => {
    const checkAcceptLimits = vi.fn(async () => ({
      reason: 'channels' as const,
      message: 'Channel limit reached',
    }));
    const { adapter, processMessage } = await createAdapter(
      createConfig({ checkAcceptLimits, authorizeResume: async () => true })
    );

    const response = await adapter.handleWebhook(
      jsonRequest({ agentId: 'a', text: 'follow up', conversationIdentifier: 'conv_abcdefghijkl' })
    );

    expect(response.status).toBe(402);
    expect(processMessage).not.toHaveBeenCalled();
    expect(checkAcceptLimits).toHaveBeenCalledWith({ session: SESSION, isNewThread: false });
  });

  it('dispatches processMessage then returns 201', async () => {
    const { adapter, processMessage } = await createAdapter();

    const response = await adapter.handleWebhook(jsonRequest({ agentId: 'agent_1', text: 'Hello' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.identifier).toMatch(/^conv_[0-9a-z]{12}$/);
    expect(body.data.messageId).toMatch(/^msg_[0-9a-z]{12}$/);
    expect(processMessage).toHaveBeenCalledOnce();
    expect(processMessage.mock.calls[0]?.[1]).toBe(`web_chat:${body.data.identifier}`);
    expect(processMessage.mock.calls[0]?.[2].id).toBe(body.data.messageId);
  });

  it('ignores client messageId and always mints server message id', async () => {
    const { adapter, processMessage } = await createAdapter();

    await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: 'retry me', messageId: 'msg_abcdefghijkl' }));

    expect(processMessage.mock.calls[0]?.[2].id).toMatch(/^msg_[0-9a-z]{12}$/);
    expect(processMessage.mock.calls[0]?.[2].id).not.toBe('msg_abcdefghijkl');
  });

  it('resumes with conversationIdentifier when authorizeResume allows', async () => {
    const authorizeResume = vi.fn(async () => true);
    const { adapter, processMessage } = await createAdapter(createConfig({ authorizeResume }));

    const response = await adapter.handleWebhook(
      jsonRequest({
        agentId: 'a',
        text: 'follow up',
        conversationIdentifier: 'conv_abcdefghijkl',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.identifier).toBe('conv_abcdefghijkl');
    expect(authorizeResume).toHaveBeenCalledWith({
      conversationId: 'conv_abcdefghijkl',
      session: SESSION,
    });
    expect(processMessage.mock.calls[0]?.[1]).toBe('web_chat:conv_abcdefghijkl');
  });

  it('resumes with id alias when authorizeResume allows', async () => {
    const { adapter, processMessage } = await createAdapter(createConfig({ authorizeResume: async () => true }));

    const response = await adapter.handleWebhook(
      jsonRequest({ agentId: 'a', text: 'follow up', id: 'conv_abcdefghijkl' })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.identifier).toBe('conv_abcdefghijkl');
    expect(processMessage.mock.calls[0]?.[1]).toBe('web_chat:conv_abcdefghijkl');
  });

  it('returns 404 when authorizeResume denies resume', async () => {
    const { adapter, processMessage } = await createAdapter(createConfig({ authorizeResume: async () => false }));

    const response = await adapter.handleWebhook(
      jsonRequest({ agentId: 'a', text: 'nope', conversationIdentifier: 'conv_abcdefghijkl' })
    );

    expect(response.status).toBe(404);
    expect(processMessage).not.toHaveBeenCalled();
  });

  it('returns 404 when resume id is present but authorizeResume is not configured', async () => {
    const { adapter, processMessage } = await createAdapter();

    const response = await adapter.handleWebhook(jsonRequest({ agentId: 'a', text: 'nope', id: 'conv_abcdefghijkl' }));

    expect(response.status).toBe(404);
    expect(processMessage).not.toHaveBeenCalled();
  });

  it('dispatches processAction then returns 200 for actionId ingress', async () => {
    const authorizeResume = vi.fn(async () => true);
    const { adapter, processMessage, processAction } = await createAdapter(createConfig({ authorizeResume }));

    const response = await adapter.handleWebhook(
      jsonRequest({
        agentId: 'a',
        actionId: 'tool-approval:approve:tc1',
        sourceMessageId: 'act_card0000001',
        value: 'Approve once',
        conversationIdentifier: 'conv_abcdefghijkl',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.identifier).toBe('conv_abcdefghijkl');
    expect(processMessage).not.toHaveBeenCalled();
    expect(processAction).toHaveBeenCalledOnce();
    expect(processAction.mock.calls[0]?.[0]).toMatchObject({
      actionId: 'tool-approval:approve:tc1',
      messageId: 'act_card0000001',
      value: 'Approve once',
      threadId: 'web_chat:conv_abcdefghijkl',
      user: { userId: 'sub_1' },
    });
  });

  it('returns 400 when actionId is missing conversationIdentifier or non-approval sourceMessageId', async () => {
    const { adapter, processAction } = await createAdapter(createConfig({ authorizeResume: async () => true }));

    const missingConv = await adapter.handleWebhook(
      jsonRequest({
        agentId: 'a',
        actionId: 'some-button-id',
        sourceMessageId: 'act_card0000001',
      })
    );
    const missingSource = await adapter.handleWebhook(
      jsonRequest({
        agentId: 'a',
        actionId: 'some-button-id',
        conversationIdentifier: 'conv_abcdefghijkl',
      })
    );

    expect(missingConv.status).toBe(400);
    expect(missingSource.status).toBe(400);
    expect(processAction).not.toHaveBeenCalled();
  });

  it('dispatches approval actionId without sourceMessageId', async () => {
    const { adapter, processAction } = await createAdapter(createConfig({ authorizeResume: async () => true }));

    const response = await adapter.handleWebhook(
      jsonRequest({
        agentId: 'a',
        actionId: 'tool-approval:approve:tc1',
        conversationIdentifier: 'conv_abcdefghijkl',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.identifier).toBe('conv_abcdefghijkl');
    expect(processAction).toHaveBeenCalledOnce();
    expect(processAction.mock.calls[0]?.[0]).toMatchObject({
      actionId: 'tool-approval:approve:tc1',
      messageId: '',
      threadId: 'web_chat:conv_abcdefghijkl',
    });
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

  it('postMessage extracts plain text from bare CardElement posts', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    await adapter.postMessage('web_chat:conv_abcdefghijkl', {
      type: 'card',
      children: [{ type: 'text', content: 'Upgrade your plan to activate it.' }],
    } as never);

    expect(config.deliverMessage).toHaveBeenCalledWith({
      threadId: 'web_chat:conv_abcdefghijkl',
      content: 'Upgrade your plan to activate it.',
      richContent: {
        card: {
          type: 'card',
          children: [{ type: 'text', content: 'Upgrade your plan to activate it.' }],
        },
      },
    });
  });

  it('postMessage includes link children in the plain-text fallback', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    await adapter.postMessage('web_chat:conv_abcdefghijkl', {
      type: 'card',
      children: [
        { type: 'text', content: 'See the release notes.' },
        { type: 'link', label: 'Release notes', url: 'https://novu.co/notes' },
      ],
    } as never);

    expect(config.deliverMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'See the release notes.\nRelease notes (https://novu.co/notes)',
      })
    );
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

  it('declares history off, thread lock scope, and typing via injected callback', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    expect(adapter.persistMessageHistory).toBe(false);
    expect(adapter.persistThreadHistory).toBe(false);
    expect(adapter.lockScope).toBe('thread');
    await adapter.startTyping('web_chat:conv_abcdefghijkl', 'Thinking...');
    expect(config.startTyping).toHaveBeenCalledWith({
      threadId: 'web_chat:conv_abcdefghijkl',
      status: 'Thinking...',
    });
    expect(adapter.encodeThreadId({ conversationId: 'conv_abcdefghijkl' })).toBe('web_chat:conv_abcdefghijkl');
    expect(adapter.decodeThreadId('web_chat:conv_abcdefghijkl')).toEqual({ conversationId: 'conv_abcdefghijkl' });
  });

  it('declares supportsClientMessageIds and forwards an embedded messageId to deliverMessage', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    expect(adapter.supportsClientMessageIds).toBe(true);

    const sent = await adapter.postMessage('web_chat:conv_abcdefghijkl', {
      markdown: 'Agent hi',
      messageId: 'msg_fromruntime1',
    } as never);

    expect(config.deliverMessage).toHaveBeenCalledWith({
      threadId: 'web_chat:conv_abcdefghijkl',
      content: 'Agent hi',
      richContent: undefined,
      messageId: 'msg_fromruntime1',
    });
    // The delivery callback owns the final id (hint honored or minted).
    expect(sent.id).toBe('act_delivered1ab');
  });

  it('stopTyping delegates to startTyping callback without a status', async () => {
    const config = createConfig();
    const { adapter } = await createAdapter(config);

    await adapter.stopTyping('web_chat:conv_abcdefghijkl');

    expect(config.startTyping).toHaveBeenCalledWith({ threadId: 'web_chat:conv_abcdefghijkl' });
  });
});
