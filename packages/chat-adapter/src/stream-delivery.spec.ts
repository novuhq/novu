import { describe, expect, it } from 'vitest';
import { appendStreamChunk, consumeTextStream, deliverBufferedStream, shouldBufferStream } from './stream-delivery.js';

describe('shouldBufferStream', () => {
  it('buffers on platforms without live edit support', () => {
    expect(shouldBufferStream('whatsapp')).toBe(true);
    expect(shouldBufferStream('email')).toBe(true);
  });

  it('streams with edits on edit-capable platforms', () => {
    expect(shouldBufferStream('slack')).toBe(false);
    expect(shouldBufferStream('telegram')).toBe(false);
  });
});

describe('appendStreamChunk', () => {
  it('appends plain text and markdown_text chunks', async () => {
    expect(appendStreamChunk('hi', ' there')).toBe('hi there');
    expect(appendStreamChunk('hi', { type: 'markdown_text', text: '!' })).toBe('hi!');
  });
});

describe('deliverBufferedStream', () => {
  it('posts one final message with accumulated text', async () => {
    async function* stream() {
      yield 'Hello';
      yield { type: 'markdown_text', text: ', world' };
    }

    const posts: string[] = [];
    const result = await deliverBufferedStream('thread-1', stream(), {
      postMessage: async (_threadId, message) => {
        posts.push(String(message.markdown));

        return { id: 'msg-1', raw: {} as never, threadId: 'thread-1' };
      },
      editMessage: async () => {
        throw new Error('edit should not be called');
      },
    });

    expect(posts).toEqual(['Hello, world']);
    expect(result.id).toBe('msg-1');
  });
});

describe('consumeTextStream', () => {
  it('accumulates mixed chunks', async () => {
    async function* stream() {
      yield 'a';
      yield { type: 'markdown_text', text: 'b' };
    }

    await expect(consumeTextStream(stream())).resolves.toBe('ab');
  });
});
