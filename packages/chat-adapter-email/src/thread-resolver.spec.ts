import type { StateAdapter } from 'chat';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThreadResolver } from './thread-resolver.js';
import { hashMessageId } from './utils.js';

const RECIPIENT = 'agent@inbox.test';
const ORIGIN_ID = '<novu-65f1a2b3c4d5e6f7a8b9c0d1@agentconnect.sh>';

/** In-memory stand-in for the Redis-backed adapter; a fresh one models expired/never-seeded state. */
function makeState(): StateAdapter {
  const values = new Map<string, unknown>();
  const lists = new Map<string, unknown[]>();

  return {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      values.set(key, value);
    },
    setIfNotExists: async (key: string, value: unknown) => {
      if (!values.has(key)) values.set(key, value);
    },
    appendToList: async (key: string, value: unknown) => {
      lists.set(key, [...(lists.get(key) ?? []), value]);
    },
    getList: async (key: string) => lists.get(key) ?? null,
  } as unknown as StateAdapter;
}

function threadIdFor(rootMessageId: string): string {
  return `email:${encodeURIComponent(RECIPIENT)}:${hashMessageId(rootMessageId)}`;
}

describe('ThreadResolver.resolveThreadId', () => {
  let resolver: ThreadResolver;

  beforeEach(() => {
    resolver = new ThreadResolver();
    resolver.setStateAdapter(makeState());
  });

  it('roots an unknown-parent reply at the referenced message, not at itself', async () => {
    const threadId = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<reply-1@mail.gmail.com>',
      inReplyTo: ORIGIN_ID,
    });

    expect(threadId).toBe(threadIdFor(ORIGIN_ID));
  });

  it('lands two direct replies to the same origin in one thread without seeded state', async () => {
    const first = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<reply-1@mail.gmail.com>',
      inReplyTo: ORIGIN_ID,
    });

    // A second resolver with empty state stands in for an expired 30-day TTL.
    const cold = new ThreadResolver();
    cold.setStateAdapter(makeState());
    const second = await cold.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<reply-2@mail.gmail.com>',
      inReplyTo: ORIGIN_ID,
    });

    expect(second).toBe(first);
  });

  it('roots at the oldest References entry rather than the immediate parent', async () => {
    const threadId = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<reply-3@mail.gmail.com>',
      references: `${ORIGIN_ID} <middle@mail.gmail.com>`,
      inReplyTo: '<middle@mail.gmail.com>',
    });

    expect(threadId).toBe(threadIdFor(ORIGIN_ID));
  });

  it('keeps the own-id fallback when the message references nothing', async () => {
    const threadId = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<fresh@mail.gmail.com>',
    });

    expect(threadId).toBe(threadIdFor('<fresh@mail.gmail.com>'));
  });

  it('still prefers a tracked ancestor over the derived root', async () => {
    await resolver.trackMessage('email:existing:thread', '<middle@mail.gmail.com>');

    const threadId = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<reply-4@mail.gmail.com>',
      references: `${ORIGIN_ID} <middle@mail.gmail.com>`,
      inReplyTo: '<middle@mail.gmail.com>',
    });

    expect(threadId).toBe('email:existing:thread');
  });

  it('keeps different senders on separate threads for the same origin', async () => {
    const first = await resolver.resolveThreadId({
      recipientAddress: 'alice@example.com',
      messageId: '<reply-a@mail.gmail.com>',
      inReplyTo: ORIGIN_ID,
    });
    const second = await resolver.resolveThreadId({
      recipientAddress: 'bob@example.com',
      messageId: '<reply-b@mail.gmail.com>',
      inReplyTo: ORIGIN_ID,
    });

    expect(first).not.toBe(second);
  });
});
