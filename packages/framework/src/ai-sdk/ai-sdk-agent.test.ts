import { toCardElement } from 'chat/jsx-runtime';
import { describe, expect, it, vi } from 'vitest';
import type { AgentHistoryEntry, AgentMessageContext } from '../resources/agent/agent.types';
import { findApprovalPayloadInCard } from '../resources/agent/tool-approval/approval-card';
import { agent } from './ai-sdk-agent';
import type { AiSdkResult } from './types';

function fakeCtx() {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });

  return { reply } as unknown as AgentMessageContext & { reply: ReturnType<typeof vi.fn> };
}

describe('agent', () => {
  it('accepts a bare function as onMessage and returns an Agent with the given id', () => {
    const a = agent('support', async () => 'hi');
    expect(a.id).toBe('support');
    expect(typeof a.handlers.onMessage).toBe('function');
  });

  it('accepts an object of handlers', () => {
    const a = agent('support', {
      onMessage: async () => undefined,
      onAction: async () => undefined,
    });
    expect(typeof a.handlers.onMessage).toBe('function');
    expect(typeof a.handlers.onAction).toBe('function');
  });

  it('throws when onMessage is missing', () => {
    // @ts-expect-error intentionally invalid
    expect(() => agent('support', {})).toThrow(/onMessage/);
  });

  it('passes through string returns for runtime replyIfPresent', async () => {
    const supportAgent = agent('support', async () => 'hello');
    const ctx = fakeCtx();

    const result = await supportAgent.handlers.onMessage({} as never, ctx);

    expect(result).toBe('hello');
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('auto-delivers AI SDK results and returns void', async () => {
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
    const supportAgent = agent(
      'support',
      async () =>
        ({
          text: 'done',
          steps: [],
        }) as AiSdkResult
    );
    const ctx = fakeCtx();

    await supportAgent.handlers.onMessage({} as never, ctx);

    expect(ctx.reply).toHaveBeenCalledWith('done');
  });
});

describe('tool approval', () => {
  it('posts an approval card and skips text when onMessage returns a gated AI SDK result', async () => {
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
    const card = toCardElement((ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(card && findApprovalPayloadInCard(card)).toMatchObject({
      approvalId: 'tc_9',
      name: 'issueRefund',
      input: { amount: 300 },
    });
  });

  it('auto-resumes by re-invoking onMessage with the decision in history', async () => {
    const historyArr: AgentHistoryEntry[] = [
      {
        role: 'agent',
        type: 'card',
        content: '',
        richContent: { card: { type: 'card', children: [] } },
        createdAt: '1',
      },
    ];
    const calls: AgentHistoryEntry[][] = [];

    const billingAgent = agent('billing', async (_m, ctx) => {
      calls.push([...ctx.history]);

      return { text: Promise.resolve('done'), steps: [], content: [] };
    });

    const ctx = {
      history: historyArr,
      action: { id: 'x', sourceMessageId: 'm' },
      reply: vi.fn(async () => ({ messageId: 'm', platformThreadId: 't' })),
    };

    if (!billingAgent.handlers.onToolApproval) {
      throw new Error('expected onToolApproval handler');
    }

    await billingAgent.handlers.onToolApproval(
      {
        toolCall: { id: 'tc_1', name: 'issueRefund', input: { amount: 1 } },
        approved: true,
        approvalMessage: { editedByHandler: false } as never,
      },
      ctx as never
    );

    const lastSnapshot = calls.at(-1);
    expect(
      lastSnapshot?.some(
        (entry) =>
          entry.type === 'tool-approval-response' &&
          (entry.richContent as { approvalId?: string; approved?: boolean }).approvalId === 'tc_1' &&
          (entry.richContent as { approvalId?: string; approved?: boolean }).approved === true
      )
    ).toBe(true);
    expect(ctx.reply).toHaveBeenCalledWith('done');
  });
});
