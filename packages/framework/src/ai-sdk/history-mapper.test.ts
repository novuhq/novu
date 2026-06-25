import { describe, expect, it } from 'vitest';
import { toModelMessages } from './history-mapper';

describe('toModelMessages', () => {
  it('maps agent role to assistant and others to user, in order', () => {
    const result = toModelMessages([
      { role: 'user', type: 'text', content: 'hi', createdAt: '1' },
      { role: 'agent', type: 'text', content: 'hello!', createdAt: '2' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello!' },
    ]);
  });

  it('maps bridge sender roles (subscriber/agent) to user/assistant', () => {
    const result = toModelMessages([
      { role: 'subscriber', type: 'text', content: 'hi', createdAt: '1' },
      { role: 'agent', type: 'text', content: 'hello!', createdAt: '2' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello!' },
    ]);
  });

  it('skips system/metadata (signalData) entries', () => {
    const result = toModelMessages([
      { role: 'system', type: 'signal', content: '', signalData: { type: 'metadata' }, createdAt: '1' },
      { role: 'user', type: 'text', content: 'q', createdAt: '2' },
    ]);

    expect(result).toEqual([{ role: 'user', content: 'q' }]);
  });

  it('prepends a system message when provided', () => {
    const result = toModelMessages([], 'You are support.');

    expect(result[0]).toEqual({ role: 'system', content: 'You are support.' });
  });

  it('prefixes sender name when multiple distinct human senders exist', () => {
    const result = toModelMessages([
      { role: 'user', type: 'text', content: 'one', senderName: 'Alice', createdAt: '1' },
      { role: 'user', type: 'text', content: 'two', senderName: 'Bob', createdAt: '2' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'Alice: one' },
      { role: 'user', content: 'Bob: two' },
    ]);
  });
});
