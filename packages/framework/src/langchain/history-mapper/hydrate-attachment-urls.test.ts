import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hydrateUnreachableAttachmentUrls, isProviderFetchableUrl } from './hydrate-attachment-urls';

describe('isProviderFetchableUrl', () => {
  it('accepts public https URLs', () => {
    expect(isProviderFetchableUrl('https://files.novu.co/photo.png')).toBe(true);
  });

  it('rejects http and loopback hosts', () => {
    expect(isProviderFetchableUrl('http://localhost:4566/novu-local/photo.png')).toBe(false);
    expect(isProviderFetchableUrl('https://127.0.0.1/photo.png')).toBe(false);
    expect(isProviderFetchableUrl('http://files.novu.co/photo.png')).toBe(false);
  });
});

describe('hydrateUnreachableAttachmentUrls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('inlines base64 for local http image URLs and leaves https URLs alone', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => pngBytes.buffer,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await hydrateUnreachableAttachmentUrls([
      new SystemMessage('sys'),
      new HumanMessage({
        content: [
          { type: 'image', url: 'http://localhost:4566/novu-local/photo.png', mimeType: 'image/png' },
          { type: 'image', url: 'https://files.novu.co/remote.png', mimeType: 'image/png' },
          { type: 'text', text: 'what is this?' },
        ],
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4566/novu-local/photo.png', {
      redirect: 'error',
      credentials: 'omit',
    });
    expect(result[1]).toBeInstanceOf(HumanMessage);
    expect(result[1].content).toEqual([
      { type: 'image', mimeType: 'image/png', data: Buffer.from(pngBytes).toString('base64') },
      { type: 'image', url: 'https://files.novu.co/remote.png', mimeType: 'image/png' },
      { type: 'text', text: 'what is this?' },
    ]);
  });

  it('inlines local http PDF file parts', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => pdfBytes.buffer,
      })
    );

    const result = await hydrateUnreachableAttachmentUrls([
      new HumanMessage({
        content: [
          {
            type: 'file',
            url: 'http://127.0.0.1:4566/report.pdf',
            mimeType: 'application/pdf',
            metadata: { title: 'report.pdf' },
          },
        ],
      }),
    ]);

    expect(result[0].content).toEqual([
      {
        type: 'file',
        mimeType: 'application/pdf',
        metadata: { title: 'report.pdf' },
        data: Buffer.from(pdfBytes).toString('base64'),
      },
    ]);
  });

  it('omits an over-budget local file and keeps the rest of the turn', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(26 * 1024 * 1024) : null) },
        arrayBuffer: async () => {
          throw new Error('should not download an over-budget attachment');
        },
      })
    );

    const result = await hydrateUnreachableAttachmentUrls([
      new HumanMessage({
        content: [
          { type: 'file', url: 'http://localhost:4566/huge.pdf', mimeType: 'application/pdf' },
          { type: 'text', text: 'summarize this' },
        ],
      }),
    ]);

    expect(result[0].content).toEqual([{ type: 'text', text: 'summarize this' }]);
  });
});
