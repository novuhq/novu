import type { ChatInstance } from 'chat';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendblueAdapterConfig } from './types.js';

const vendorMocks = vi.hoisted(() => ({
  createSendblueAdapter: vi.fn(),
}));

vi.mock('chat-adapter-sendblue', () => ({
  createSendblueAdapter: vendorMocks.createSendblueAdapter,
}));

const { SendblueAdapterImpl } = await import('./adapter.js');

const CONFIG: SendblueAdapterConfig = {
  apiKey: 'key-id',
  secretKey: 'secret-key',
  fromNumber: '+15122164639',
  webhookSecret: 'hook-secret',
};

function buildVendorAdapterStub() {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    encodeThreadId: vi.fn((data: { fromNumber: string; contactNumber?: string; groupId?: string }) =>
      data.groupId
        ? `sendblue:${data.fromNumber}:g:${data.groupId}`
        : `sendblue:${data.fromNumber}:${data.contactNumber}`
    ),
    decodeThreadId: vi.fn((threadId: string) => {
      const [, fromNumber, contactOrG, groupId] = threadId.split(':');

      return contactOrG === 'g' ? { fromNumber, groupId } : { fromNumber, contactNumber: contactOrG };
    }),
    channelIdFromThreadId: vi.fn((threadId: string) => threadId.split(':').slice(0, 2).join(':')),
    handleWebhook: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    parseMessage: vi.fn(),
    postMessage: vi.fn().mockResolvedValue({ id: 'out-1', raw: {}, threadId: 'sendblue:+1:+2' }),
    renderFormatted: vi.fn().mockReturnValue('rendered'),
    fetchThread: vi.fn().mockResolvedValue({ id: 't', channelId: 'c' }),
    fetchMessages: vi.fn().mockResolvedValue({ messages: [] }),
    startTyping: vi.fn().mockResolvedValue(undefined),
    addReaction: vi.fn().mockResolvedValue(undefined),
    removeReaction: vi.fn().mockResolvedValue(undefined),
    editMessage: vi.fn().mockRejectedValue(new Error('not supported')),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SendblueAdapterImpl', () => {
  let vendor: ReturnType<typeof buildVendorAdapterStub>;

  beforeEach(() => {
    vendor = buildVendorAdapterStub();
    vendorMocks.createSendblueAdapter.mockReset().mockReturnValue(vendor);
  });

  function buildAdapter() {
    return new SendblueAdapterImpl(CONFIG);
  }

  it('constructs the vendor adapter with mapped config and a permissive service allowlist', () => {
    buildAdapter();

    expect(vendorMocks.createSendblueAdapter).toHaveBeenCalledWith({
      apiKey: 'key-id',
      apiSecret: 'secret-key',
      defaultFromNumber: '+15122164639',
      webhookSecret: 'hook-secret',
      allowedServices: ['iMessage', 'SMS'],
    });
  });

  it('overrides userName instead of using the vendor default', () => {
    const adapter = buildAdapter();

    expect(adapter.userName).toBe('sendblue-agent');
  });

  it('uses the configured userName when provided', () => {
    const adapter = new SendblueAdapterImpl({ ...CONFIG, userName: 'support-bot' });

    expect(adapter.userName).toBe('support-bot');
  });

  describe('thread ids', () => {
    it('delegates encode/decode/channel derivation to the vendor adapter', () => {
      const adapter = buildAdapter();

      const threadId = adapter.encodeThreadId({ fromNumber: '+15122164639', contactNumber: '+19998887777' });
      expect(threadId).toBe('sendblue:+15122164639:+19998887777');
      expect(adapter.decodeThreadId(threadId)).toEqual({ fromNumber: '+15122164639', contactNumber: '+19998887777' });
      expect(adapter.channelIdFromThreadId(threadId)).toBe('sendblue:+15122164639');
    });

    it('treats 1:1 threads as DMs and group threads as non-DMs', () => {
      const adapter = buildAdapter();

      expect(adapter.isDM('sendblue:+15122164639:+19998887777')).toBe(true);
      expect(adapter.isDM('sendblue:+15122164639:g:group-1')).toBe(false);
    });

    it('opens DMs keyed by the configured from number and target phone', async () => {
      const adapter = buildAdapter();

      await expect(adapter.openDM('+19998887777')).resolves.toBe('sendblue:+15122164639:+19998887777');
    });
  });

  it('delegates handleWebhook to the vendor adapter', async () => {
    const adapter = buildAdapter();
    const request = new Request('https://api.novu.co/v1/agents/a1/webhook/i1', { method: 'POST' });

    const response = await adapter.handleWebhook(request);

    expect(vendor.handleWebhook).toHaveBeenCalledWith(request, undefined);
    expect(response.status).toBe(200);
  });

  it('delegates initialize, disconnect, and lifecycle methods to the vendor adapter', async () => {
    const adapter = buildAdapter();
    const chat = {} as ChatInstance;

    await adapter.initialize(chat);
    await adapter.disconnect();

    expect(vendor.initialize).toHaveBeenCalledWith(chat);
    expect(vendor.disconnect).toHaveBeenCalledTimes(1);
  });

  describe('postMessage', () => {
    it('passes plain text and markdown through unchanged', async () => {
      const adapter = buildAdapter();

      await adapter.postMessage('sendblue:+1:+2', 'hello');
      await adapter.postMessage('sendblue:+1:+2', { markdown: 'Hello **world**' });

      expect(vendor.postMessage).toHaveBeenNthCalledWith(1, 'sendblue:+1:+2', 'hello');
      expect(vendor.postMessage).toHaveBeenNthCalledWith(2, 'sendblue:+1:+2', { markdown: 'Hello **world**' });
    });

    it('flattens a bare card to markdown text, since the vendor adapter cannot render cards', async () => {
      const adapter = buildAdapter();

      await adapter.postMessage('sendblue:+1:+2', {
        card: {
          type: 'card',
          children: [
            { type: 'text', content: 'Your order shipped' },
            { type: 'text', content: 'Powered by Novu' },
          ],
        },
      } as never);

      expect(vendor.postMessage).toHaveBeenCalledWith('sendblue:+1:+2', {
        markdown: 'Your order shipped\n\nPowered by Novu',
      });
    });

    it('prefers an explicit fallbackText over rendering the card', async () => {
      const adapter = buildAdapter();

      await adapter.postMessage('sendblue:+1:+2', {
        card: { type: 'card', children: [{ type: 'text', content: 'Rich content' }] },
        fallbackText: 'Plain fallback',
      } as never);

      expect(vendor.postMessage).toHaveBeenCalledWith('sendblue:+1:+2', { markdown: 'Plain fallback' });
    });

    it('flattens a direct CardElement postable', async () => {
      const adapter = buildAdapter();

      await adapter.postMessage('sendblue:+1:+2', {
        type: 'card',
        children: [{ type: 'text', content: 'Direct card' }],
      } as never);

      expect(vendor.postMessage).toHaveBeenCalledWith('sendblue:+1:+2', { markdown: 'Direct card' });
    });
  });

  it('delegates typing, reactions, fetch, and render to the vendor adapter', async () => {
    const adapter = buildAdapter();

    await adapter.startTyping('sendblue:+1:+2');
    await adapter.addReaction('sendblue:+1:+2', 'm1', '❤️');
    await adapter.removeReaction('sendblue:+1:+2', 'm1', '❤️');
    await adapter.fetchThread('sendblue:+1:+2');
    await adapter.fetchMessages('sendblue:+1:+2');
    adapter.renderFormatted({ type: 'root', children: [] } as never);

    expect(vendor.startTyping).toHaveBeenCalledWith('sendblue:+1:+2');
    expect(vendor.addReaction).toHaveBeenCalledWith('sendblue:+1:+2', 'm1', '❤️');
    expect(vendor.removeReaction).toHaveBeenCalledWith('sendblue:+1:+2', 'm1', '❤️');
    expect(vendor.fetchThread).toHaveBeenCalledWith('sendblue:+1:+2');
    expect(vendor.fetchMessages).toHaveBeenCalledWith('sendblue:+1:+2', undefined);
    expect(vendor.renderFormatted).toHaveBeenCalled();
  });

  it('delegates unsupported operations to the vendor adapter', async () => {
    const adapter = buildAdapter();

    await expect(adapter.editMessage('sendblue:+1:+2', 'm1', 'x')).rejects.toThrow('not supported');
    await adapter.deleteMessage('sendblue:+1:+2', 'm1');

    expect(vendor.deleteMessage).toHaveBeenCalledWith('sendblue:+1:+2', 'm1');
  });
});
