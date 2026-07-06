import { describe, expect, it } from 'vitest';
import { buildApprovalActionId, parseApprovalActionId } from './action-id';

describe('approval action-id grammar', () => {
  it('round-trips approve and deny', () => {
    for (const verdict of ['approve', 'deny'] as const) {
      const id = buildApprovalActionId(verdict, 'tool_123');
      const parsed = parseApprovalActionId(id);

      expect(parsed).toEqual({ approved: verdict === 'approve', approvalId: 'tool_123' });
    }
  });

  it('produces a compact colon-delimited id with a known prefix (no input encoded)', () => {
    const id = buildApprovalActionId('approve', 'tool_123');
    expect(id).toBe('tool-approval:approve:tool_123');
  });

  it('preserves approvalIds that themselves contain colons', () => {
    const id = buildApprovalActionId('deny', 'a:b:c');
    expect(parseApprovalActionId(id)).toEqual({ approved: false, approvalId: 'a:b:c' });
  });

  it('fails closed on malformed ids', () => {
    for (const bad of ['', 'x:y:z', 'tool-approval:bogus:abc', 'tool-approval:approve:', 'tool-approval::id']) {
      expect(parseApprovalActionId(bad)).toBeNull();
    }
  });
});
