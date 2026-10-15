import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client';
import { getConversation } from './inbox';

describe('getConversation', () => {
  it('prints the API thread as the conversation', async () => {
    const conversation = { id: 'conv_1', channel: 'telegram' };
    const get = vi.fn().mockResolvedValue({ data: { data: { thread: conversation, messages: [], hasMore: false } } });

    const view = await getConversation({ axios: { get } } as unknown as ApiClient, 'conv_1', { limit: 5 });

    expect(view).toEqual({ conversation, messages: [], hasMore: false });
    expect(get).toHaveBeenCalledWith('/v1/human/inbox/conv_1', { params: { limit: 5 } });
  });

  it('names the details block by conversation too', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        thread: { id: 'conv_1' },
        messages: [],
        hasMore: false,
        details: { threadId: 'conv_1', messageCount: 3 },
      },
    });

    const view = await getConversation({ axios: { get } } as unknown as ApiClient, 'conv_1', {});

    expect(view.details).toEqual({ conversationId: 'conv_1', messageCount: 3 });
  });
});
