import { describe, expect, it, vi } from 'vitest';
import type { AgentContextBase } from '../resources/agent/agent.types';
import { deliverResult, isAiSdkResult } from './reply-mapper';
import type { AiSdkResult } from './types';

function fakeCtx() {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });

  return { reply } as unknown as AgentContextBase & { reply: ReturnType<typeof vi.fn> };
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

  it('posts nothing when result.text is empty or whitespace', async () => {
    const ctx = fakeCtx();
    const result = {
      text: Promise.resolve('   '),
      response: Promise.resolve({ messages: [] }),
    } as AiSdkResult;

    await deliverResult(result, ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
  });
});
