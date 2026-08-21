import { afterEach, describe, expect, it, vi } from 'vitest';
import { hydrateUnreachableAttachmentUrls } from './hydrate-attachment-urls';

function normalizeFileData(content: unknown) {
  if (!Array.isArray(content)) {
    return content;
  }

  return content.map((part) => {
    if (part.type !== 'file') {
      return part;
    }

    if (part.data instanceof URL) {
      return { ...part, data: part.data.toString() };
    }

    if (part.data instanceof Uint8Array) {
      return { ...part, data: Buffer.from(part.data).toString('base64') };
    }

    return part;
  });
}

describe('hydrateUnreachableAttachmentUrls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('inlines local http file URLs as bytes and leaves https URLs as URLs', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => pngBytes.buffer,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await hydrateUnreachableAttachmentUrls([
      {
        role: 'user',
        content: [
          { type: 'file', data: new URL('http://localhost:4566/novu-local/photo.png'), mediaType: 'image/png' },
          { type: 'file', data: new URL('https://files.novu.co/remote.png'), mediaType: 'image/png' },
          { type: 'text', text: 'what is this?' },
        ],
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4566/novu-local/photo.png');
    expect(normalizeFileData(result[0].content)).toEqual([
      { type: 'file', data: Buffer.from(pngBytes).toString('base64'), mediaType: 'image/png' },
      { type: 'file', data: 'https://files.novu.co/remote.png', mediaType: 'image/png' },
      { type: 'text', text: 'what is this?' },
    ]);
  });
});
