import { describe, expect, it } from 'vitest';
import type { ListenMessage } from '../api/listen';
import { runLevel } from './contact-guard';

const ADA: ListenMessage = {
  id: 'msg_1',
  conversationId: 'conv_1',
  channel: 'telegram',
  from: { id: 'ada', name: 'Ada', isOperator: true },
  text: 'Deploy it',
  at: '2026-11-09T10:00:00.000Z',
  round: 0,
  isDirectMessage: true,
};
const BEN: ListenMessage = { ...ADA, id: 'msg_2', from: { id: 'ben', name: 'Ben', isOperator: false } };

const CAROL: ListenMessage = {
  ...ADA,
  id: 'msg_3',
  from: { id: 'carol', name: 'Carol', isOperator: false, fullAccess: true },
};

describe('runLevel', () => {
  it('takes the operator’s own direct chat as theirs, and anything with a contact or in a group as a contact’s', () => {
    expect(runLevel([ADA])).toBe('operator');
    expect(runLevel([BEN])).toBe('contact');
    expect(runLevel([ADA, BEN])).toBe('contact');
    expect(runLevel([{ ...ADA, isDirectMessage: false }])).toBe('contact');
  });

  it('gives full access to a contact who has it, in their direct chat, as the switch is now', () => {
    expect(runLevel([CAROL])).toBe('fullAccess');
    expect(runLevel([CAROL, { ...CAROL, id: 'msg_4' }])).toBe('fullAccess');
    // Their session ran as a contact's before they got it: it goes on with full access now.
    expect(runLevel([CAROL], 'contact')).toBe('fullAccess');
    // Turned off since: a contact's run again.
    expect(runLevel([{ ...CAROL, from: { ...CAROL.from, fullAccess: false } }], 'fullAccess')).toBe('contact');
    // Never in a group, never mixed with someone else's message, and never as the operator.
    expect(runLevel([{ ...CAROL, isDirectMessage: false }])).toBe('contact');
    expect(runLevel([CAROL, BEN])).toBe('contact');
    expect(runLevel([{ ...ADA, from: { ...ADA.from, fullAccess: true } }])).toBe('operator');
  });

  it('lets answers alone go on as their session was, and as a contact’s when that isn’t known', () => {
    const answer = { ...BEN, answersMessageId: 'int_1' };

    expect(runLevel([answer], 'operator')).toBe('operator');
    expect(runLevel([answer], 'contact')).toBe('contact');
    expect(runLevel([answer])).toBe('contact');
    // An answer doesn't make the operator's own run a contact's.
    expect(runLevel([ADA, answer], 'operator')).toBe('operator');
    // A contact's session stays one.
    expect(runLevel([ADA], 'contact')).toBe('contact');
  });

  it('keeps a full-access session’s answers at full access only while they still come with it', () => {
    const answer = { ...CAROL, answersMessageId: 'int_1' };

    expect(runLevel([answer], 'fullAccess')).toBe('fullAccess');
    expect(runLevel([{ ...answer, from: { ...answer.from, fullAccess: false } }], 'fullAccess')).toBe('contact');
    expect(runLevel([{ ...BEN, answersMessageId: 'int_2' }], 'fullAccess')).toBe('contact');
  });
});
