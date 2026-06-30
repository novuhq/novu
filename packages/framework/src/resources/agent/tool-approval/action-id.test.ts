import { describe, expect, it } from 'vitest';
import { type ApprovalPayload, buildApprovalActionId, parseApprovalActionId } from './action-id';

const payload: ApprovalPayload = {
  approvalId: 'tool_123',
  toolCallId: 'tool_123',
  name: 'issueRefund',
  input: { orderId: 'o_1', amount: 250 },
};

describe('approval action-id grammar', () => {
  it('round-trips approve and deny', () => {
    for (const verdict of ['approve', 'deny'] as const) {
      const id = buildApprovalActionId(verdict, payload);
      const parsed = parseApprovalActionId(id);

      expect(parsed).toEqual({ approved: verdict === 'approve', payload });
    }
  });

  it('produces a colon-delimited 3-part id with a known prefix', () => {
    const id = buildApprovalActionId('approve', payload);
    expect(id.startsWith('tool-approval:approve:')).toBe(true);
    expect(id.split(':')).toHaveLength(3);
  });

  it('fails closed on malformed ids', () => {
    for (const bad of [
      '',
      'x:y:z',
      'tool-approval:bogus:abc',
      'tool-approval:approve:',
      'tool-approval:approve:!!notb64',
    ]) {
      expect(parseApprovalActionId(bad)).toBeNull();
    }
  });
});
