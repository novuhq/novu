import { describe, expect, it, vi } from 'vitest';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from '../resources/agent/agent.runtime';
import {
  type Agent,
  type AgentActionContext,
  type AgentHistoryEntry,
  type AgentMessageContext,
  type ToolApprovalDecision,
} from '../resources/agent/agent.types';
import { fakeReply } from '../resources/agent/reply.fixture';
import { agent } from './ai-sdk-agent';
import type { AiSdkGenerateResult, AiSdkStreamResult } from './types';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function fakeRuntimeCtx(overrides: Partial<{ history: AgentHistoryEntry[] }> = {}) {
  const { reply, sent } = fakeReply();
  const replyApprovalCard = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const history = overrides.history ?? [];
  const ctx = {
    [RUNTIME_CONTEXT_BRAND]: true as const,
    reply,
    sent,
    replyApprovalCard,
    history,
    emitToolResult: vi.fn(),
    emitToolApprovalRequest: vi.fn(),
    asMessageContext: () => ctx as unknown as AgentMessageContext,
  };

  return ctx as unknown as AgentRuntimeContext & {
    reply: ReturnType<typeof vi.fn>;
    sent: ReturnType<typeof vi.fn>;
    replyApprovalCard: ReturnType<typeof vi.fn>;
    history: AgentHistoryEntry[];
  };
}

function fakeMessageCtx(overrides: Partial<{ history: AgentHistoryEntry[] }> = {}) {
  return fakeRuntimeCtx(overrides) as unknown as AgentMessageContext & {
    reply: ReturnType<typeof vi.fn>;
    sent: ReturnType<typeof vi.fn>;
    replyApprovalCard: ReturnType<typeof vi.fn>;
    emitToolApprovalRequest: ReturnType<typeof vi.fn>;
    history: AgentHistoryEntry[];
  };
}

function fakeActionCtx(overrides: Partial<{ history: AgentHistoryEntry[] }> = {}) {
  return fakeRuntimeCtx(overrides) as unknown as AgentActionContext & {
    reply: ReturnType<typeof vi.fn>;
    sent: ReturnType<typeof vi.fn>;
    history: AgentHistoryEntry[];
  };
}

async function* fullStreamOf(text: string) {
  yield { type: 'start-step' };
  if (text) {
    yield { type: 'text-delta', id: 't', text };
  }
}

function streamTextMock(text = '', overrides: Record<string, unknown> = {}): AiSdkStreamResult {
  return {
    text: Promise.resolve(text),
    content: Promise.resolve([]),
    responseMessages: Promise.resolve([]),
    consumeStream: async () => {},
    fullStream: fullStreamOf(text),
    ...overrides,
  } as unknown as AiSdkStreamResult;
}

function generateTextMock(overrides: Record<string, unknown> = {}): AiSdkGenerateResult {
  return {
    text: '',
    steps: [],
    usage: {},
    content: [],
    responseMessages: [],
    ...overrides,
  } as unknown as AiSdkGenerateResult;
}

function aiSdkTextResult(text: string): AiSdkStreamResult {
  return streamTextMock(text);
}

/** Ledger snapshot after Novu persists an approval decision (before resume). */
function approvedCycleHistory(): AgentHistoryEntry[] {
  return [
    {
      role: 'agent',
      type: 'tool_approval_request',
      content: '',
      richContent: { card: { type: 'card', children: [] } },
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ai-sdk agent adapter', () => {
  describe('registration', () => {
    it('accepts a bare function as onMessage', () => {
      const supportAgent = agent('support', async () => 'hi');

      expect(supportAgent.id).toBe('support');
      expect(typeof supportAgent.handlers.onMessage).toBe('function');
    });

    it('accepts an object of handlers and passes optional handlers through', () => {
      const onError = async () => ({ suppress: true as const });
      const supportAgent = agent('support', {
        onMessage: async () => undefined,
        onAction: async () => undefined,
        onError,
      });

      expect(typeof supportAgent.handlers.onMessage).toBe('function');
      expect(typeof supportAgent.handlers.onAction).toBe('function');
      expect(supportAgent.handlers.onError).toBe(onError);
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

    it('auto-delivers streamText-style results and returns void', async () => {
      const supportAgent = agent('support', async () => streamTextMock('model reply'));
      const ctx = fakeMessageCtx();

      const result = await supportAgent.handlers.onMessage({} as never, ctx);

      expect(result).toBeUndefined();
      expect(ctx.sent).toHaveBeenCalledWith('model reply');
    });

    it('auto-delivers generateText-style results', async () => {
      const supportAgent = agent('support', async () => generateTextMock({ text: 'done' }));
      const ctx = fakeMessageCtx();

      await supportAgent.handlers.onMessage({} as never, ctx);

      expect(ctx.reply).toHaveBeenCalledWith('done');
    });

    it('posts an approval card when the model returns a gated tool (no text reply)', async () => {
      const supportAgent = agent('support', async () =>
        streamTextMock('', {
          content: Promise.resolve([
            {
              type: 'tool-approval-request',
              approvalId: 'tc_9',
              toolCall: { toolCallId: 'tc_9', toolName: 'issueRefund', input: { amount: 300 } },
            },
          ]),
        })
      );
      const ctx = fakeMessageCtx();

      await supportAgent.handlers.onMessage({} as never, ctx);

      expect(ctx.replyApprovalCard).toHaveBeenCalledTimes(1);
      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'tc_9',
        toolCallId: 'tc_9',
        name: 'issueRefund',
        input: { amount: 300 },
      });
      expect(ctx.replyApprovalCard.mock.calls[0]).toEqual([{ type: 'tool-approval-card' }]);
      expect(ctx.sent).not.toHaveBeenCalled();
    });
  });

  describe('onToolApproval', () => {
    it('auto-resumes via onMessage after approve (decision already in persisted history)', async () => {
      // Novu writes tool_approval_decision before this handler runs.
      const history = approvedCycleHistory();
      const historySnapshots: AgentHistoryEntry[][] = [];

      const billingAgent = agent('billing', async (_m, ctx) => {
        historySnapshots.push([...ctx.history]);

        return aiSdkTextResult('done');
      });

      const ctx = fakeActionCtx({ history });

      await invokeToolApproval(billingAgent, ctx);

      expect(historySnapshots.at(-1)).toEqual(history);
      expect(ctx.history).toHaveLength(2);
      expect(ctx.sent).toHaveBeenCalledWith('done');
    });

    it('posts string returns from onToolApproval, then auto-resumes', async () => {
      const billingAgent = agent('billing', {
        onMessage: async () => aiSdkTextResult('done'),
        onToolApproval: async (decision) => {
          if (decision.approved) {
            return 'test123';
          }
        },
      });

      const ctx = fakeActionCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(ctx.sent).toHaveBeenCalledWith('test123');
      expect(ctx.sent).toHaveBeenCalledWith('done');
    });

    it('does not double-reply when handler returns ctx.reply() (ReplyHandle)', async () => {
      const billingAgent = agent('billing', {
        onMessage: async () => aiSdkTextResult('done'),
        onToolApproval: async (_decision, ctx) => ctx.reply('already posted'),
      });

      const ctx = fakeActionCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(ctx.sent).toHaveBeenCalledTimes(2);
      expect(ctx.sent).toHaveBeenNthCalledWith(1, 'already posted');
      expect(ctx.sent).toHaveBeenNthCalledWith(2, 'done');
    });

    it('skips auto-resume when handler returns a custom AiSdkResult', async () => {
      const onMessage = vi.fn(async () => aiSdkTextResult('should not run'));
      const billingAgent = agent('billing', {
        onMessage,
        onToolApproval: async () => aiSdkTextResult('custom resume'),
      });

      const ctx = fakeActionCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(onMessage).not.toHaveBeenCalled();
      expect(ctx.sent).toHaveBeenCalledWith('custom resume');
    });
  });
});
