import { describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeContext } from '../agent.runtime';
import { postToolApprovalCard } from './post-card';

describe('postToolApprovalCard', () => {
  it('queues tool approval metadata then posts the card', async () => {
    const emitToolApprovalRequest = vi.fn();
    const reply = vi.fn().mockResolvedValue({ messageId: '1', platformThreadId: 't' });
    const ctx = { emitToolApprovalRequest, reply } as unknown as AgentRuntimeContext;

    await postToolApprovalCard(ctx, { id: 'tc1', name: 'search', input: { q: 'x' } }, undefined);

    expect(emitToolApprovalRequest).toHaveBeenCalledWith({
      approvalId: 'tc1',
      toolCallId: 'tc1',
      name: 'search',
      input: { q: 'x' },
    });
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: 'card' }));
    expect(reply).toHaveBeenCalledOnce();
  });

  it('uses a separate approvalId when provided', async () => {
    const emitToolApprovalRequest = vi.fn();
    const reply = vi.fn().mockResolvedValue({ messageId: '1', platformThreadId: 't' });
    const ctx = { emitToolApprovalRequest, reply } as unknown as AgentRuntimeContext;

    await postToolApprovalCard(ctx, { id: 'toolu_1', name: 'search', input: {} }, undefined, 'a_1');

    expect(emitToolApprovalRequest).toHaveBeenCalledWith({
      approvalId: 'a_1',
      toolCallId: 'toolu_1',
      name: 'search',
      input: {},
    });
    expect(reply).toHaveBeenCalledOnce();
  });
});
