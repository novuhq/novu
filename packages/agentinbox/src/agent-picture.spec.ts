import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkPicture, loadPicture } from './agent-picture';

describe('checkPicture', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

  it('takes a PNG and a JPEG', () => {
    expect(checkPicture(png).contentType).toBe('image/png');
    expect(checkPicture(Buffer.from([0xff, 0xd8, 0xff, 0xe0])).contentType).toBe('image/jpeg');
  });

  it('refuses anything else, whatever it is called', () => {
    expect(() => checkPicture(Buffer.from('<svg></svg>'))).toThrow('JPEG or a PNG');
  });

  it('refuses a picture over 2 MB', () => {
    expect(() => checkPicture(Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]))).toThrow('2 MB');
  });
});

describe('loadPicture from a web address', () => {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** A server that says nothing about the size and sends `pieces` of 1 MB after the PNG's first bytes. */
  function serve(pieces: number) {
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent === 0) {
          controller.enqueue(new Uint8Array(png));
        } else if (sent > pieces) {
          controller.close();

          return;
        } else {
          controller.enqueue(new Uint8Array(1024 * 1024));
        }

        sent += 1;
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body))
    );

    return { piecesSent: () => sent - 1 };
  }

  it('downloads a picture within the limit', async () => {
    serve(1);

    expect((await loadPicture('https://example.test/a.png')).contentType).toBe('image/png');
  });

  it('stops downloading once the picture is over 2 MB', async () => {
    const server = serve(500);

    await expect(loadPicture('https://example.test/huge.png')).rejects.toThrow('2 MB');
    expect(server.piecesSent()).toBeLessThan(10);
  });
});
