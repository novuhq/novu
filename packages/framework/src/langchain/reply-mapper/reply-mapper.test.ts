import { AIMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from '../../resources/agent/agent.runtime';
import type { AgentHistoryEntry, MessageContent } from '../../resources/agent/agent.types';
import { fakeReply } from '../../resources/agent/reply.fixture';
import { NovuToolApprovalRequired } from '../tool-approval';
import type { LangChainAgentConfig } from '../types';
import { handleLangChainResult, isLangChainConfig, isLangChainInvokeResult, isLangChainResult } from './index';

const { createAgentMock, streamMock } = vi.hoisted(() => ({ createAgentMock: vi.fn(), streamMock: vi.fn() }));

vi.mock('langchain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('langchain')>();

  return { ...actual, createAgent: createAgentMock };
});

function fakeRuntimeCtx(history: AgentHistoryEntry[] = [], signal: AbortSignal = new AbortController().signal) {
  const { reply, sent } = fakeReply();
  const replyApprovalCard = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const ctx = {
    [RUNTIME_CONTEXT_BRAND]: true as const,
    reply,
    sent,
    replyApprovalCard,
    history,
    signal,
    emitToolResult: vi.fn(),
    emitToolApprovalRequest: vi.fn(),
    typing: { stop: vi.fn() },
  };

  return ctx as unknown as AgentRuntimeContext & {
    reply: ReturnType<typeof vi.fn>;
    sent: ReturnType<typeof vi.fn>;
    replyApprovalCard: ReturnType<typeof vi.fn>;
    emitToolResult: ReturnType<typeof vi.fn>;
    emitToolApprovalRequest: ReturnType<typeof vi.fn>;
    typing: { stop: ReturnType<typeof vi.fn> };
  };
}

function fakeTool(name: string, run: (input: unknown) => unknown): StructuredToolInterface {
  return { name, invoke: async (input: unknown) => run(input) } as unknown as StructuredToolInterface;
}

/** `agent.stream` output for `streamMode: ['messages', 'values']`: each message as a model chunk, then the state. */
function streamOf(messages: AIMessage[], options: { node?: string; error?: Error } = {}) {
  return async function* () {
    for (const message of messages) {
      yield ['messages', [message, { langgraph_node: options.node ?? 'model_request' }]];
    }
    if (options.error) throw options.error;
    yield ['values', { messages }];
  };
}

function streams(messages: AIMessage[], options: { node?: string; error?: Error } = {}) {
  streamMock.mockImplementation(async () => streamOf(messages, options)());
}

function config(overrides: Partial<LangChainAgentConfig> = {}): LangChainAgentConfig {
  return { model: 'openai:gpt-4o', tools: [], ...overrides };
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
      content: 'Approved',
      toolData: { approvalId: 'tc_1', approved: true },
      createdAt: '2',
    },
  ];
}

beforeEach(() => {
  createAgentMock.mockReset();
  streamMock.mockReset();
  createAgentMock.mockReturnValue({ stream: streamMock });
});

describe('reply-mapper guards', () => {
  it('recognizes an agent config by its model', () => {
    expect(isLangChainConfig({ model: 'openai:gpt-4o' })).toBe(true);
    expect(isLangChainConfig({ model: { invoke: () => {} } })).toBe(true);
    expect(isLangChainConfig({ tools: [] })).toBe(false);
  });

  it('recognizes an invoke result by its messages array', () => {
    expect(isLangChainInvokeResult({ messages: [] })).toBe(true);
    expect(isLangChainInvokeResult({ messages: 'nope' })).toBe(false);
  });

  it('treats strings and cards as plain content, not results', () => {
    expect(isLangChainResult('hello')).toBe(false);
    expect(isLangChainResult({ type: 'card', children: [] })).toBe(false);
    expect(isLangChainResult(new AIMessage('hi'))).toBe(true);
    expect(isLangChainResult(config())).toBe(true);
  });
});

describe('handleLangChainResult', () => {
  describe('agent config path', () => {
    it('runs the agent and streams the model text as one reply', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'final ' }), new AIMessage({ id: 'ai_1', content: 'answer' })]);

      await handleLangChainResult(config(), ctx, undefined);

      expect(createAgentMock).toHaveBeenCalledTimes(1);
      expect(ctx.reply).toHaveBeenCalledTimes(1);
      expect(ctx.sent).toHaveBeenCalledWith('final answer');
    });

    it('joins content-block arrays into a single reply', async () => {
      const ctx = fakeRuntimeCtx();
      streams([
        new AIMessage({
          id: 'ai_1',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world' },
          ],
        }),
      ]);

      await handleLangChainResult(config(), ctx, undefined);

      expect(ctx.sent).toHaveBeenCalledWith('Hello world');
    });

    it('keeps the text streamed before a gated tool, then posts the card', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'I can refund that.' })], {
        error: new NovuToolApprovalRequired({ toolCallId: 'tc_9', toolName: 'issueRefund', input: { amount: 300 } }),
      });

      await handleLangChainResult(config({ needsApproval: () => true }), ctx, undefined);

      expect(ctx.sent).toHaveBeenCalledWith('I can refund that.');
      expect(ctx.replyApprovalCard).toHaveBeenCalledTimes(1);
      expect(ctx.reply.mock.invocationCallOrder[0]).toBeLessThan(ctx.replyApprovalCard.mock.invocationCallOrder[0]);
    });

    it('posts an approval card (no reply text) when a gated tool pauses the run', async () => {
      const ctx = fakeRuntimeCtx();
      streams([], {
        error: new NovuToolApprovalRequired({ toolCallId: 'tc_9', toolName: 'issueRefund', input: { amount: 300 } }),
      });

      await handleLangChainResult(config({ needsApproval: () => true }), ctx, undefined);

      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'tc_9',
        toolCallId: 'tc_9',
        name: 'issueRefund',
        input: { amount: 300 },
      });
      expect(ctx.replyApprovalCard).toHaveBeenCalledTimes(1);
      expect(ctx.sent).not.toHaveBeenCalled();
    });

    it('posts the card even when LangChain/LangGraph wraps the pause error in a cause chain', async () => {
      const ctx = fakeRuntimeCtx();
      const inner = new NovuToolApprovalRequired({
        toolCallId: 'call_20QYNrm8',
        toolName: 'linear__save_comment',
        input: { issueId: 'NV-8208', body: 'test from agent' },
      });
      // MiddlewareError copies name/message and nests the original under `cause`; Pregel adds pregelTaskId.
      const wrapped = new Error(inner.message);
      wrapped.name = inner.name;
      (wrapped as { cause?: unknown }).cause = inner;
      (wrapped as { pregelTaskId?: string }).pregelTaskId = 'task-1';
      streams([], { error: wrapped });

      await handleLangChainResult(config({ needsApproval: () => true }), ctx, undefined);

      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'call_20QYNrm8',
        toolCallId: 'call_20QYNrm8',
        name: 'linear__save_comment',
        input: { issueId: 'NV-8208', body: 'test from agent' },
      });
      expect(ctx.replyApprovalCard).toHaveBeenCalledTimes(1);
      expect(ctx.sent).not.toHaveBeenCalled();
    });

    it('executes the approved tool on resume, records it, then delivers the reply', async () => {
      const ctx = fakeRuntimeCtx(approvedCycleHistory());
      const tool = fakeTool('issueRefund', () => ({ ok: true }));
      streams([new AIMessage({ id: 'ai_1', content: 'Refund issued.' })]);

      await handleLangChainResult(config({ tools: [tool], needsApproval: () => true }), ctx, undefined);

      expect(ctx.emitToolResult).toHaveBeenCalledWith(
        expect.objectContaining({ toolCallId: 'tc_1', toolName: 'issueRefund', output: { ok: true } })
      );
      expect(ctx.sent).toHaveBeenCalledWith('Refund issued.');
    });

    it('sends no reply when the model returns no text', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: '' })]);

      await handleLangChainResult(config(), ctx, undefined);

      expect(ctx.sent).not.toHaveBeenCalled();
    });

    it('delivers the formatReply result instead of the raw text', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'created it' })]);
      const card: MessageContent = { type: 'card', children: [{ type: 'text', content: 'created it' }] };

      await handleLangChainResult(config({ formatReply: () => card }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith(card);
    });

    it('falls back to the raw text when formatReply returns void', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'plain answer' })]);

      await handleLangChainResult(config({ formatReply: () => undefined }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith('plain answer');
    });

    it('streams the model text followed by the replyFooter', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'Created it' })]);

      await handleLangChainResult(config({ replyFooter: () => '[Open](https://x)' }), ctx, undefined);

      expect(ctx.sent).toHaveBeenCalledWith('Created it\n\n[Open](https://x)');
    });

    it('streams only the replyFooter when the model returns no text', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: '' })]);

      await handleLangChainResult(config({ replyFooter: () => 'footer' }), ctx, undefined);

      expect(ctx.sent).toHaveBeenCalledWith('footer');
    });

    it('posts the replyFollowUp as its own message after the streamed reply', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'Updated it' })]);
      const card = { type: 'card', title: 'Review', children: [] } as unknown as MessageContent;

      await handleLangChainResult(config({ replyFollowUp: () => card }), ctx, undefined);

      expect(ctx.sent).toHaveBeenCalledWith('Updated it');
      expect(ctx.reply).toHaveBeenCalledTimes(2);
      expect(ctx.reply).toHaveBeenLastCalledWith(card);
    });

    it('posts nothing more when replyFollowUp returns undefined', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'Answered' })]);

      await handleLangChainResult(config({ replyFollowUp: () => undefined }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });

    /** Streams one chunk, aborts `source` mid-run and reports whether the run's signal followed it. */
    function abortWhileStreaming(source: AbortController) {
      const seen: { before?: boolean; after?: boolean } = {};
      const messages = [new AIMessage({ id: 'ai_1', content: 'hi' })];
      streamMock.mockImplementation(async (_input, runConfig: { signal: AbortSignal }) =>
        (async function* () {
          seen.before = runConfig.signal.aborted;
          yield ['messages', [messages[0], { langgraph_node: 'model_request' }]];
          source.abort();
          seen.after = runConfig.signal.aborted;
          yield ['values', { messages }];
        })()
      );

      return seen;
    }

    it("passes the turn's stop signal to the run, combined with the caller's own", async () => {
      const turn = new AbortController();
      const caller = new AbortController();
      const ctx = fakeRuntimeCtx([], turn.signal);
      const seen = abortWhileStreaming(turn);

      await handleLangChainResult(config({ invokeConfig: { signal: caller.signal } }), ctx, undefined);

      expect(seen).toEqual({ before: false, after: true });
    });

    it("still honours the caller's own signal", async () => {
      const caller = new AbortController();
      const ctx = fakeRuntimeCtx();
      const seen = abortWhileStreaming(caller);

      await handleLangChainResult(config({ invokeConfig: { signal: caller.signal } }), ctx, undefined);

      expect(seen).toEqual({ before: false, after: true });
    });

    it("leaves no listener on the caller's signal once the run ends", async () => {
      const caller = new AbortController();
      const addListener = vi.spyOn(caller.signal, 'addEventListener');
      const removeListener = vi.spyOn(caller.signal, 'removeEventListener');
      const agentConfig = config({ invokeConfig: { signal: caller.signal } });

      for (let turn = 0; turn < 3; turn += 1) {
        streams([new AIMessage({ id: `ai_${turn}`, content: 'hi' })]);
        await handleLangChainResult(agentConfig, fakeRuntimeCtx(), undefined);
      }

      expect(addListener).toHaveBeenCalledTimes(3);
      expect(removeListener.mock.calls).toEqual(addListener.mock.calls.map(([type, listener]) => [type, listener]));
    });

    it('adds no footer and posts no follow-up once the turn was stopped', async () => {
      const turn = new AbortController();
      const ctx = fakeRuntimeCtx([], turn.signal);
      const messages = [new AIMessage({ id: 'ai_1', content: 'Partial' })];
      streamMock.mockImplementation(async () =>
        (async function* () {
          yield ['messages', [messages[0], { langgraph_node: 'model_request' }]];
          turn.abort();
          yield ['values', { messages }];
        })()
      );
      const replyFollowUp = vi.fn((): MessageContent | undefined => 'card');

      await handleLangChainResult(config({ replyFooter: () => 'footer', replyFollowUp }), ctx, undefined);

      expect(ctx.sent).toHaveBeenCalledWith('Partial');
      expect(replyFollowUp).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });

    it('skips the replyFooter when formatReply is set', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: 'Created it' })]);

      await handleLangChainResult(
        config({ formatReply: () => undefined, replyFooter: () => 'footer' }),
        ctx,
        undefined
      );

      expect(ctx.sent).toHaveBeenCalledWith('Created it');
    });

    it('does not call formatReply when the model returns no text', async () => {
      const ctx = fakeRuntimeCtx();
      streams([new AIMessage({ id: 'ai_1', content: '' })]);
      const formatReply = vi.fn();

      await handleLangChainResult(config({ formatReply }), ctx, undefined);

      expect(formatReply).not.toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.typing.stop).toHaveBeenCalledTimes(1);
    });

    it('propagates stream failures that are not tool-approval pauses', async () => {
      const ctx = fakeRuntimeCtx();
      streams([], { error: new Error('model unavailable') });

      await expect(handleLangChainResult(config(), ctx, undefined)).rejects.toThrow('model unavailable');
    });
  });

  describe('pre-invoked result paths', () => {
    it('delivers the final assistant message of an invoke result', async () => {
      const ctx = fakeRuntimeCtx();

      await handleLangChainResult({ messages: [new AIMessage('done')] }, ctx, undefined);

      expect(createAgentMock).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('done');
    });

    it('delivers a bare AIMessage', async () => {
      const ctx = fakeRuntimeCtx();

      await handleLangChainResult(new AIMessage('hey there'), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith('hey there');
    });
  });
});
