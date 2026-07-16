import { AIMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AgentRuntimeContext, RUNTIME_CONTEXT_BRAND } from '../../resources/agent/agent.runtime';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import { NovuToolApprovalRequired } from '../tool-approval';
import type { LangChainAgentConfig } from '../types';
import { handleLangChainResult, isLangChainConfig, isLangChainInvokeResult, isLangChainResult } from './index';

const { createAgentMock, invokeMock } = vi.hoisted(() => ({ createAgentMock: vi.fn(), invokeMock: vi.fn() }));

vi.mock('langchain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('langchain')>();

  return { ...actual, createAgent: createAgentMock };
});

function fakeRuntimeCtx(history: AgentHistoryEntry[] = []) {
  const reply = vi.fn().mockResolvedValue({ messageId: 'm', platformThreadId: 'p' });
  const ctx = {
    [RUNTIME_CONTEXT_BRAND]: true as const,
    reply,
    history,
    emitToolResult: vi.fn(),
    emitToolApprovalRequest: vi.fn(),
    typing: { stop: vi.fn() },
  };

  return ctx as unknown as AgentRuntimeContext & {
    reply: ReturnType<typeof vi.fn>;
    emitToolResult: ReturnType<typeof vi.fn>;
    emitToolApprovalRequest: ReturnType<typeof vi.fn>;
    typing: { stop: ReturnType<typeof vi.fn> };
  };
}

function fakeTool(name: string, run: (input: unknown) => unknown): StructuredToolInterface {
  return { name, invoke: async (input: unknown) => run(input) } as unknown as StructuredToolInterface;
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
  invokeMock.mockReset();
  createAgentMock.mockReturnValue({ invoke: invokeMock });
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
    it('runs the agent and delivers the final assistant text', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockResolvedValue({ messages: [new AIMessage('final answer')] });

      await handleLangChainResult(config(), ctx, undefined);

      expect(createAgentMock).toHaveBeenCalledTimes(1);
      expect(ctx.reply).toHaveBeenCalledWith('final answer');
    });

    it('joins content-block arrays into a single reply', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockResolvedValue({
        messages: [
          new AIMessage({
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'text', text: 'world' },
            ],
          }),
        ],
      });

      await handleLangChainResult(config(), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith('Hello world');
    });

    it('posts an approval card (no reply text) when a gated tool pauses the run', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockRejectedValue(
        new NovuToolApprovalRequired({ toolCallId: 'tc_9', toolName: 'issueRefund', input: { amount: 300 } })
      );

      await handleLangChainResult(config({ needsApproval: () => true }), ctx, undefined);

      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'tc_9',
        toolCallId: 'tc_9',
        name: 'issueRefund',
        input: { amount: 300 },
      });
      expect(ctx.reply).toHaveBeenCalledTimes(1);
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
      invokeMock.mockRejectedValue(wrapped);

      await handleLangChainResult(config({ needsApproval: () => true }), ctx, undefined);

      expect(ctx.emitToolApprovalRequest).toHaveBeenCalledWith({
        approvalId: 'call_20QYNrm8',
        toolCallId: 'call_20QYNrm8',
        name: 'linear__save_comment',
        input: { issueId: 'NV-8208', body: 'test from agent' },
      });
      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });

    it('executes the approved tool on resume, records it, then delivers the reply', async () => {
      const ctx = fakeRuntimeCtx(approvedCycleHistory());
      const tool = fakeTool('issueRefund', () => ({ ok: true }));
      invokeMock.mockResolvedValue({ messages: [new AIMessage('Refund issued.')] });

      await handleLangChainResult(config({ tools: [tool], needsApproval: () => true }), ctx, undefined);

      expect(ctx.emitToolResult).toHaveBeenCalledWith(
        expect.objectContaining({ toolCallId: 'tc_1', toolName: 'issueRefund', output: { ok: true } })
      );
      expect(ctx.reply).toHaveBeenCalledWith('Refund issued.');
    });

    it('stops typing when the model returns no text', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockResolvedValue({ messages: [new AIMessage('')] });

      await handleLangChainResult(config(), ctx, undefined);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.typing.stop).toHaveBeenCalledTimes(1);
    });

    it('delivers the formatReply result instead of the raw text', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockResolvedValue({ messages: [new AIMessage('created it')] });
      const card = { type: 'card', children: [{ type: 'text', content: 'created it' }] } as const;

      await handleLangChainResult(config({ formatReply: () => card }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith(card);
    });

    it('falls back to the raw text when formatReply returns void', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockResolvedValue({ messages: [new AIMessage('plain answer')] });

      await handleLangChainResult(config({ formatReply: () => undefined }), ctx, undefined);

      expect(ctx.reply).toHaveBeenCalledWith('plain answer');
    });

    it('does not call formatReply when the model returns no text', async () => {
      const ctx = fakeRuntimeCtx();
      invokeMock.mockResolvedValue({ messages: [new AIMessage('')] });
      const formatReply = vi.fn();

      await handleLangChainResult(config({ formatReply }), ctx, undefined);

      expect(formatReply).not.toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.typing.stop).toHaveBeenCalledTimes(1);
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
