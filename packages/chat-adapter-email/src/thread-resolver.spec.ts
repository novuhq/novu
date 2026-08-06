import type { StateAdapter } from 'chat';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThreadResolver } from './thread-resolver.js';
import { hashMessageId } from './utils.js';

const RECIPIENT = 'agent@inbox.test';
const ORIGIN_ID = '<novu-65f1a2b3c4d5e6f7a8b9c0d1@agentconnect.sh>';

function makeState(onGet?: (key: string) => void): StateAdapter {
  const values = new Map<string, unknown>();
  const lists = new Map<string, unknown[]>();

  return {
    get: async (key: string) => {
      onGet?.(key);

      return values.get(key) ?? null;
    },
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

    // Fresh state = expired / never-seeded TTL.
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
    const ownThread = `email:${encodeURIComponent(RECIPIENT)}:existing`;
    await resolver.trackMessage(ownThread, '<middle@mail.gmail.com>');

    const threadId = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<reply-4@mail.gmail.com>',
      references: `${ORIGIN_ID} <middle@mail.gmail.com>`,
      inReplyTo: '<middle@mail.gmail.com>',
    });

    expect(threadId).toBe(ownThread);
  });

  it('adopts a tracked ancestor whose owner differs only by address casing', async () => {
    const ownThread = `email:${encodeURIComponent('alice@example.com')}:existing`;
    await resolver.trackMessage(ownThread, '<middle@mail.gmail.com>');

    const threadId = await resolver.resolveThreadId({
      recipientAddress: 'Alice@Example.com',
      messageId: '<reply-5@mail.gmail.com>',
      inReplyTo: '<middle@mail.gmail.com>',
    });

    expect(threadId).toBe(ownThread);
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

  it('refuses to join a thread owned by another sender', async () => {
    const victimThread = `email:${encodeURIComponent('victim@example.com')}:${hashMessageId(ORIGIN_ID)}`;
    // The agent's outbound reply to the victim — its Message-ID travels in every
    // References header of that thread, so it is not a secret.
    await resolver.trackMessage(victimThread, '<agent-reply@agentconnect.sh>');

    const threadId = await resolver.resolveThreadId({
      recipientAddress: 'attacker@example.com',
      messageId: '<attack@mail.gmail.com>',
      inReplyTo: '<agent-reply@agentconnect.sh>',
    });

    expect(threadId).not.toBe(victimThread);
    expect(resolver.decodeThreadId(threadId).recipientAddress).toBe('attacker@example.com');
  });

  it('ignores a poisoned message mapping when the real recipient replies', async () => {
    // An inbound mail may declare any Message-ID, including one the agent will later
    // send to somebody else — that must not capture the real recipient's replies.
    const attackerThread = `email:${encodeURIComponent('attacker@example.com')}:deadbeef`;
    await resolver.trackMessage(attackerThread, ORIGIN_ID);

    const threadId = await resolver.resolveThreadId({
      recipientAddress: 'victim@example.com',
      messageId: '<victim-reply@mail.gmail.com>',
      inReplyTo: ORIGIN_ID,
    });

    expect(threadId).toBe(`email:${encodeURIComponent('victim@example.com')}:${hashMessageId(ORIGIN_ID)}`);
  });

  it('bounds state lookups for oversized References headers while preserving the oldest root', async () => {
    let lookupCount = 0;
    const references = Array.from({ length: 2_000 }, (_, index) => `<message-${index}@example.com>`);
    resolver.setStateAdapter(
      makeState(() => {
        lookupCount += 1;
      })
    );

    const threadId = await resolver.resolveThreadId({
      recipientAddress: RECIPIENT,
      messageId: '<oversized-references@example.com>',
      references: references.join(' '),
    });

    expect(lookupCount).toBe(100);
    expect(threadId).toBe(threadIdFor('<message-0@example.com>'));
  });
});
