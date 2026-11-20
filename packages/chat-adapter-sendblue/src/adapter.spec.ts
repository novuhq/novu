import { SendblueAdapter } from 'chat-adapter-sendblue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendblueAdapterImpl } from './adapter.js';
import type { SendblueAdapterConfig } from './types.js';

const CONFIG: SendblueAdapterConfig = {
  apiKey: 'key-id',
  secretKey: 'secret-key',
  fromNumber: '+15122164639',
  webhookSecret: 'hook-secret',
};

function spyOnVendorPostMessage() {
  return vi
    .spyOn(SendblueAdapter.prototype, 'postMessage')
    .mockResolvedValue({ id: 'out-1', raw: {}, threadId: 'sendblue:t' } as never);
}

describe('SendblueAdapterImpl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('userName', () => {
    it('defaults to sendblue-agent instead of the vendor default', () => {
      const adapter = new SendblueAdapterImpl(CONFIG);

      expect(adapter.userName).toBe('sendblue-agent');
    });

    it('uses the configured userName when provided', () => {
      const adapter = new SendblueAdapterImpl({ ...CONFIG, userName: 'support-bot' });

      expect(adapter.userName).toBe('support-bot');
    });
  });

  describe('thread ids', () => {
    it('opens DMs keyed by the configured from number and target phone', async () => {
      const adapter = new SendblueAdapterImpl(CONFIG);

      const threadId = await adapter.openDM('+19998887777');

      expect(adapter.decodeThreadId(threadId)).toEqual({
        fromNumber: '+15122164639',
        contactNumber: '+19998887777',
      });
    });

    it('treats 1:1 threads as DMs and group threads as non-DMs', async () => {
      const adapter = new SendblueAdapterImpl(CONFIG);

      const dmThreadId = await adapter.openDM('+19998887777');
      const groupThreadId = adapter.encodeThreadId({ fromNumber: '+15122164639', groupId: 'group-1' });

      expect(adapter.isDM(dmThreadId)).toBe(true);
      expect(adapter.isDM(groupThreadId)).toBe(false);
    });
  });

  describe('postMessage', () => {
    it('passes plain text through and converts markdown to plain text for iMessage/SMS', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);

      await adapter.postMessage('sendblue:t', 'hello');
      await adapter.postMessage('sendblue:t', { markdown: 'Hello **world**' });

      expect(postMessage).toHaveBeenNthCalledWith(1, 'sendblue:t', 'hello');
      expect(postMessage).toHaveBeenNthCalledWith(2, 'sendblue:t', { markdown: 'Hello world' });
    });

    it('keeps attachments when converting markdown to plain text', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);
      const files = [{ name: 'photo.png', mimeType: 'image/png', data: Buffer.from('img') }];

      await adapter.postMessage('sendblue:t', { markdown: 'See **this**', files } as never);

      expect(postMessage).toHaveBeenCalledWith('sendblue:t', { markdown: 'See this', files });
    });

    it('converts markdown tables and links before handing off to the vendor', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);

      await adapter.postMessage('sendblue:t', {
        markdown: ['See [docs](https://example.com).', '', '| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n'),
      });

      const delivered = postMessage.mock.calls[0]?.[1] as { markdown: string };
      expect(delivered.markdown).toContain('docs (https://example.com)');
      expect(delivered.markdown).toContain('1');
      expect(delivered.markdown).toContain('2');
      expect(delivered.markdown).not.toContain('| ---');
      expect(delivered.markdown).not.toContain('[docs]');
    });

    it('flattens a bare card to markdown text, since the vendor adapter cannot render cards', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);

      await adapter.postMessage('sendblue:t', {
        card: {
          type: 'card',
          children: [
            { type: 'text', content: 'Your order shipped' },
            { type: 'text', content: 'Powered by Novu' },
          ],
        },
      } as never);

      expect(postMessage).toHaveBeenCalledWith('sendblue:t', {
        markdown: 'Your order shipped\n\nPowered by Novu',
      });
    });

    it('keeps attachments posted alongside a card', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);
      const files = [{ name: 'receipt.pdf', mimeType: 'application/pdf', data: Buffer.from('pdf') }];

      await adapter.postMessage('sendblue:t', {
        card: { type: 'card', children: [{ type: 'text', content: 'Your order shipped' }] },
        files,
      } as never);

      expect(postMessage).toHaveBeenCalledWith('sendblue:t', { markdown: 'Your order shipped', files });
    });

    it('prefers an explicit fallbackText over rendering the card', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);

      await adapter.postMessage('sendblue:t', {
        card: { type: 'card', children: [{ type: 'text', content: 'Rich content' }] },
        fallbackText: 'Plain fallback',
      } as never);

      expect(postMessage).toHaveBeenCalledWith('sendblue:t', { markdown: 'Plain fallback' });
    });

    it('flattens a direct CardElement postable', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);

      await adapter.postMessage('sendblue:t', {
        type: 'card',
        children: [{ type: 'text', content: 'Direct card' }],
      } as never);

      expect(postMessage).toHaveBeenCalledWith('sendblue:t', { markdown: 'Direct card' });
    });
  });
});
