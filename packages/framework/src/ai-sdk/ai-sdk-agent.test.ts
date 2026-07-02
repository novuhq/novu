import { describe, expect, it, vi } from 'vitest';
import type {
  Agent,
  AgentHistoryEntry,
  AgentMessageContext,
  ToolApprovalDecision,
} from '../resources/agent/agent.types';
import { agent } from './ai-sdk-agent';
import type { AiSdkResult } from './types';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function fakeCtx(overrides: Partial<AgentMessageContext> = {}) {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });

  return { reply, history: [], ...overrides } as unknown as AgentMessageContext & {
    reply: ReturnType<typeof vi.fn>;
    history: AgentHistoryEntry[];
  };
}

function aiSdkTextResult(text: string): AiSdkResult {
  return { text: Promise.resolve(text), steps: [], content: [] };
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
  ctx: AgentMessageContext,
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
      const ctx = fakeCtx();

      const result = await supportAgent.handlers.onMessage({} as never, ctx);

      expect(result).toBe('hello');
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('auto-delivers streamText-style results and returns void', async () => {
      const supportAgent = agent('support', async () => ({
        text: Promise.resolve('model reply'),
        textStream: (async function* () {})(),
      }));
      const ctx = fakeCtx();

      const result = await supportAgent.handlers.onMessage({} as never, ctx);

      expect(result).toBeUndefined();
      expect(ctx.reply).toHaveBeenCalledWith('model reply');
    });

    it('auto-delivers generateText-style results', async () => {
      const supportAgent = agent('support', async () => ({ text: 'done', steps: [] }) as AiSdkResult);
      const ctx = fakeCtx();

      await supportAgent.handlers.onMessage({} as never, ctx);

      expect(ctx.reply).toHaveBeenCalledWith('done');
    });

    it('posts an approval card when the model returns a gated tool (no text reply)', async () => {
      const supportAgent = agent('support', async () => ({
        text: Promise.resolve(''),
        steps: [],
        content: [
          {
            type: 'tool-approval-request',
            approvalId: 'tc_9',
            toolCall: { toolCallId: 'tc_9', toolName: 'issueRefund', input: { amount: 300 } },
          },
        ],
      }));
      const ctx = fakeCtx();

      await supportAgent.handlers.onMessage({} as never, ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      // Payload is structured richContent — not encoded into the card body.
      const options = ctx.reply.mock.calls[0][1];
      expect(options?.toolApproval).toMatchObject({
        approvalId: 'tc_9',
        toolCallId: 'tc_9',
        name: 'issueRefund',
        input: { amount: 300 },
      });
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

      const ctx = fakeCtx({ history });

      await invokeToolApproval(billingAgent, ctx);

      expect(historySnapshots.at(-1)).toEqual(history);
      expect(ctx.history).toHaveLength(2);
      expect(ctx.reply).toHaveBeenCalledWith('done');
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

      const ctx = fakeCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(ctx.reply).toHaveBeenCalledWith('test123');
      expect(ctx.reply).toHaveBeenCalledWith('done');
    });

    it('does not double-reply when handler returns ctx.reply() (ReplyHandle)', async () => {
      const billingAgent = agent('billing', {
        onMessage: async () => aiSdkTextResult('done'),
        onToolApproval: async (_decision, ctx) => ctx.reply('already posted'),
      });

      const ctx = fakeCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(2);
      expect(ctx.reply).toHaveBeenNthCalledWith(1, 'already posted');
      expect(ctx.reply).toHaveBeenNthCalledWith(2, 'done');
    });

    it('skips auto-resume when handler returns a custom AiSdkResult', async () => {
      const onMessage = vi.fn(async () => aiSdkTextResult('should not run'));
      const billingAgent = agent('billing', {
        onMessage,
        onToolApproval: async () => aiSdkTextResult('custom resume'),
      });

      const ctx = fakeCtx({ history: approvedCycleHistory() });

      await invokeToolApproval(billingAgent, ctx);

      expect(onMessage).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('custom resume');
    });
  });
});
