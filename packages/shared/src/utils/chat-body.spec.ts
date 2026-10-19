import { describe, expect, it } from 'vitest';
import { isMailyChatBody } from './chat-body';

describe('isMailyChatBody', () => {
  it('returns false for a plain string body', () => {
    expect(isMailyChatBody('Hello world')).toBe(false);
  });

  it('returns true for a real Maily document JSON', () => {
    const mailyDoc = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    });

    expect(isMailyChatBody(mailyDoc)).toBe(true);
  });

  it('returns false for malformed JSON', () => {
    expect(isMailyChatBody('{ not valid json')).toBe(false);
  });

  it('returns false for JSON that is an object but not a doc', () => {
    expect(isMailyChatBody(JSON.stringify({ type: 'paragraph', content: [] }))).toBe(false);
    expect(isMailyChatBody(JSON.stringify({ type: 'doc', content: 'not-an-array' }))).toBe(false);
    expect(isMailyChatBody(JSON.stringify(null))).toBe(false);
    expect(isMailyChatBody(JSON.stringify([{ type: 'doc' }]))).toBe(false);
  });
});
