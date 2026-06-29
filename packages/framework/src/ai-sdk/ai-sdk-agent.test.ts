import { describe, expect, it, vi } from 'vitest';
import type { AgentMessageContext } from '../resources/agent/agent.types';
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
