import { describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import type { AiSdkGenerateResult, AiSdkStreamResult } from '../types';
import { deliverResult, handleAiSdkResult, isAiSdkResult } from './index';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function fakeCtx(history: AgentHistoryEntry[] = []): AgentRuntimeContext {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const replyApprovalCard = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const typing = Object.assign(vi.fn().mockResolvedValue(undefined), {
    stop: vi.fn().mockResolvedValue(undefined),
  });
  const emitToolResult = vi.fn();
  const emitToolApprovalRequest = vi.fn();

  return {
    reply,
    replyApprovalCard,
    typing,
    history,
    emitToolResult,
    emitToolApprovalRequest,
  } as unknown as AgentRuntimeContext;
}

function streamTextResult(overrides: Record<string, unknown> = {}): AiSdkStreamResult {
  return {
    text: Promise.resolve(''),
    content: Promise.resolve([]),
    responseMessages: Promise.resolve([]),
    consumeStream: async () => {},
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

function approvalRequestContent(
  approvalId: string,
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown> = {}
) {
  return {
    type: 'tool-approval-request' as const,
    approvalId,
    toolCall: { toolCallId, toolName, input },
  };
}

function gatedToolHistory(toolCallId: string, toolName: string): AgentHistoryEntry[] {
  return [
    {
      role: 'agent',
      type: 'tool_approval_request',
      content: '',
      toolData: { approvalId: 'a_1', toolCallId, toolName, input: {} },
      createdAt: '1',
    },
  ];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('reply mapper', () => {
  describe('isAiSdkResult', () => {
    it('recognizes streamText results (consumeStream)', () => {
      expect(
        isAiSdkResult({
          text: Promise.resolve('hello'),
          textStream: (async function* () {})(),
          consumeStream: async () => {},
        })
      ).toBe(true);
    });

    it('recognizes generateText results (text + steps + usage)', () => {
      expect(isAiSdkResult({ text: 'hello', steps: [], usage: {} })).toBe(true);
    });

    it('rejects MessageContent and non-result objects', () => {
      expect(isAiSdkResult('hello')).toBe(false);
      expect(isAiSdkResult({ type: 'card' })).toBe(false);
      expect(isAiSdkResult(undefined)).toBe(false);
      expect(isAiSdkResult({ text: 'hello' })).toBe(false);
      expect(isAiSdkResult({ textStream: (async function* () {})() })).toBe(false);
    });
  });

  describe('deliverResult', () => {
    it('posts trimmed result.text as a single reply', async () => {
      const ctx = fakeCtx();

      await deliverResult(streamTextResult({ text: Promise.resolve('final answer') }), ctx);

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith('final answer');
    });

    it('uses result.text only — ignores responseMessages', async () => {
      const ctx = fakeCtx();

      await deliverResult(
        streamTextResult({
          text: Promise.resolve('final only'),
          responseMessages: Promise.resolve([
            { role: 'assistant', content: 'preamble' },
            { role: 'assistant', content: 'ignored' },
          ]),
        }),
        ctx
      );

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith('final only');
    });

    it('supports generateText-style plain string text', async () => {
      const ctx = fakeCtx();

      await deliverResult(generateTextMock({ text: 'answer' }), ctx);

      expect(ctx.reply).toHaveBeenCalledWith('answer');
    });

    it('stops typing without replying when text is empty', async () => {
      const ctx = fakeCtx();

      await deliverResult(streamTextResult({ text: Promise.resolve('   ') }), ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.typing.stop).toHaveBeenCalledOnce();
    });
  });

  describe('handleResult', () => {
    it('propagates consumeStream onError to the caller', async () => {
      const streamErr = new Error('stream failed');
      const consumeStream = vi.fn(async (opts?: { onError?: (err: unknown) => void }) => {
        opts?.onError?.(streamErr);
      });
      const ctx = fakeCtx();

      await expect(
        handleAiSdkResult(
          streamTextResult({
            consumeStream,
          }),
          ctx,
          undefined
        )
      ).rejects.toThrow('stream failed');

      expect(consumeStream).toHaveBeenCalledWith(expect.objectContaining({ onError: expect.any(Function) }));
    });

    it('delivers text when the turn has no gated tools', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(streamTextResult({ text: Promise.resolve('all done') }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith('all done');
      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });

    it('posts only the first approval card when multiple tools gate in one turn', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(
        streamTextResult({
          content: Promise.resolve([
            approvalRequestContent('a_1', 'toolu_1', 'issueRefund', { amount: 250 }),
            approvalRequestContent('a_2', 'toolu_2', 'cancelSub', { id: 'S9' }),
          ]),
        }),
        ctx,
        undefined
      );

      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledOnce();
      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'a_1',
        toolCallId: 'toolu_1',
        name: 'issueRefund',
        input: { amount: 250 },
      });
      expect(ctx.replyApprovalCard).toHaveBeenCalledOnce();
      expect(ctx.replyApprovalCard).toHaveBeenCalledWith({ type: 'tool-approval-card' });
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('ignores automatic approval parts and delivers text', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(
        streamTextResult({
          text: Promise.resolve('Refund processed.'),
          content: Promise.resolve([
            {
              type: 'tool-approval-request',
              approvalId: 'a_auto',
              isAutomatic: true,
              toolCall: { toolCallId: 'toolu_auto', toolName: 'issueRefund', input: { amount: 50 } },
            },
          ]),
        }),
        ctx,
        undefined
      );

      expect(ctx.reply).toHaveBeenCalledWith('Refund processed.');
      expect(ctx.reply).toHaveBeenCalledOnce();
    });

    it('persists gated tool results from responseMessages after approval-resume', async () => {
      // toolu_1 was gated in a prior turn; SDK places pre-step execution in responseMessages.
      const ctx = fakeCtx(gatedToolHistory('toolu_1', 'issueRefund'));

      await handleAiSdkResult(
        streamTextResult({
          content: Promise.resolve([approvalRequestContent('a_2', 'toolu_2', 'cancelSub', { id: 'B' })]),
          responseMessages: Promise.resolve([
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
          ]),
        }),
        ctx,
        undefined
      );

      expect(ctx.emitToolResult).toHaveBeenCalledWith({
        toolCallId: 'toolu_1',
        toolName: 'issueRefund',
        output: { ok: true },
        preview: 'Tool "issueRefund" result',
      });
    });

    it('unwraps text-shaped tool outputs from responseMessages', async () => {
      const ctx = fakeCtx(gatedToolHistory('toolu_01QgoZBYEGKaeAZM31DcTU59', 'issueRefund'));

      await handleAiSdkResult(
        generateTextMock({
          text: "I've successfully issued a refund of $150 for order ID a2.",
          responseMessages: [
            {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: 'toolu_01QgoZBYEGKaeAZM31DcTU59',
                  toolName: 'issueRefund',
                  output: { type: 'text', value: 'Refund of $150 issued for a2.' },
                },
              ],
            },
            {
              role: 'assistant',
              content: [{ type: 'text', text: "I've successfully issued a refund of $150 for order ID a2." }],
            },
          ],
        }),
        ctx,
        undefined
      );

      expect(ctx.emitToolResult).toHaveBeenCalledWith({
        toolCallId: 'toolu_01QgoZBYEGKaeAZM31DcTU59',
        toolName: 'issueRefund',
        output: 'Refund of $150 issued for a2.',
        preview: 'Tool "issueRefund" result',
      });
      expect(ctx.reply).toHaveBeenCalledWith("I've successfully issued a refund of $150 for order ID a2.");
    });

    it('does not persist auto-run tool results that were not approval-gated', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(
        streamTextResult({
          responseMessages: Promise.resolve([
            {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: 'toolu_auto',
                  toolName: 'lookup',
                  output: { type: 'json', value: { found: true } },
                },
              ],
            },
          ]),
        }),
        ctx,
        undefined
      );

      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });
  });
});
