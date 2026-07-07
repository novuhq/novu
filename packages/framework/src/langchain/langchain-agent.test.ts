import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from '../resources/agent/agent.runtime';
import type {
  Agent,
  AgentActionContext,
  AgentHistoryEntry,
  AgentMessageContext,
  ToolApprovalDecision,
} from '../resources/agent/agent.types';
import { agent } from './langchain-agent';
import type { LangChainInvokeResult } from './types';

function fakeRuntimeCtx(overrides: Partial<{ history: AgentHistoryEntry[] }> = {}) {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const history = overrides.history ?? [];
  const ctx = {
    [RUNTIME_CONTEXT_BRAND]: true as const,
    reply,
    history,
    emitToolResult: vi.fn(),
    emitToolApprovalRequest: vi.fn(),
    typing: { stop: vi.fn() },
    asMessageContext: () => ctx as unknown as AgentMessageContext,
  };

  return ctx as unknown as AgentRuntimeContext & { reply: ReturnType<typeof vi.fn>; history: AgentHistoryEntry[] };
}

function fakeMessageCtx(overrides: Partial<{ history: AgentHistoryEntry[] }> = {}) {
  return fakeRuntimeCtx(overrides) as unknown as AgentMessageContext & {
    reply: ReturnType<typeof vi.fn>;
    history: AgentHistoryEntry[];
  };
}

function fakeActionCtx(overrides: Partial<{ history: AgentHistoryEntry[] }> = {}) {
  return fakeRuntimeCtx(overrides) as unknown as AgentActionContext & {
    reply: ReturnType<typeof vi.fn>;
    history: AgentHistoryEntry[];
  };
}

/** A pre-invoked LangChain result (skips the agent graph, so no model is needed). */
function invokeResult(text: string): LangChainInvokeResult {
  return { messages: [new AIMessage(text)] as BaseMessage[] };
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

function approvalClick(overrides: Partial<ToolApprovalDecision> = {}): ToolApprovalDecision {
  return {
    toolCall: { id: 'tc_1', name: 'issueRefund', input: { amount: 1 } },
    approved: true,
    approvalMessage: { editedByHandler: false } as never,
    ...overrides,
  };
}

async function invokeToolApproval(
  supportAgent: Agent,
  ctx: AgentActionContext,
  decision: ToolApprovalDecision = approvalClick()
) {
  expect(supportAgent.handlers.onToolApproval).toBeTypeOf('function');

  await supportAgent.handlers.onToolApproval!(decision, ctx);
}

describe('langchain agent adapter', () => {
  describe('registration', () => {
    it('accepts a bare function as onMessage', () => {
      const supportAgent = agent('support', async () => 'hi');

      expect(supportAgent.id).toBe('support');
      expect(typeof supportAgent.handlers.onMessage).toBe('function');
    });

    it('accepts an object of handlers and passes optional handlers through', () => {
      const supportAgent = agent('support', {
        onMessage: async () => undefined,
        onAction: async () => undefined,
      });

      expect(typeof supportAgent.handlers.onMessage).toBe('function');
      expect(typeof supportAgent.handlers.onAction).toBe('function');
    });

    it('throws when onMessage is missing', () => {
      // @ts-expect-error intentionally invalid
      expect(() => agent('support', {})).toThrow(/onMessage/);
    });
  });

  describe('onMessage', () => {
    it('passes string returns through for runtime replyIfPresent', async () => {
      const supportAgent = agent('support', async () => 'hello');
      const ctx = fakeMessageCtx();

      const result = await supportAgent.handlers.onMessage({} as never, ctx);

      expect(result).toBe('hello');
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('auto-delivers pre-invoked results and returns void', async () => {
      const supportAgent = agent('support', async () => invokeResult('model reply'));
      const ctx = fakeMessageCtx();

      const result = await supportAgent.handlers.onMessage({} as never, ctx);

      expect(result).toBeUndefined();
      expect(ctx.reply).toHaveBeenCalledWith('model reply');
    });

    it('auto-delivers a bare AIMessage', async () => {
      const supportAgent = agent('support', async () => new AIMessage('done'));
      const ctx = fakeMessageCtx();

      await supportAgent.handlers.onMessage({} as never, ctx);

      expect(ctx.reply).toHaveBeenCalledWith('done');
    });
  });

  describe('onToolApproval', () => {
    it('auto-resumes via onMessage after approve (decision already in persisted history)', async () => {
      const history = approvedCycleHistory();
      const historySnapshots: AgentHistoryEntry[][] = [];

      const billingAgent = agent('billing', async (_m, ctx) => {
        historySnapshots.push([...ctx.history]);

        return invokeResult('done');
      });

      const ctx = fakeActionCtx({ history });

      await invokeToolApproval(billingAgent, ctx);

      expect(historySnapshots.at(-1)).toEqual(history);
      expect(ctx.reply).toHaveBeenCalledWith('done');
    });

    it('posts string returns from onToolApproval, then auto-resumes', async () => {
      const billingAgent = agent('billing', {
        onMessage: async () => invokeResult('done'),
        onToolApproval: async (decision) => {
          if (decision.approved) {
            return 'test123';
          }
        },
      });

      const ctx = fakeActionCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(ctx.reply).toHaveBeenCalledWith('test123');
      expect(ctx.reply).toHaveBeenCalledWith('done');
    });

    it('does not double-reply when handler returns ctx.reply() (ReplyHandle)', async () => {
      const billingAgent = agent('billing', {
        onMessage: async () => invokeResult('done'),
        onToolApproval: async (_decision, ctx) => ctx.reply('already posted'),
      });

      const ctx = fakeActionCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(2);
      expect(ctx.reply).toHaveBeenNthCalledWith(1, 'already posted');
      expect(ctx.reply).toHaveBeenNthCalledWith(2, 'done');
    });

    it('skips auto-resume when handler returns a custom result', async () => {
      const onMessage = vi.fn(async () => invokeResult('should not run'));
      const billingAgent = agent('billing', {
        onMessage,
        onToolApproval: async () => invokeResult('custom resume'),
      });

      const ctx = fakeActionCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(onMessage).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('custom resume');
    });
  });
});
