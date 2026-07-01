import { describe, expect, it, vi } from 'vitest';
import type { AgentContextBase } from '../resources/agent/agent.types';
import { deliverResult, handleResult, isAiSdkResult } from './reply-mapper';
import type { AiSdkResult } from './types';

function fakeCtx() {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const typing = Object.assign(vi.fn().mockResolvedValue(undefined), {
    stop: vi.fn().mockResolvedValue(undefined),
  });
  const emitToolResult = vi.fn();

  return { reply, typing, history: [], emitToolResult } as unknown as AgentContextBase & {
    reply: ReturnType<typeof vi.fn>;
    typing: ReturnType<typeof vi.fn> & { stop: ReturnType<typeof vi.fn> };
    emitToolResult: ReturnType<typeof vi.fn>;
  };
}

describe('isAiSdkResult', () => {
  it('recognizes a streamText-style result (has textStream)', () => {
    expect(
      isAiSdkResult({
        text: Promise.resolve('hello'),
        textStream: (async function* () {})(),
      })
    ).toBe(true);
  });

  it('recognizes a generateText-style result (has text and steps)', () => {
    expect(isAiSdkResult({ text: 'hello', steps: [] })).toBe(true);
  });

  it('rejects a string, a CardElement, and void', () => {
    expect(isAiSdkResult('hello')).toBe(false);
    expect(isAiSdkResult({ type: 'card' })).toBe(false);
    expect(isAiSdkResult(undefined)).toBe(false);
  });

  it('rejects objects with text but no textStream or steps', () => {
    expect(isAiSdkResult({ text: 'hello' })).toBe(false);
  });

  it('rejects streamText-shaped objects missing text', () => {
    expect(
      isAiSdkResult({
        textStream: (async function* () {})(),
      })
    ).toBe(false);
  });
});

describe('deliverResult', () => {
  it('posts result.text as a single reply (streamText: Promise text)', async () => {
    const ctx = fakeCtx();
    const result = {
      text: Promise.resolve('final answer'),
      response: Promise.resolve({ messages: [] }),
    } as AiSdkResult;

    await deliverResult(result, ctx);

    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(ctx.reply).toHaveBeenCalledWith('final answer');
  });

  it('posts result.text only, ignoring intermediate response.messages', async () => {
    const ctx = fakeCtx();
    const result = {
      text: Promise.resolve('final only'),
      response: Promise.resolve({
        messages: [
          { role: 'assistant', content: 'preamble' },
          { role: 'assistant', content: 'ignored' },
        ],
      }),
    } as AiSdkResult;

    await deliverResult(result, ctx);

    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(ctx.reply).toHaveBeenCalledWith('final only');
  });

  it('handles a generateText-style result (plain text string)', async () => {
    const ctx = fakeCtx();
    const result = {
      text: 'answer',
      response: { messages: [] },
    } as AiSdkResult;

    await deliverResult(result, ctx);

    expect(ctx.reply).toHaveBeenCalledWith('answer');
  });

  it('clears typing when result.text is empty or whitespace', async () => {
    const ctx = fakeCtx();
    const result = {
      text: Promise.resolve('   '),
      response: Promise.resolve({ messages: [] }),
    } as AiSdkResult;

    await deliverResult(result, ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.typing.stop).toHaveBeenCalledOnce();
  });
});

describe('handleResult', () => {
  it('posts only the first approval card when a turn gates multiple tools (sequential approval)', async () => {
    const ctx = fakeCtx();
    const result = {
      text: Promise.resolve(''),
      content: Promise.resolve([
        {
          type: 'tool-approval-request',
          approvalId: 'a_1',
          toolCall: { toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 250 } },
        },
        {
          type: 'tool-approval-request',
          approvalId: 'a_2',
          toolCall: { toolCallId: 'toolu_2', toolName: 'cancelSub', input: { id: 'S9' } },
        },
      ]),
    } as unknown as AiSdkResult;

    await handleResult(result, ctx, undefined);

    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(ctx.reply).toHaveBeenCalledWith(expect.anything(), {
      toolApproval: { approvalId: 'a_1', toolCallId: 'toolu_1', name: 'issueRefund', input: { amount: 250 } },
    });
  });

  it('emits tool results from response.messages after approval-resume execution', async () => {
    const ctx = fakeCtx();
    ctx.history = [
      {
        role: 'agent',
        type: 'tool_approval_request',
        content: '',
        toolData: { approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 150 } },
        createdAt: '1',
      },
    ];

    const result = {
      text: Promise.resolve(''),
      steps: Promise.resolve([]),
      content: Promise.resolve([
        {
          type: 'tool-approval-request',
          approvalId: 'a_2',
          toolCall: { toolCallId: 'toolu_2', toolName: 'cancelSub', input: { id: 'B' } },
        },
      ]),
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
    } as unknown as AiSdkResult;

    await handleResult(result, ctx, undefined);

    expect(ctx.emitToolResult).toHaveBeenCalledWith({
      toolCallId: 'toolu_1',
      toolName: 'issueRefund',
      output: { ok: true },
      preview: 'Tool "issueRefund" result',
    });
  });
});
