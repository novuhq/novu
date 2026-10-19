import { ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { describe, expect, it, vi } from 'vitest';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from '../resources/agent/agent.runtime';
import type { AgentHistoryEntry } from '../resources/agent/agent.types';
import {
  createApprovalMiddleware,
  executeApprovedTools,
  findToolApprovalRequired,
  isToolApprovalRequired,
  NovuToolApprovalRequired,
  postApprovalCard,
} from './tool-approval';

/** Mimics how LangChain's MiddlewareError + LangGraph's Pregel wrap a thrown middleware error. */
function wrapLikeLangGraph(inner: Error): Error {
  const middlewareError = new Error(inner.message);
  middlewareError.name = inner.name;
  (middlewareError as { cause?: unknown }).cause = inner;
  (middlewareError as { pregelTaskId?: string }).pregelTaskId = 'task-1';

  return middlewareError;
}

function fakeRuntimeCtx(history: AgentHistoryEntry[] = []) {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const replyApprovalCard = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const ctx = {
    [RUNTIME_CONTEXT_BRAND]: true as const,
    reply,
    replyApprovalCard,
    history,
    emitToolResult: vi.fn(),
    emitToolApprovalRequest: vi.fn(),
    typing: { stop: vi.fn() },
  };

  return ctx as unknown as AgentRuntimeContext & {
    reply: ReturnType<typeof vi.fn>;
    replyApprovalCard: ReturnType<typeof vi.fn>;
    emitToolResult: ReturnType<typeof vi.fn>;
    emitToolApprovalRequest: ReturnType<typeof vi.fn>;
  };
}

function fakeTool(name: string, run: (input: unknown) => unknown): StructuredToolInterface {
  return { name, invoke: async (input: unknown) => run(input) } as unknown as StructuredToolInterface;
}

function approvedCycleHistory(): AgentHistoryEntry[] {
  return [
    {
      role: 'agent',
      type: 'tool_approval_request',
      content: '',
      toolData: { approvalId: 'tc_1', toolCallId: 'tc_1', toolName: 'issueRefund', input: { amount: 300 } },
      createdAt: '1',
    },
    {
      role: 'system',
      type: 'tool_approval_decision',
      content: 'Approved issueRefund',
      toolData: { approvalId: 'tc_1', approved: true },
      createdAt: '2',
    },
  ];
}

type WrapToolCall = (request: { toolCall: { id: string; name: string; args: unknown } }, handler: unknown) => unknown;

function wrapToolCallOf(middleware: unknown): WrapToolCall {
  return (middleware as { wrapToolCall: WrapToolCall }).wrapToolCall;
}

describe('tool-approval', () => {
  describe('NovuToolApprovalRequired', () => {
    it('is detected by the guard and carries the tool call', () => {
      const error = new NovuToolApprovalRequired({ toolCallId: 'tc_1', toolName: 'issueRefund', input: { amount: 5 } });

      expect(isToolApprovalRequired(error)).toBe(true);
      expect(isToolApprovalRequired(new Error('other'))).toBe(false);
      expect(error.toolCallId).toBe('tc_1');
      expect(error.toolName).toBe('issueRefund');
      expect(error.input).toEqual({ amount: 5 });
    });
  });

  describe('findToolApprovalRequired', () => {
    it('returns the error itself when thrown directly', () => {
      const error = new NovuToolApprovalRequired({ toolCallId: 'tc_1', toolName: 'issueRefund' });

      expect(findToolApprovalRequired(error)).toBe(error);
    });

    it('unwraps the LangChain/LangGraph cause chain', () => {
      const inner = new NovuToolApprovalRequired({ toolCallId: 'tc_1', toolName: 'linear__save_comment' });
      const wrapped = wrapLikeLangGraph(inner);

      expect(wrapped).not.toBeInstanceOf(NovuToolApprovalRequired);
      expect(findToolApprovalRequired(wrapped)).toBe(inner);
      expect(isToolApprovalRequired(wrapped)).toBe(true);
    });

    it('unwraps multiple nested layers', () => {
      const inner = new NovuToolApprovalRequired({ toolCallId: 'tc_1', toolName: 'issueRefund' });

      expect(findToolApprovalRequired(wrapLikeLangGraph(wrapLikeLangGraph(inner)))).toBe(inner);
    });

    it('returns undefined for unrelated errors and cycles', () => {
      expect(findToolApprovalRequired(new Error('boom'))).toBeUndefined();
      expect(findToolApprovalRequired(undefined)).toBeUndefined();

      const cyclic = new Error('loop') as Error & { cause?: unknown };
      cyclic.cause = cyclic;
      expect(findToolApprovalRequired(cyclic)).toBeUndefined();
    });
  });

  describe('createApprovalMiddleware', () => {
    it('throws for gated tools before they run', async () => {
      const middleware = createApprovalMiddleware((call) => call.name === 'issueRefund');
      const handler = vi.fn();

      await expect(
        wrapToolCallOf(middleware)({ toolCall: { id: 'tc_1', name: 'issueRefund', args: { amount: 5 } } }, handler)
      ).rejects.toBeInstanceOf(NovuToolApprovalRequired);
      expect(handler).not.toHaveBeenCalled();
    });

    it('executes non-gated tools via the handler', async () => {
      const middleware = createApprovalMiddleware((call) => call.name === 'issueRefund');
      const output = new ToolMessage({ content: 'ok', tool_call_id: 'tc_2' });
      const handler = vi.fn().mockResolvedValue(output);

      const request = { toolCall: { id: 'tc_2', name: 'lookup', args: {} } };
      await expect(wrapToolCallOf(middleware)(request, handler)).resolves.toBe(output);
      expect(handler).toHaveBeenCalledWith(request);
    });
  });

  describe('executeApprovedTools', () => {
    it('runs approved-but-unexecuted gated tools and records the result', async () => {
      const ctx = fakeRuntimeCtx(approvedCycleHistory());
      const tool = fakeTool('issueRefund', (input) => ({ ok: true, input }));

      const results = await executeApprovedTools([tool], ctx);

      expect(results.get('tc_1')).toEqual({
        toolCallId: 'tc_1',
        toolName: 'issueRefund',
        output: { ok: true, input: { amount: 300 } },
      });
      expect(ctx.emitToolResult).toHaveBeenCalledWith({
        toolCallId: 'tc_1',
        toolName: 'issueRefund',
        output: { ok: true, input: { amount: 300 } },
        preview: 'Tool "issueRefund" result',
      });
    });

    it('returns empty when nothing is awaiting execution', async () => {
      const ctx = fakeRuntimeCtx([]);

      const results = await executeApprovedTools([fakeTool('issueRefund', () => 'x')], ctx);

      expect(results.size).toBe(0);
      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });

    it('skips approved cycles whose tool is not registered', async () => {
      const ctx = fakeRuntimeCtx(approvedCycleHistory());

      const results = await executeApprovedTools([fakeTool('somethingElse', () => 'x')], ctx);

      expect(results.size).toBe(0);
      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });

    it('does not execute denied cycles', async () => {
      const history = approvedCycleHistory();
      history[1] = {
        role: 'system',
        type: 'tool_approval_decision',
        content: 'Denied',
        toolData: { approvalId: 'tc_1', approved: false },
        createdAt: '2',
      };
      const ctx = fakeRuntimeCtx(history);

      const results = await executeApprovedTools([fakeTool('issueRefund', () => 'x')], ctx);

      expect(results.size).toBe(0);
    });
  });

  describe('postApprovalCard', () => {
    it('emits the approval request and posts the card', async () => {
      const ctx = fakeRuntimeCtx();
      const error = new NovuToolApprovalRequired({
        toolCallId: 'tc_9',
        toolName: 'issueRefund',
        input: { amount: 300 },
      });

      await postApprovalCard(ctx, error, undefined);

      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'tc_9',
        toolCallId: 'tc_9',
        name: 'issueRefund',
        input: { amount: 300 },
      });
      expect(ctx.replyApprovalCard).toHaveBeenCalledTimes(1);
      expect(ctx.reply).not.toHaveBeenCalled();
    });
  });
});
