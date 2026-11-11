import { describe, expect, it } from 'vitest';
import { NovuWebChatAdapterImpl } from './adapter.js';
import type { WebChatAdapterConfig } from './types.js';

// 129 closing brackets is one over the Chat SDK inbound budget. The unbounded parse
// would still turn `**bold**` into a strong node; the bounded parse keeps it verbatim.
const OVER_BUDGET_MARKDOWN = `**bold** ${']'.repeat(129)}`;

describe('NovuWebChatAdapterImpl parseMessage', () => {
  it('keeps over-budget inbound markdown as one verbatim text paragraph', async () => {
    const adapter = new NovuWebChatAdapterImpl({} as WebChatAdapterConfig);
    await adapter.initialize({} as never);

    const message = adapter.parseMessage({
      id: 'msg_abcdefghijkl',
      text: OVER_BUDGET_MARKDOWN,
      subscriberId: 'sub_1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(message.text).toBe(OVER_BUDGET_MARKDOWN);
    expect(message.formatted).toEqual({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: OVER_BUDGET_MARKDOWN }] }],
    });
  });
});
