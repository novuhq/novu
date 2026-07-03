import { describe, expect, it, vi } from 'vitest';
import type { AgentContextBase, AgentHistoryEntry } from '../../resources/agent/agent.types';
import type { AiSdkResult } from '../types';
import { deliverResult, handleResult, isAiSdkResult } from './index';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function fakeCtx(history: AgentHistoryEntry[] = []) {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const typing = Object.assign(vi.fn().mockResolvedValue(undefined), {
    stop: vi.fn().mockResolvedValue(undefined),
  });
  const emitToolResult = vi.fn();

  return { reply, typing, history, emitToolResult } as unknown as AgentContextBase & {
    reply: ReturnType<typeof vi.fn>;
    typing: ReturnType<typeof vi.fn> & { stop: ReturnType<typeof vi.fn> };
    history: AgentHistoryEntry[];
    emitToolResult: ReturnType<typeof vi.fn>;
  };
}

function streamTextResult(overrides: Partial<AiSdkResult> = {}): AiSdkResult {
  return {
    text: Promise.resolve(''),
    response: Promise.resolve({ messages: [] }),
    ...overrides,
  };
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
    it('recognizes streamText results (text + textStream)', () => {
      expect(
        isAiSdkResult({
          text: Promise.resolve('hello'),
          textStream: (async function* () {})(),
        })
      ).toBe(true);
    });

    it('recognizes generateText results (text + steps)', () => {
      expect(isAiSdkResult({ text: 'hello', steps: [] })).toBe(true);
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

    it('uses result.text only — ignores response.messages', async () => {
      const ctx = fakeCtx();

      await deliverResult(
        streamTextResult({
          text: Promise.resolve('final only'),
          response: Promise.resolve({
            messages: [
              { role: 'assistant', content: 'preamble' },
              { role: 'assistant', content: 'ignored' },
            ],
          }),
        }),
        ctx
      );

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith('final only');
    });

    it('supports generateText-style plain string text', async () => {
      const ctx = fakeCtx();

      await deliverResult({ text: 'answer', steps: [], response: { messages: [] } } as AiSdkResult, ctx);

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
    it('delivers text when the turn has no gated tools', async () => {
      const ctx = fakeCtx();

      await handleResult(streamTextResult({ text: Promise.resolve('all done') }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith('all done');
      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });

    it('posts only the first approval card when multiple tools gate in one turn', async () => {
      const ctx = fakeCtx();

      await handleResult(
        streamTextResult({
          content: Promise.resolve([
            approvalRequestContent('a_1', 'toolu_1', 'issueRefund', { amount: 250 }),
            approvalRequestContent('a_2', 'toolu_2', 'cancelSub', { id: 'S9' }),
          ]),
        }),
        ctx,
        undefined
      );

      expect(ctx.reply).toHaveBeenCalledOnce();
      expect(ctx.reply).toHaveBeenCalledWith(expect.anything(), {
        toolApproval: { approvalId: 'a_1', toolCallId: 'toolu_1', name: 'issueRefund', input: { amount: 250 } },
      });
    });

    it('persists gated tool results from response.messages after approval-resume', async () => {
      // toolu_1 was gated in a prior turn; this resume execution lands in response.messages.
      const ctx = fakeCtx(gatedToolHistory('toolu_1', 'issueRefund'));

      await handleResult(
        streamTextResult({
          content: Promise.resolve([approvalRequestContent('a_2', 'toolu_2', 'cancelSub', { id: 'B' })]),
          response: Promise.resolve({
            messages: [
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
            ],
          }),
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

    it('does not persist auto-run tool results that were not approval-gated', async () => {
      const ctx = fakeCtx();

      await handleResult(
        streamTextResult({
          steps: Promise.resolve([
            {
              toolResults: [{ toolCallId: 'toolu_auto', toolName: 'lookup', output: { found: true } }],
            },
          ] as never),
        }),
        ctx,
        undefined
      );

      expect(ctx.emitToolResult).not.toHaveBeenCalled();
    });
  });
});
