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
    it('passes plain text and markdown through to the vendor unchanged', async () => {
      const postMessage = spyOnVendorPostMessage();
      const adapter = new SendblueAdapterImpl(CONFIG);

      await adapter.postMessage('sendblue:t', 'hello');
      await adapter.postMessage('sendblue:t', { markdown: 'Hello **world**' });

      expect(postMessage).toHaveBeenNthCalledWith(1, 'sendblue:t', 'hello');
      expect(postMessage).toHaveBeenNthCalledWith(2, 'sendblue:t', { markdown: 'Hello **world**' });
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
