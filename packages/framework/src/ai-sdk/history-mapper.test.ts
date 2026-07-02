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

  it('skips edit entries (in-place card resolution artifacts)', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'q', createdAt: '1' },
      { role: 'agent', type: 'edit', content: 'Approved', createdAt: '2' },
      { role: 'agent', type: 'message', content: 'done', createdAt: '3' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'done' },
    ]);
  });

  it('reconstructs an in-flight approved cycle as tool-call + approval-request + response (triggers execution on resume)', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund my order', createdAt: '1' },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: 'Tool approval required',
        richContent: { card: { type: 'card' } },
        toolData: { approvalId: 'tc_1', toolCallId: 'tc_1', toolName: 'issueRefund', input: { amount: 250 } },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Approved issueRefund',
        toolData: { approvalId: 'tc_1', approved: true },
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

  it('replays a resolved approved cycle as a complete tool-call + tool-result pair (no approval parts)', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund $50', createdAt: '1' },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: 'Tool approval required',
        richContent: { card: { type: 'card' } },
        toolData: { approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 50 } },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Approved issueRefund',
        toolData: { approvalId: 'a_1', approved: true },
        createdAt: '3',
      },
      {
        role: 'system',
        type: 'tool_result',
        content: 'Tool result',
        toolData: { toolCallId: 'toolu_1', toolName: 'issueRefund', output: { ok: true } },
        createdAt: '4',
      },
      { role: 'agent', type: 'message', content: 'Refund issued.', createdAt: '5' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund $50' },
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 50 } }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'toolu_1',
            toolName: 'issueRefund',
            output: { type: 'json', value: { ok: true } },
          },
        ],
      },
      { role: 'assistant', content: 'Refund issued.' },
    ]);
  });

  it('derives an execution-denied result for a denied cycle straight from the decision', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund $50', createdAt: '1' },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: 'Tool approval required',
        richContent: { card: { type: 'card' } },
        toolData: { approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 50 } },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Denied issueRefund',
        toolData: { approvalId: 'a_1', approved: false },
        createdAt: '3',
      },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund $50' },
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 50 } }],
      },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'toolu_1', toolName: 'tool', output: { type: 'execution-denied' } },
        ],
      },
    ]);
  });

  it('replays a resolved cycle as a completed pair while resuming a chained in-flight cycle', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund order A1', createdAt: '1' },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: 'Tool approval required',
        richContent: { card: { type: 'card' } },
        toolData: { approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'lookupOrder', input: { id: 'A1' } },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Approved lookupOrder',
        toolData: { approvalId: 'a_1', approved: true },
        createdAt: '3',
      },
      {
        role: 'system',
        type: 'tool_result',
        content: 'Tool result',
        toolData: { toolCallId: 'toolu_1', toolName: 'lookupOrder', output: { order: 'A1' } },
        createdAt: '4',
      },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: 'Tool approval required',
        richContent: { card: { type: 'card' } },
        toolData: { approvalId: 'a_2', toolCallId: 'toolu_2', toolName: 'issueRefund', input: { amount: 200 } },
        createdAt: '5',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Approved issueRefund',
        toolData: { approvalId: 'a_2', approved: true },
        createdAt: '6',
      },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund order A1' },
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'toolu_1', toolName: 'lookupOrder', input: { id: 'A1' } }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'toolu_1',
            toolName: 'lookupOrder',
            output: { type: 'json', value: { order: 'A1' } },
          },
        ],
      },
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

  it('pairs resolved approved cycles when onToolApproval reply is interleaved before tool_result', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund $170', createdAt: '1' },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: 'Tool approval required',
        richContent: { card: { type: 'card' } },
        toolData: { approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 170 } },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Approved issueRefund',
        toolData: { approvalId: 'a_1', approved: true },
        createdAt: '3',
      },
      { role: 'agent', type: 'message', content: 'Tool approved test123', createdAt: '4' },
      {
        role: 'system',
        type: 'tool_result',
        content: 'Tool result',
        toolData: { toolCallId: 'toolu_1', toolName: 'issueRefund', output: { ok: true } },
        createdAt: '5',
      },
      { role: 'agent', type: 'message', content: 'Refund issued.', createdAt: '6' },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund $170' },
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 170 } }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'toolu_1',
            toolName: 'issueRefund',
            output: { type: 'json', value: { ok: true } },
          },
        ],
      },
      { role: 'assistant', content: 'Tool approved test123' },
      { role: 'assistant', content: 'Refund issued.' },
    ]);
  });

  it('approve one tool + deny another (multi-tool): every tool-call is paired with a result', () => {
    const result = toModelMessages([
      { role: 'user', type: 'message', content: 'refund 150 for order C and cancel subscription B', createdAt: '1' },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: '',
        toolData: {
          approvalId: 'a_refund',
          toolCallId: 'toolu_refund',
          toolName: 'issueRefund',
          input: { orderId: 'C', amount: 150 },
        },
        createdAt: '2',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: '',
        toolData: { approvalId: 'a_refund', approved: true },
        createdAt: '3',
      },
      {
        role: 'system',
        type: 'tool_result',
        content: '',
        toolData: { toolCallId: 'toolu_refund', toolName: 'issueRefund', output: { ok: true } },
        createdAt: '4',
      },
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: '',
        toolData: {
          approvalId: 'a_cancel',
          toolCallId: 'toolu_cancel',
          toolName: 'cancelSubscription',
          input: { subId: 'B' },
        },
        createdAt: '5',
      },
      {
        role: 'system',
        type: 'tool_approval_decision',
        content: '',
        toolData: { approvalId: 'a_cancel', approved: false },
        createdAt: '6',
      },
    ]);

    expect(result).toEqual([
      { role: 'user', content: 'refund 150 for order C and cancel subscription B' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'toolu_refund',
            toolName: 'issueRefund',
            input: { orderId: 'C', amount: 150 },
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'toolu_refund',
            toolName: 'issueRefund',
            output: { type: 'json', value: { ok: true } },
          },
        ],
      },
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'toolu_cancel', toolName: 'cancelSubscription', input: { subId: 'B' } },
        ],
      },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'toolu_cancel', toolName: 'tool', output: { type: 'execution-denied' } },
        ],
      },
    ]);
  });
});
