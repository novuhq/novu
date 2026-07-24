import { describe, expect, it } from 'vitest';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import { toModelMessages } from './index';

// ─── Test fixtures ────────────────────────────────────────────────────────────
// Helpers build ledger rows as Novu persists them. `createdAt` controls order.

type EntryOverrides = Partial<AgentHistoryEntry> & Pick<AgentHistoryEntry, 'type' | 'role'>;

let seq = 0;
function entry(overrides: EntryOverrides): AgentHistoryEntry {
  seq += 1;

  return { content: '', createdAt: String(seq), ...overrides };
}

function userMessage(content: string): AgentHistoryEntry {
  return entry({ role: 'subscriber', type: 'message', content });
}

function agentMessage(content: string): AgentHistoryEntry {
  return entry({ role: 'agent', type: 'message', content });
}

function approvalRequest(params: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
}): AgentHistoryEntry {
  return entry({
    role: 'agent',
    type: 'tool_approval_request',
    content: 'Tool approval required',
    richContent: { card: { type: 'card' } },
    toolData: {
      approvalId: params.approvalId,
      toolCallId: params.toolCallId,
      toolName: params.toolName,
      input: params.input,
    },
  });
}

function approvalDecision(params: { approvalId: string; approved: boolean }): AgentHistoryEntry {
  return entry({
    role: 'system',
    type: 'tool_approval_decision',
    content: params.approved ? 'Approved' : 'Denied',
    toolData: { approvalId: params.approvalId, approved: params.approved },
  });
}

function toolResult(params: { toolCallId: string; toolName: string; output: unknown }): AgentHistoryEntry {
  return entry({
    role: 'system',
    type: 'tool_result',
    content: 'Tool result',
    toolData: params,
  });
}

// ─── Expected AI SDK shapes (shortcuts for assertions) ────────────────────────

function toolCall(toolCallId: string, toolName: string, input: Record<string, unknown> = {}) {
  return { type: 'tool-call' as const, toolCallId, toolName, input };
}

function toolResultPart(toolCallId: string, toolName: string, output: unknown) {
  return {
    type: 'tool-result' as const,
    toolCallId,
    toolName,
    output: { type: 'json' as const, value: output },
  };
}

function executionDenied(toolCallId: string) {
  return {
    type: 'tool-result' as const,
    toolCallId,
    toolName: 'tool',
    output: { type: 'execution-denied' as const },
  };
}

function approvalRequestPart(approvalId: string, toolCallId: string) {
  return { type: 'tool-approval-request' as const, approvalId, toolCallId };
}

function approvalResponse(approvalId: string) {
  return {
    role: 'tool' as const,
    content: [{ type: 'tool-approval-response' as const, approvalId, approved: true }],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('toModelMessages', () => {
  describe('plain messages', () => {
    it('maps roles to user/assistant and preserves order', () => {
      const result = toModelMessages([userMessage('hi'), agentMessage('hello!')]);

      expect(result).toEqual([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello!' },
      ]);
    });

    it('maps bridge subscriber role to user', () => {
      const result = toModelMessages([
        entry({ role: 'subscriber', type: 'message', content: 'hi' }),
        agentMessage('hello!'),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello!' },
      ]);
    });

    it('skips signals, edits, and empty content', () => {
      const result = toModelMessages([
        entry({ role: 'system', type: 'signal', content: 'Conversation resolved' }),
        userMessage('   '),
        userMessage('real question'),
        entry({ role: 'agent', type: 'edit', content: 'Approved' }),
      ]);

      expect(result).toEqual([{ role: 'user', content: 'real question' }]);
    });

    it('prefixes sender name when multiple humans participate', () => {
      const result = toModelMessages([
        entry({ role: 'user', type: 'message', content: 'one', senderName: 'Alice' }),
        entry({ role: 'user', type: 'message', content: 'two', senderName: 'Bob' }),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'Alice: one' },
        { role: 'user', content: 'Bob: two' },
      ]);
    });
  });

  describe('tool approval cycles', () => {
    /**
     * Each test documents:
     * 1. Ledger order (what Novu persisted)
     * 2. Expected transcript (what the AI SDK / model providers need)
     */

    it('in-flight: approved but tool not run → replay request/response so resume executes the tool', () => {
      // Ledger: user asks → card posted → user clicks Approve (no tool_result yet)
      const result = toModelMessages([
        userMessage('refund my order'),
        approvalRequest({
          approvalId: 'a_1',
          toolCallId: 'tc_1',
          toolName: 'issueRefund',
          input: { amount: 250 },
        }),
        approvalDecision({ approvalId: 'a_1', approved: true }),
      ]);

      // Transcript: model sees the pending call + approval signal → runs tool on resume
      expect(result).toEqual([
        { role: 'user', content: 'refund my order' },
        {
          role: 'assistant',
          content: [toolCall('tc_1', 'issueRefund', { amount: 250 }), approvalRequestPart('a_1', 'tc_1')],
        },
        approvalResponse('a_1'),
      ]);
    });

    it('in-flight with approval card between request and decision → card skipped, pair stays adjacent', () => {
      const result = toModelMessages([
        userMessage('test custom approval'),
        approvalRequest({
          approvalId: 'a_custom',
          toolCallId: 'toolu_custom',
          toolName: 'launchConfettiCustom',
          input: { message: 'Ship it!', intensity: 'medium' },
        }),
        agentMessage('Launch confetti?'),
        approvalDecision({ approvalId: 'a_custom', approved: true }),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'test custom approval' },
        {
          role: 'assistant',
          content: [
            toolCall('toolu_custom', 'launchConfettiCustom', { message: 'Ship it!', intensity: 'medium' }),
            approvalRequestPart('a_custom', 'toolu_custom'),
          ],
        },
        approvalResponse('a_custom'),
      ]);
    });

    it('orphaned: approved without tool_result after conversation continued → execution-denied', () => {
      // Failed resume left a decision with no tool_result, then an error notice / next user turn.
      const result = toModelMessages([
        userMessage('test custom approval'),
        approvalRequest({
          approvalId: 'a_orphan',
          toolCallId: 'toolu_orphan',
          toolName: 'launchConfettiCustom',
          input: { message: 'Ship it!' },
        }),
        agentMessage('Launch confetti?'),
        approvalDecision({ approvalId: 'a_orphan', approved: true }),
        agentMessage('*Something went wrong while processing your message. Please try again in a moment.*'),
        userMessage('ok just call confetti'),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'test custom approval' },
        {
          role: 'assistant',
          content: [toolCall('toolu_orphan', 'launchConfettiCustom', { message: 'Ship it!' })],
        },
        { role: 'tool', content: [executionDenied('toolu_orphan')] },
        {
          role: 'assistant',
          content: '*Something went wrong while processing your message. Please try again in a moment.*',
        },
        { role: 'user', content: 'ok just call confetti' },
      ]);
    });

    it('resolved: tool ran → replay as call+result pair, no approval parts', () => {
      // Ledger: request → approve → tool_result → agent reply
      const result = toModelMessages([
        userMessage('refund $50'),
        approvalRequest({ approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 50 } }),
        approvalDecision({ approvalId: 'a_1', approved: true }),
        toolResult({ toolCallId: 'toolu_1', toolName: 'issueRefund', output: { ok: true } }),
        agentMessage('Refund issued.'),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'refund $50' },
        { role: 'assistant', content: [toolCall('toolu_1', 'issueRefund', { amount: 50 })] },
        { role: 'tool', content: [toolResultPart('toolu_1', 'issueRefund', { ok: true })] },
        { role: 'assistant', content: 'Refund issued.' },
      ]);
    });

    it('denied: user rejected → replay as call + execution-denied', () => {
      const result = toModelMessages([
        userMessage('refund $50'),
        approvalRequest({ approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 50 } }),
        approvalDecision({ approvalId: 'a_1', approved: false }),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'refund $50' },
        { role: 'assistant', content: [toolCall('toolu_1', 'issueRefund', { amount: 50 })] },
        { role: 'tool', content: [executionDenied('toolu_1')] },
      ]);
    });

    it('resolved + in-flight chain: first cycle complete, second waiting to execute', () => {
      const result = toModelMessages([
        userMessage('refund order A1'),
        approvalRequest({ approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'lookupOrder', input: { id: 'A1' } }),
        approvalDecision({ approvalId: 'a_1', approved: true }),
        toolResult({ toolCallId: 'toolu_1', toolName: 'lookupOrder', output: { order: 'A1' } }),
        approvalRequest({ approvalId: 'a_2', toolCallId: 'toolu_2', toolName: 'issueRefund', input: { amount: 200 } }),
        approvalDecision({ approvalId: 'a_2', approved: true }),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'refund order A1' },
        { role: 'assistant', content: [toolCall('toolu_1', 'lookupOrder', { id: 'A1' })] },
        { role: 'tool', content: [toolResultPart('toolu_1', 'lookupOrder', { order: 'A1' })] },
        {
          role: 'assistant',
          content: [toolCall('toolu_2', 'issueRefund', { amount: 200 }), approvalRequestPart('a_2', 'toolu_2')],
        },
        approvalResponse('a_2'),
      ]);
    });

    it('resolved with interleaved onToolApproval reply: call+result stay adjacent', () => {
      // Ledger order after `return ctx.reply('…')` in onToolApproval:
      //   request → decision → side-effect reply → tool_result → final reply
      // Without pairing at request, the side-effect message would sit between call and result.
      const result = toModelMessages([
        userMessage('refund $170'),
        approvalRequest({ approvalId: 'a_1', toolCallId: 'toolu_1', toolName: 'issueRefund', input: { amount: 170 } }),
        approvalDecision({ approvalId: 'a_1', approved: true }),
        agentMessage('Tool approved test123'),
        toolResult({ toolCallId: 'toolu_1', toolName: 'issueRefund', output: { ok: true } }),
        agentMessage('Refund issued.'),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'refund $170' },
        { role: 'assistant', content: [toolCall('toolu_1', 'issueRefund', { amount: 170 })] },
        { role: 'tool', content: [toolResultPart('toolu_1', 'issueRefund', { ok: true })] },
        { role: 'assistant', content: 'Tool approved test123' },
        { role: 'assistant', content: 'Refund issued.' },
      ]);
    });

    it('multi-tool: one approved + one denied → every call paired with an outcome', () => {
      const result = toModelMessages([
        userMessage('refund 150 for order C and cancel subscription B'),
        approvalRequest({
          approvalId: 'a_refund',
          toolCallId: 'toolu_refund',
          toolName: 'issueRefund',
          input: { orderId: 'C', amount: 150 },
        }),
        approvalDecision({ approvalId: 'a_refund', approved: true }),
        toolResult({ toolCallId: 'toolu_refund', toolName: 'issueRefund', output: { ok: true } }),
        approvalRequest({
          approvalId: 'a_cancel',
          toolCallId: 'toolu_cancel',
          toolName: 'cancelSubscription',
          input: { subId: 'B' },
        }),
        approvalDecision({ approvalId: 'a_cancel', approved: false }),
      ]);

      expect(result).toEqual([
        { role: 'user', content: 'refund 150 for order C and cancel subscription B' },
        {
          role: 'assistant',
          content: [toolCall('toolu_refund', 'issueRefund', { orderId: 'C', amount: 150 })],
        },
        { role: 'tool', content: [toolResultPart('toolu_refund', 'issueRefund', { ok: true })] },
        { role: 'assistant', content: [toolCall('toolu_cancel', 'cancelSubscription', { subId: 'B' })] },
        { role: 'tool', content: [executionDenied('toolu_cancel')] },
      ]);
    });
  });
});
