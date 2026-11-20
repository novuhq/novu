import { describe, expect, it } from 'vitest';
import { type InboundEmailThread, newestInboundEmail } from './inbound-email';

const FLOOR = Date.parse('2026-10-25T12:00:00.000Z');
const BEFORE = '2026-10-25T11:00:00.000Z';
const AFTER = '2026-10-25T12:05:00.000Z';
const LATER = '2026-10-25T12:10:00.000Z';

function thread(overrides: Partial<InboundEmailThread> = {}): InboundEmailThread {
  return {
    from: 'Ada',
    fromAddress: 'ada@example.com',
    subject: 'Hello',
    preview: 'Hello there',
    lastMessage: { at: AFTER, from: 'human' },
    lastActivityAt: AFTER,
    ...overrides,
  };
}

describe('newestInboundEmail', () => {
  it('counts an email from the operator', () => {
    expect(newestInboundEmail([thread()], FLOOR)).toEqual({
      at: AFTER,
      from: 'Ada',
      subject: 'Hello',
    });
  });

  it('counts an email from anyone else', () => {
    expect(
      newestInboundEmail(
        [thread({ from: '', fromAddress: 'stranger@example.com', subject: '', preview: 'A question' })],
        FLOOR
      )
    ).toEqual({
      at: AFTER,
      from: 'stranger@example.com',
      subject: 'A question',
    });
  });

  it('leaves out email from before the agent was created', () => {
    expect(
      newestInboundEmail(
        [thread({ lastMessage: { at: BEFORE, from: 'human' }, lastActivityAt: BEFORE, subject: 'Old' })],
        FLOOR
      )
    ).toBeNull();
  });

  it('leaves out a thread whose latest message is from the agent', () => {
    expect(
      newestInboundEmail([thread({ lastMessage: { at: AFTER, from: 'agent' }, subject: 'Hi, I’m the agent' })], FLOOR)
    ).toBeNull();
  });

  it('keeps a human email that arrived before the agent’s own test email', () => {
    expect(
      newestInboundEmail(
        [
          thread({ lastMessage: { at: LATER, from: 'agent' }, lastActivityAt: LATER, subject: 'Hi, I’m the agent' }),
          thread({ from: 'Sam', fromAddress: 'sam@example.com', subject: 'Question' }),
        ],
        FLOOR
      )
    ).toEqual({ at: AFTER, from: 'Sam', subject: 'Question' });
  });

  it('keeps the newest human email', () => {
    expect(
      newestInboundEmail(
        [
          thread({ from: 'Sam', subject: 'Newer', lastMessage: { at: LATER, from: 'human' }, lastActivityAt: LATER }),
          thread({ subject: 'Older' }),
        ],
        FLOOR
      )
    ).toEqual({ at: LATER, from: 'Sam', subject: 'Newer' });
  });
});
