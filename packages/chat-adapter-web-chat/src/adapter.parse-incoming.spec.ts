import { describe, expect, it } from 'vitest';
import { NovuWebChatAdapterImpl } from './adapter.js';
import type { WebChatAdapterConfig, WebChatRawMessage } from './types.js';

const SHORT_MARKDOWN = '**hello** world';

function createConfig(): WebChatAdapterConfig {
  return {
    verifySession: async () => ({
      subscriberId: 'sub_1',
      environmentId: 'env_1',
      organizationId: 'org_1',
    }),
    deliverMessage: async ({ threadId }) => ({ id: 'act_delivered1ab', threadId }),
    editMessage: async ({ threadId, messageId }) => ({ id: messageId, threadId }),
    streamMessage: async ({ threadId }) => ({ id: 'act_streamed1ab', threadId }),
    deleteMessage: async () => undefined,
    startTyping: async () => undefined,
  };
}

function rawMessage(text: string): WebChatRawMessage {
  return {
    id: 'msg_abcdefghijkl',
    text,
    subscriberId: 'sub_1',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function verbatimParagraph(value: string) {
  return {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
  };
}

async function createAdapter(): Promise<NovuWebChatAdapterImpl> {
  const adapter = new NovuWebChatAdapterImpl(createConfig());
  await adapter.initialize({
    processMessage: async () => undefined,
    processAction: async () => undefined,
    getState: () => ({}),
  } as never);

  return adapter;
}

describe('NovuWebChatAdapterImpl parseMessage inbound markdown', () => {
  it('keeps short markdown text and matches parseMarkdown', async () => {
    const { parseMarkdown } = await import('chat');
    const adapter = await createAdapter();
    const message = adapter.parseMessage(rawMessage(SHORT_MARKDOWN));

    expect(message.text).toBe(SHORT_MARKDOWN);
    expect(message.formatted).toEqual(parseMarkdown(SHORT_MARKDOWN));
  });

  it('keeps fifteen thousand closing brackets as one text paragraph', async () => {
    const text = ']'.repeat(15000);
    const adapter = await createAdapter();
    const startedAt = performance.now();
    const message = adapter.parseMessage(rawMessage(text));
    const elapsedMs = performance.now() - startedAt;

    expect(message.text).toBe(text);
    expect(message.formatted).toEqual(verbatimParagraph(text));
    expect(elapsedMs).toBeLessThan(100);
  });

  it('keeps twenty thousand letters as one text paragraph', async () => {
    const text = 'a'.repeat(20000);
    const adapter = await createAdapter();
    const startedAt = performance.now();
    const message = adapter.parseMessage(rawMessage(text));
    const elapsedMs = performance.now() - startedAt;

    expect(message.text).toBe(text);
    expect(message.formatted).toEqual(verbatimParagraph(text));
    expect(elapsedMs).toBeLessThan(100);
  });
});
