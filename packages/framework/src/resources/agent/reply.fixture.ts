import { type Mock, vi } from 'vitest';
import { isReplyStream } from './agent.types';

/** A `ctx.reply` that reads reply streams to the end and records each non-empty reply in `sent`. */
export function fakeReply(): {
  reply: Mock<(content: unknown) => Promise<{ messageId: string; platformThreadId: string }>>;
  sent: Mock;
} {
  const sent = vi.fn();
  const reply = vi.fn(async (content: unknown) => {
    let sentContent = content;
    if (isReplyStream(content)) {
      sentContent = '';
      for await (const delta of content) {
        sentContent += delta;
      }
    }
    if (sentContent !== '') sent(sentContent);

    return { messageId: 'm', platformThreadId: 'p' };
  });

  return { reply, sent };
}
