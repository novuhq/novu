import { describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeContext } from '../agent.runtime';
import { postToolApprovalCard } from './post-card';

describe('postToolApprovalCard', () => {
  it('calls reply with toolApproval payload', async () => {
    const reply = vi.fn().mockResolvedValue({ messageId: '1', platformThreadId: 't' });
    const ctx = { reply } as unknown as AgentRuntimeContext;

    await postToolApprovalCard(ctx, { id: 'tc1', name: 'search', input: { q: 'x' } }, undefined);

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: 'card' }), {
      toolApproval: expect.objectContaining({ approvalId: 'tc1', toolCallId: 'tc1', name: 'search' }),
    });
  });

  it('uses a separate approvalId when provided', async () => {
    const reply = vi.fn().mockResolvedValue({ messageId: '1', platformThreadId: 't' });
    const ctx = { reply } as unknown as AgentRuntimeContext;

    await postToolApprovalCard(ctx, { id: 'toolu_1', name: 'search', input: {} }, undefined, 'a_1');

    expect(reply).toHaveBeenCalledWith(expect.anything(), {
      toolApproval: expect.objectContaining({ approvalId: 'a_1', toolCallId: 'toolu_1' }),
    });
  });
});
