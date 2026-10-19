import { describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import { fakeReply } from '../../resources/agent/reply.fixture';
import type { AiSdkGenerateResult, AiSdkStreamResult } from '../types';
import { handleAiSdkResult, isAiSdkResult } from './index';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function fakeCtx(history: AgentHistoryEntry[] = []) {
  const { reply, sent } = fakeReply();
  const replyApprovalCard = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const typing = Object.assign(vi.fn().mockResolvedValue(undefined), {
    stop: vi.fn().mockResolvedValue(undefined),
  });

  return {
    reply,
    sent,
    replyApprovalCard,
    typing,
    history,
    emitToolResult: vi.fn(),
    emitToolApprovalRequest: vi.fn(),
  } as unknown as AgentRuntimeContext & { sent: ReturnType<typeof vi.fn> };
}

/** Content of each reply sent, with reply streams read to the end. */
function sentTexts(ctx: { sent: ReturnType<typeof vi.fn> }): unknown[] {
  return ctx.sent.mock.calls.map(([content]) => content);
}

/** `fullStream` parts: each step's text deltas, behind a `start-step`. */
async function* fullStreamOf(steps: string[][], error?: Error) {
  for (const deltas of steps) {
    yield { type: 'start-step' };
    for (const text of deltas) {
      yield { type: 'text-delta', id: 't', text };
    }
  }
  if (error) {
    yield { type: 'error', error };
  }
}

function streamTextResult(
  overrides: Record<string, unknown> = {},
  steps: string[][] = [],
  error?: Error
): AiSdkStreamResult {
  return {
    text: Promise.resolve(''),
    content: Promise.resolve([]),
    responseMessages: Promise.resolve([]),
    consumeStream: async () => {},
    fullStream: fullStreamOf(steps, error),
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

  describe('generateText results', () => {
    it('posts trimmed result.text as a single reply', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(generateTextMock({ text: ' final answer ' }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith('final answer');
    });

    it('uses result.text only — ignores responseMessages', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(
        generateTextMock({
          text: 'final only',
          responseMessages: [
            { role: 'assistant', content: 'preamble' },
            { role: 'assistant', content: 'ignored' },
          ],
        }),
        ctx,
        undefined
      );

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith('final only');
    });

    it('stops typing without replying when text is empty', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(generateTextMock({ text: '   ' }), ctx, undefined);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.typing.stop).toHaveBeenCalledOnce();
    });
  });

  describe('handleResult', () => {
    it('propagates stream errors to the caller', async () => {
      const ctx = fakeCtx();

      await expect(
        handleAiSdkResult(streamTextResult({}, [['partial']], new Error('stream failed')), ctx, undefined)
      ).rejects.toThrow('stream failed');
    });

    it('streams the reply text when the turn has no gated tools', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(streamTextResult({}, [['all ', 'done']]), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(sentTexts(ctx)).toEqual(['all done']);
      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });

    it('keeps the text streamed before a gated tool, then posts the card', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(
        streamTextResult({ content: Promise.resolve([approvalRequestContent('a_1', 'toolu_1', 'issueRefund')]) }, [
          ['I can refund that.'],
        ]),
        ctx,
        undefined
      );

      expect(sentTexts(ctx)).toEqual(['I can refund that.']);
      expect(ctx.replyApprovalCard).toHaveBeenCalledOnce();
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
      expect(sentTexts(ctx)).toEqual([]);
    });

    it('ignores automatic approval parts and delivers text', async () => {
      const ctx = fakeCtx();

      await handleAiSdkResult(
        streamTextResult(
          {
            content: Promise.resolve([
              {
                type: 'tool-approval-request',
                approvalId: 'a_auto',
                isAutomatic: true,
                toolCall: { toolCallId: 'toolu_auto', toolName: 'issueRefund', input: { amount: 50 } },
              },
            ]),
          },
          [['Refund processed.']]
        ),
        ctx,
        undefined
      );

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(sentTexts(ctx)).toEqual(['Refund processed.']);
      expect(ctx.replyApprovalCard).not.toHaveBeenCalled();
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
