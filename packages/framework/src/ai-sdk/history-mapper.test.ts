import { describe, expect, it } from 'vitest';
import { toModelMessages } from './history-mapper';

describe('toModelMessages', () => {
  it('maps agent role to assistant and others to user, in order', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'hi', createdAt: '1' },
      { role: 'agent', type: 'message', content: 'hello!', createdAt: '2' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello!' },
    ]);
  });

  it('maps bridge sender roles (subscriber/agent) to user/assistant', () => {
    const result = toModelMessages([
      { role: 'subscriber', type: 'message', content: 'hi', createdAt: '1' },
      { role: 'agent', type: 'message', content: 'hello!', createdAt: '2' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello!' },
    ]);
  });

  it('skips system/metadata (signalData) entries', () => {
    const result = toModelMessages([
      { role: 'system', type: 'signal', content: '', signalData: { type: 'metadata' }, createdAt: '1' },
      { role: 'user', type: 'message', content: 'q', createdAt: '2' },
    ]);

    expect(result).toEqual([{ role: 'user', content: 'q' }]);
  });

  it('skips signal-type entries and empty content', () => {
    const result = toModelMessages([
      { role: 'system', type: 'signal', content: 'Conversation resolved', createdAt: '1' },
      { role: 'user', type: 'message', content: '   ', createdAt: '2' },
      { role: 'user', type: 'message', content: 'real question', createdAt: '3' },
    ]);

    expect(result).toEqual([{ role: 'user', content: 'real question' }]);
  });

  it('prepends a system message when provided', () => {
    const result = toModelMessages([], 'You are support.');

    expect(result[0]).toEqual({ role: 'system', content: 'You are support.' });
  });

  it('prefixes sender name when multiple distinct human senders exist', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'one', senderName: 'Alice', createdAt: '1' },
      { role: 'user', type: 'message', content: 'two', senderName: 'Bob', createdAt: '2' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'Alice: one' },
      { role: 'user', content: 'Bob: two' },
    ]);
  });

  it('reconstructs tool-call + approval-request from persisted richContent.toolApproval, and the response from the signal', () => {
    const toolApproval = { approvalId: 'tc_1', toolCallId: 'tc_1', name: 'issueRefund', input: { amount: 250 } };

    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund my order', createdAt: '1' },
      {
        role: 'agent',
        type: 'card',
        content: '',
        richContent: { card: { type: 'card' }, toolApproval },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'signal',
        content: 'Approved issueRefund',
        signalData: { type: 'tool-approval-response', payload: { approvalId: 'tc_1', approved: true } },
        createdAt: '3',
      },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund my order' },
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'tc_1', toolName: 'issueRefund', input: { amount: 250 } },
          { type: 'tool-approval-request', approvalId: 'tc_1', toolCallId: 'tc_1' },
        ],
      },
      {
        role: 'tool',
        content: [{ type: 'tool-approval-response', approvalId: 'tc_1', approved: true }],
      },
    ]);
  });

  it('reconstructs an in-flight denial as an execution-denied tool-result (not a bare approval-response)', () => {
    const toolApproval = { approvalId: 'tc_9', toolCallId: 'toolu_9', name: 'issueRefund', input: { amount: 180 } };

    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund order 12', createdAt: '1' },
      {
        role: 'agent',
        type: 'card',
        content: '',
        richContent: { card: { type: 'card' }, toolApproval },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'signal',
        content: 'Denied issueRefund',
        signalData: { type: 'tool-approval-response', payload: { approvalId: 'tc_9', approved: false } },
        createdAt: '3',
      },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund order 12' },
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'toolu_9', toolName: 'issueRefund', input: { amount: 180 } },
          { type: 'tool-approval-request', approvalId: 'tc_9', toolCallId: 'toolu_9' },
        ],
      },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'toolu_9', toolName: 'issueRefund', output: { type: 'execution-denied' } },
        ],
      },
    ]);
  });

  it('collapses a resolved approval cycle to plain history once the conversation moves past it', () => {
    const toolApproval = { approvalId: 'aitxt-1', toolCallId: 'toolu_1', name: 'issueRefund', input: { amount: 50 } };

    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund $50 for order A1', createdAt: '1' },
      {
        role: 'agent',
        type: 'card',
        content: '',
        richContent: { card: { type: 'card' }, toolApproval },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'signal',
        content: 'Denied issueRefund',
        signalData: { type: 'tool-approval-response', payload: { approvalId: 'aitxt-1', approved: false } },
        createdAt: '3',
      },
      { role: 'agent', type: 'message', content: 'The refund request was denied.', createdAt: '4' },
      { role: 'user', type: 'message', content: 'ok now refund 30', createdAt: '5' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund $50 for order A1' },
      { role: 'assistant', content: 'The refund request was denied.' },
      { role: 'user', content: 'ok now refund 30' },
    ]);
  });

  it('only reconstructs the cycle being resumed when approvals are chained', () => {
    const first = { approvalId: 'a_1', toolCallId: 'toolu_1', name: 'lookupOrder', input: { id: 'A1' } };
    const second = { approvalId: 'a_2', toolCallId: 'toolu_2', name: 'issueRefund', input: { amount: 200 } };

    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund order A1', createdAt: '1' },
      {
        role: 'agent',
        type: 'card',
        content: '',
        richContent: { card: { type: 'card' }, toolApproval: first },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'signal',
        content: 'Approved lookupOrder',
        signalData: { type: 'tool-approval-response', payload: { approvalId: 'a_1', approved: true } },
        createdAt: '3',
      },
      {
        role: 'agent',
        type: 'card',
        content: '',
        richContent: { card: { type: 'card' }, toolApproval: second },
        createdAt: '4',
      },
      {
        role: 'system',
        type: 'signal',
        content: 'Approved issueRefund',
        signalData: { type: 'tool-approval-response', payload: { approvalId: 'a_2', approved: true } },
        createdAt: '5',
      },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund order A1' },
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'toolu_2', toolName: 'issueRefund', input: { amount: 200 } },
          { type: 'tool-approval-request', approvalId: 'a_2', toolCallId: 'toolu_2' },
        ],
      },
      {
        role: 'tool',
        content: [{ type: 'tool-approval-response', approvalId: 'a_2', approved: true }],
      },
    ]);
  });
});
