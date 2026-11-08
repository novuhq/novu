import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEvent,
  type AgentEventEnvelope,
  type AgentMessageContent,
} from '@novu/agent-event-protocol';
import { describe, expect, it } from 'vitest';
import { type AgentMessage, createInitialAgentConversationState } from './agent-message.types';
import { appendUserMessage, applyEnvelope, applyEnvelopes } from './apply-envelope';

const BASE_IDS = {
  conversationId: 'conv-1',
  agentId: 'agent-1',
  runId: 'run-1',
  turnId: 'turn-1',
} as const;

function envelope(
  sequence: number,
  event: AgentEvent,
  overrides: Partial<{ conversationId: string; agentId: string; runId: string; turnId: string }> = {}
): AgentEventEnvelope {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    sequence,
    timestamp: `2026-07-28T12:00:${String(sequence).padStart(2, '0')}.000Z`,
    ...BASE_IDS,
    ...overrides,
    event,
  };
}

function assistantMessages(messages: AgentMessage[]): AgentMessage[] {
  return messages.filter((message) => message.role === 'assistant');
}

describe('applyEnvelope', () => {
  it('appends custom data parts onto the active assistant message', () => {
    const afterRun = applyEnvelope(createInitialAgentConversationState(), envelope(1, { type: 'run-start' }));
    const afterFirst = applyEnvelope(
      afterRun,
      envelope(2, { type: 'custom', name: 'order-progress', data: { pct: 40 } })
    );
    const afterSecond = applyEnvelope(
      afterFirst,
      envelope(3, { type: 'custom', name: 'order-progress', data: { pct: 70 } })
    );

    expect(afterSecond.lastSequence).toBe(3);
    const assistant = assistantMessages(afterSecond.messages)[0];
    expect(assistant?.id).toBe('run-1');
    expect(assistant?.parts).toEqual([
      { type: 'data', name: 'order-progress', data: { pct: 40 } },
      { type: 'data', name: 'order-progress', data: { pct: 70 } },
    ]);
    expect(assistant?.parts.filter((part) => part.type === 'data' && part.name === 'order-progress').at(-1)).toEqual({
      type: 'data',
      name: 'order-progress',
      data: { pct: 70 },
    });
  });

  it('hangs custom data on the in-flight assistant message, not a new one', () => {
    const next = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'custom', name: 'order-progress', data: { pct: 70 } }),
    ]);

    expect(assistantMessages(next.messages)).toHaveLength(1);
    expect(next.messages[0]?.id).toBe('m1');
    expect(next.messages[0]?.parts).toEqual([
      { type: 'text', text: '', state: 'streaming' },
      { type: 'data', name: 'order-progress', data: { pct: 70 } },
    ]);
  });

  it('yields the same data parts for live custom envelopes and history catch-up', () => {
    const live = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'message', role: 'assistant', messageId: 'm1', content: { markdown: 'Working' } }),
      envelope(4, { type: 'custom', name: 'order-progress', data: { pct: 70 } }),
      envelope(5, { type: 'run-finish', outcome: 'completed' }),
    ]);
    const history = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message', role: 'assistant', messageId: 'm1', content: { markdown: 'Working' } }),
      envelope(3, { type: 'custom', name: 'order-progress', data: { pct: 70 } }),
      envelope(4, { type: 'run-finish', outcome: 'completed' }),
    ]);

    expect(assistantMessages(live.messages)[0]?.parts).toEqual(assistantMessages(history.messages)[0]?.parts);
    expect(assistantMessages(history.messages)[0]?.parts).toEqual([
      { type: 'text', text: 'Working', state: 'done' },
      { type: 'data', name: 'order-progress', data: { pct: 70 } },
    ]);
  });

  it('no-ops provider-event in transcript', () => {
    const initial = createInitialAgentConversationState();
    const next = applyEnvelope(
      initial,
      envelope(1, {
        type: 'provider-event',
        provider: 'anthropic',
        event: 'content_block_delta',
        data: { index: 0 },
      })
    );

    expect(next).toEqual({ ...initial, lastSequence: 1 });
  });

  it('replaces in-flight message deltas when a durable message arrives', () => {
    const live = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'message-delta', messageId: 'm1', delta: 'Hel' }),
      envelope(4, { type: 'message-delta', messageId: 'm1', delta: 'lo' }),
      envelope(5, { type: 'message', role: 'assistant', messageId: 'm1', content: { markdown: 'Hello' } }),
      envelope(6, { type: 'run-finish', outcome: 'completed' }),
    ]);

    const history = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message', role: 'assistant', messageId: 'm1', content: { markdown: 'Hello' } }),
      envelope(3, { type: 'run-finish', outcome: 'completed' }),
    ]);

    expect(assistantMessages(live.messages)).toEqual(assistantMessages(history.messages));
    expect(assistantMessages(live.messages)[0]?.parts).toEqual([{ type: 'text', text: 'Hello', state: 'done' }]);
  });

  it('yields identical AgentMessage[] for live streaming vs rehydrated non-delta events', () => {
    const liveEnvelopes: AgentEventEnvelope[] = [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'message-delta', messageId: 'm1', delta: 'Checking' }),
      envelope(4, { type: 'thinking-start', thinkingId: 't1' }),
      envelope(5, { type: 'thinking-delta', thinkingId: 't1', delta: 'Looking up order' }),
      envelope(6, { type: 'thinking-end', thinkingId: 't1' }),
      envelope(7, { type: 'tool-use-start', toolUseId: 'tu1', toolName: 'getOrder' }),
      envelope(8, { type: 'tool-use-delta', toolUseId: 'tu1', delta: '{"orderId":' }),
      envelope(9, { type: 'tool-use-delta', toolUseId: 'tu1', delta: '"123"}' }),
      envelope(10, {
        type: 'tool-use-done',
        toolUseId: 'tu1',
        toolName: 'getOrder',
        input: { orderId: '123' },
      }),
      envelope(11, {
        type: 'tool-use-result',
        toolUseId: 'tu1',
        content: [{ type: 'text', text: 'Ships Friday' }],
      }),
      envelope(12, { type: 'message-delta', messageId: 'm1', delta: ' your order' }),
      envelope(13, {
        type: 'message',
        role: 'assistant',
        messageId: 'm1',
        content: { markdown: 'Checking your order' },
      }),
      envelope(14, {
        type: 'message',
        role: 'assistant',
        messageId: 'm1',
        content: { markdown: 'It ships Friday' },
      }),
      envelope(15, { type: 'run-finish', outcome: 'completed' }),
    ];

    const historyEnvelopes: AgentEventEnvelope[] = [
      envelope(1, { type: 'run-start' }),
      envelope(2, {
        type: 'message',
        role: 'assistant',
        messageId: 'm1',
        content: { markdown: 'Checking your order' },
      }),
      envelope(3, { type: 'thinking-start', thinkingId: 't1' }),
      envelope(4, { type: 'thinking-delta', thinkingId: 't1', delta: 'Looking up order' }),
      envelope(5, { type: 'thinking-end', thinkingId: 't1' }),
      envelope(6, { type: 'tool-use-start', toolUseId: 'tu1', toolName: 'getOrder' }),
      envelope(7, {
        type: 'tool-use-done',
        toolUseId: 'tu1',
        toolName: 'getOrder',
        input: { orderId: '123' },
      }),
      envelope(8, {
        type: 'tool-use-result',
        toolUseId: 'tu1',
        content: [{ type: 'text', text: 'Ships Friday' }],
      }),
      envelope(9, {
        type: 'message',
        role: 'assistant',
        messageId: 'm1',
        content: { markdown: 'It ships Friday' },
      }),
      envelope(10, { type: 'run-finish', outcome: 'completed' }),
    ];

    const live = applyEnvelopes(createInitialAgentConversationState(), liveEnvelopes);
    const history = applyEnvelopes(createInitialAgentConversationState(), historyEnvelopes);

    expect(live.isRunning).toBe(false);
    expect(history.isRunning).toBe(false);
    expect(assistantMessages(live.messages)).toEqual(assistantMessages(history.messages));
  });

  it('tracks run lifecycle on conversation state', () => {
    const running = applyEnvelope(createInitialAgentConversationState(), envelope(1, { type: 'run-start' }));
    expect(running.isRunning).toBe(true);

    const finished = applyEnvelope(running, envelope(2, { type: 'run-finish', outcome: 'completed' }));
    expect(finished.isRunning).toBe(false);
    expect(finished.activeAssistantMessageId).toBeUndefined();
  });

  describe('aborted run-finish', () => {
    const partialRun = [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'message-delta', messageId: 'm1', delta: 'Working on' }),
    ];

    it('flags the live assistant message as stopped and closes its streaming text', () => {
      const live = applyEnvelopes(createInitialAgentConversationState(), [
        ...partialRun,
        envelope(4, { type: 'run-finish', outcome: 'aborted' }),
      ]);

      expect(live.isRunning).toBe(false);
      expect(live.activeAssistantMessageId).toBeUndefined();
      expect(live.messages[0]).toMatchObject({
        id: 'm1',
        stopped: true,
        parts: [{ type: 'text', text: 'Working on', state: 'done' }],
      });
    });

    it('flags the same message when the run replays from history', () => {
      const replay = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, {
          type: 'message',
          role: 'assistant',
          messageId: 'm1',
          content: { markdown: 'Working on' },
        }),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
      ]);

      expect(assistantMessages(replay.messages)).toHaveLength(1);
      expect(replay.messages[0]).toMatchObject({
        id: 'm1',
        stopped: true,
        parts: [{ type: 'text', text: 'Working on', state: 'done' }],
      });
    });

    it('flags only the last assistant message of the stopped run', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'message', role: 'user', messageId: 'u1', content: { markdown: 'first' } }),
        envelope(2, { type: 'run-start' }),
        envelope(3, { type: 'message', role: 'assistant', messageId: 'a1', content: { markdown: 'done' } }),
        envelope(4, { type: 'run-finish', outcome: 'completed' }),
        envelope(5, { type: 'message', role: 'user', messageId: 'u2', content: { markdown: 'second' } }),
        envelope(6, { type: 'run-start' }, { runId: 'run-2' }),
        envelope(7, { type: 'message-start', messageId: 'a2' }, { runId: 'run-2' }),
        envelope(8, { type: 'run-finish', outcome: 'aborted' }, { runId: 'run-2' }),
      ]);

      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['u1', undefined],
        ['a1', undefined],
        ['u2', undefined],
        ['a2', true],
      ]);
    });

    it('adds an empty stopped message when the stopped run never produced one, without flagging earlier ones', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'message', role: 'assistant', messageId: 'a1', content: { markdown: 'earlier' } }),
        envelope(2, { type: 'run-finish', outcome: 'completed' }),
        envelope(3, { type: 'run-start' }, { runId: 'run-2' }),
        envelope(4, { type: 'run-finish', outcome: 'aborted' }, { runId: 'run-2' }),
      ]);

      expect(state.isRunning).toBe(false);
      expect(state.activeAssistantMessageId).toBeUndefined();
      expect(state.messages.map((message) => [message.id, message.role, message.stopped])).toEqual([
        ['a1', 'assistant', undefined],
        ['run-2_stopped', 'assistant', true],
      ]);
      expect(state.messages[1]?.parts).toEqual([]);
    });

    it('leaves completed and paused runs unflagged', () => {
      for (const outcome of ['completed', 'paused'] as const) {
        const state = applyEnvelopes(createInitialAgentConversationState(), [
          ...partialRun,
          envelope(4, { type: 'run-finish', outcome }),
        ]);

        expect(state.messages[0]?.stopped).toBeUndefined();
      }
    });
  });

  describe('partial reply of a stopped run', () => {
    const assistantText = (id: string, text: string) =>
      ({ type: 'message', role: 'assistant', messageId: id, content: { markdown: text } }) as const;

    it('closes the preview for good: live text published after the aborted finish does not reopen it', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, { type: 'message-start', messageId: 'act_1' }),
        envelope(3, { type: 'message-delta', messageId: 'act_1', delta: 'Below is a ' }),
        envelope(4, { type: 'run-finish', outcome: 'aborted' }),
        // The live reader notices the stop up to half a second later, so the preview keeps streaming.
        envelope(5, { type: 'message-delta', messageId: 'act_1', delta: 'comprehensive' }),
        envelope(6, { type: 'message-delta', messageId: 'act_1', delta: ' guide' }),
        envelope(7, assistantText('act_1', 'Below is a comprehensive guide')),
      ]);

      expect(assistantMessages(state.messages)).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        id: 'act_1',
        stopped: true,
        status: 'sent',
        parts: [{ type: 'text', text: 'Below is a comprehensive guide', state: 'done' }],
      });
      expect(state.lastSequence).toBe(7);
      expect(state.activeAssistantMessageId).toBeUndefined();
    });

    it('keeps the streamed text when the saved message never arrives', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, { type: 'message-start', messageId: 'act_1' }),
        envelope(3, { type: 'message-delta', messageId: 'act_1', delta: 'Half a reply' }),
        envelope(4, { type: 'run-finish', outcome: 'aborted' }),
        envelope(5, { type: 'message-delta', messageId: 'act_1', delta: ' and a bit more' }),
      ]);

      expect(state.messages[0]).toMatchObject({
        stopped: true,
        parts: [{ type: 'text', text: 'Half a reply', state: 'done' }],
      });
    });

    it('moves the stop mark onto a preview that opens after the aborted finish', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', "I'll add the steps")),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
        envelope(4, { type: 'message-start', messageId: 'act_2' }),
        envelope(5, { type: 'message-delta', messageId: 'act_2', delta: 'Done — I added' }),
        envelope(6, assistantText('act_2', 'Done — I added six steps')),
      ]);

      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['act_1', undefined],
        ['act_2', true],
      ]);
      expect(state.messages[1]?.parts).toEqual([{ type: 'text', text: 'Done — I added six steps', state: 'done' }]);
      expect(state.activeAssistantMessageId).toBeUndefined();
    });

    it('streams a preview that opens after the aborted finish until its saved message lands', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', "I'll add the steps")),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
        envelope(4, { type: 'message-start', messageId: 'act_2' }),
        envelope(5, { type: 'message-delta', messageId: 'act_2', delta: 'Done — ' }),
        envelope(6, { type: 'message-delta', messageId: 'act_2', delta: 'I added' }),
      ]);

      expect(state.messages[1]).toMatchObject({
        id: 'act_2',
        stopped: true,
        parts: [{ type: 'text', text: 'Done — I added', state: 'streaming' }],
      });
    });

    it('puts the stop mark on the saved partial reply when the timeline replays from history', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', "I'll add the steps")),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
        envelope(4, assistantText('act_2', 'Done — I added six steps')),
      ]);

      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['act_1', undefined],
        ['act_2', true],
      ]);
    });

    it('drops the empty placeholder of a run stopped before its reply reached the timeline', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, { type: 'run-finish', outcome: 'aborted' }),
        envelope(3, assistantText('act_1', 'Partial reply')),
      ]);

      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([['act_1', true]]);
    });

    it('does not hand the mark to a message of the next run', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', 'Partial reply')),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
        envelope(4, { type: 'run-start' }, { runId: 'run-2' }),
        envelope(5, assistantText('act_2', 'Reacting to the stop'), { runId: 'run-2' }),
        envelope(6, { type: 'run-finish', outcome: 'completed' }, { runId: 'run-2' }),
      ]);

      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['act_1', true],
        ['act_2', undefined],
      ]);
    });

    it('does not hand the mark to a card or to a reply that follows a user message', () => {
      const afterStop = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', 'Partial reply')),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
      ]);
      const withCard = applyEnvelope(
        afterStop,
        envelope(4, {
          type: 'message',
          role: 'assistant',
          messageId: 'card_1',
          content: { card: { type: 'card', children: [] } },
        })
      );
      const withUser = applyEnvelope(
        withCard,
        envelope(5, { type: 'message', role: 'user', messageId: 'u2', content: { markdown: 'again' } })
      );
      const withReply = applyEnvelope(withUser, envelope(6, assistantText('act_2', 'Sure')));

      expect(withReply.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['act_1', true],
        ['card_1', undefined],
        ['u2', undefined],
        ['act_2', undefined],
      ]);
    });

    it('does not hand the mark to the reply of a turn the client started after the stop', () => {
      const afterStop = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', 'Partial reply')),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
      ]);
      // A card click starts a turn without a user message, and its live reply can land before its run-start.
      const state = applyEnvelopes({ ...afterStop, hasActedSinceStop: true }, [
        envelope(4, { type: 'message-start', messageId: 'act_2' }),
        envelope(5, { type: 'message-delta', messageId: 'act_2', delta: 'Kept your changes' }),
        envelope(6, { type: 'run-start' }, { runId: 'run-2' }),
      ]);

      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['act_1', true],
        ['act_2', undefined],
      ]);
      expect(state.messages[1]?.parts).toEqual([{ type: 'text', text: 'Kept your changes', state: 'streaming' }]);
    });

    it('lets the late reply of a later stop take the mark after the client acted', () => {
      const state = applyEnvelopes({ ...createInitialAgentConversationState(), hasActedSinceStop: true }, [
        envelope(1, { type: 'run-start' }, { runId: 'run-2' }),
        envelope(2, assistantText('act_1', "I'll add the steps"), { runId: 'run-2' }),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }, { runId: 'run-2' }),
        envelope(4, assistantText('act_2', 'Done — I added six steps')),
      ]);

      expect(state.hasActedSinceStop).toBe(false);
      expect(state.messages.map((message) => [message.id, message.stopped])).toEqual([
        ['act_1', undefined],
        ['act_2', true],
      ]);
    });

    it('does not let the next run write onto the stopped reply', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }),
        envelope(2, assistantText('act_1', "I'll add the steps")),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }),
        envelope(4, assistantText('act_2', 'Partial reply')),
        envelope(5, { type: 'run-start' }, { runId: 'run-2' }),
        envelope(6, { type: 'custom', name: 'progress', data: { pct: 10 } }, { runId: 'run-2' }),
      ]);

      expect(state.messages.map((message) => message.id)).toEqual(['act_1', 'act_2', 'run-2']);
      expect(state.messages[1]?.parts).toEqual([{ type: 'text', text: 'Partial reply', state: 'done' }]);
    });
  });

  describe('overlapping runs', () => {
    // `onAbort`'s run can still be posting its card when the turn after the stop starts.
    const overlapping = [
      envelope(1, { type: 'run-start' }, { runId: 'run-abort' }),
      envelope(2, { type: 'run-start' }, { runId: 'run-next' }),
      envelope(3, { type: 'message-start', messageId: 'act_next' }),
      envelope(4, { type: 'message-delta', messageId: 'act_next', delta: 'Adding ' }),
      envelope(5, { type: 'run-finish', outcome: 'completed' }, { runId: 'run-abort' }),
      envelope(6, { type: 'message-delta', messageId: 'act_next', delta: 'the step' }),
    ];

    it('keeps running while a later run is still open, and its reply keeps streaming', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), overlapping);

      expect(state.isRunning).toBe(true);
      expect(state.activeAssistantMessageId).toBe('act_next');
      expect(state.messages[0]?.parts).toEqual([{ type: 'text', text: 'Adding the step', state: 'streaming' }]);
    });

    it('settles once the last open run ends', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        ...overlapping,
        envelope(7, { type: 'run-finish', outcome: 'completed' }, { runId: 'run-next' }),
      ]);

      expect(state.isRunning).toBe(false);
      expect(state.activeAssistantMessageId).toBeUndefined();
      expect(state.messages[0]?.parts).toEqual([{ type: 'text', text: 'Adding the step', state: 'done' }]);
    });

    it('keeps running when an earlier run errors while a later one is open', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }, { runId: 'run-abort' }),
        envelope(2, { type: 'run-start' }, { runId: 'run-next' }),
        envelope(3, { type: 'run-error', message: 'boom', code: 'E' }, { runId: 'run-abort' }),
      ]);

      expect(state.isRunning).toBe(true);
      expect(state.error).toEqual({ message: 'boom', code: 'E' });
    });

    it('marks a turn stopped before its run started while an earlier run stays open', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }, { runId: 'run-abort' }),
        envelope(2, { type: 'message-start', messageId: 'act_card' }, { runId: 'run-abort' }),
        envelope(3, { type: 'run-finish', outcome: 'aborted' }, { runId: 'stopped_turn-2' }),
      ]);

      expect(state.isRunning).toBe(true);
      expect(state.openRunIds).toEqual(['run-abort']);
      expect(state.activeAssistantMessageId).toBe('act_card');
      expect(state.messages.map((message) => [message.id, message.stopped ?? false])).toEqual([
        ['act_card', false],
        ['stopped_turn-2_stopped', true],
      ]);
    });

    it('closes a run that never reported its end once a later run ends', () => {
      const state = applyEnvelopes(createInitialAgentConversationState(), [
        envelope(1, { type: 'run-start' }, { runId: 'run-lost' }),
        envelope(2, { type: 'run-start' }, { runId: 'run-2' }),
        envelope(3, { type: 'run-finish', outcome: 'completed' }, { runId: 'run-2' }),
      ]);

      expect(state.isRunning).toBe(false);
      expect(state.openRunIds).toEqual([]);
    });
  });

  it('does not reopen a closed text part for a delta that follows a completed run', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'message-delta', messageId: 'm1', delta: 'Hello' }),
      envelope(4, { type: 'run-finish', outcome: 'completed' }),
      envelope(5, { type: 'message-delta', messageId: 'm1', delta: ' world' }),
    ]);

    expect(state.messages[0]?.parts).toEqual([{ type: 'text', text: 'Hello', state: 'done' }]);
  });

  it('clears a prior run-error on run-start and run-finish', () => {
    const failed = applyEnvelope(createInitialAgentConversationState(), {
      ...envelope(1, { type: 'run-error', message: 'handler failed', code: 'handler_failed' }),
    });
    expect(failed.error).toMatchObject({ message: 'handler failed' });

    const restarted = applyEnvelope(failed, envelope(2, { type: 'run-start' }));
    expect(restarted.error).toBeUndefined();
    expect(restarted.isRunning).toBe(true);

    const finished = applyEnvelope(restarted, envelope(3, { type: 'run-finish', outcome: 'completed' }));
    expect(finished.error).toBeUndefined();
    expect(finished.isRunning).toBe(false);
  });

  it('accumulates fragmented tool input deltas without corrupting partial JSON', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, { type: 'tool-use-start', toolUseId: 'tu1', toolName: 'getOrder' }),
      envelope(4, { type: 'tool-use-delta', toolUseId: 'tu1', delta: '{"orderId":' }),
      envelope(5, { type: 'tool-use-delta', toolUseId: 'tu1', delta: '"123"}' }),
    ]);

    const toolPart = assistantMessages(state.messages)[0]?.parts.find((part) => part.type === 'tool');
    expect(toolPart).toMatchObject({
      type: 'tool',
      toolUseId: 'tu1',
      state: 'input-streaming',
      input: { orderId: '123' },
    });
  });

  it('does not mutate user messages when assistant events reuse the same messageId', () => {
    const stateWithUser = appendUserMessage(createInitialAgentConversationState(), {
      id: 'msg-123',
      role: 'user',
      parts: [{ type: 'text', text: 'No, do not transfer funds.', state: 'done' }],
      createdAt: '2026-07-28T12:00:00.000Z',
      status: 'sent',
    });

    const finalState = applyEnvelopes(stateWithUser, [
      envelope(1, { type: 'run-start' }),
      envelope(2, {
        type: 'message-delta',
        messageId: 'msg-123',
        delta: ' (Authorized: Yes, transfer funds.)',
      }),
    ]);

    const userMessage = finalState.messages.find((message) => message.id === 'msg-123' && message.role === 'user');
    expect(userMessage?.parts).toEqual([{ type: 'text', text: 'No, do not transfer funds.', state: 'done' }]);

    const assistantMessage = finalState.messages.find(
      (message) => message.id === 'msg-123' && message.role === 'assistant'
    );
    expect(assistantMessage?.parts).toEqual([
      { type: 'text', text: ' (Authorized: Yes, transfer funds.)', state: 'streaming' },
    ]);
  });

  it('updates approval parts from server responses', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'run-start' }),
      envelope(2, { type: 'message-start', messageId: 'm1' }),
      envelope(3, {
        type: 'tool-approval-request',
        approvalId: 'a1',
        toolUseId: 'tu1',
        toolName: 'deleteOrder',
        input: { orderId: '123' },
      }),
      envelope(4, { type: 'tool-approval-response', approvalId: 'a1', decision: 'approved' }),
      envelope(5, { type: 'run-finish', outcome: 'paused' }),
    ]);

    const approval = state.messages[0]?.parts.find((part) => part.type === 'approval');
    expect(approval).toMatchObject({ type: 'approval', approvalId: 'a1', state: 'approved' });
  });

  it('folds trust action ids onto approval parts', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, {
        type: 'tool-approval-request',
        approvalId: 'a1',
        toolUseId: 'tu1',
        toolName: 'create_issue',
        trustToolActionId: 'mcp-approval:approve-tool:tu1:create_issue:GitHub',
        trustServerActionId: 'mcp-approval:approve-server:tu1:create_issue:GitHub',
        source: { type: 'mcp', serverName: 'GitHub' },
      }),
    ]);

    expect(state.messages[0]?.parts[0]).toMatchObject({
      type: 'approval',
      trustToolActionId: 'mcp-approval:approve-tool:tu1:create_issue:GitHub',
      trustServerActionId: 'mcp-approval:approve-server:tu1:create_issue:GitHub',
      source: { type: 'mcp', serverName: 'GitHub' },
    });
  });

  it('keeps replayed approval requests in their protocol message positions', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, {
        type: 'tool-approval-request',
        messageId: 'approval-message-1',
        approvalId: 'a1',
        toolUseId: 'tu1',
        toolName: 'firstTool',
      }),
      envelope(2, { type: 'run-finish', outcome: 'paused' }),
      envelope(3, {
        type: 'message',
        role: 'user',
        messageId: 'user-message-2',
        content: { markdown: 'Continue' },
      }),
      envelope(4, {
        type: 'tool-approval-request',
        messageId: 'approval-message-2',
        approvalId: 'a2',
        toolUseId: 'tu2',
        toolName: 'secondTool',
      }),
    ]);

    expect(state.messages.map((message) => message.id)).toEqual([
      'approval-message-1',
      'user-message-2',
      'approval-message-2',
    ]);
  });

  it('folds MCP connection requests and results into one action part', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'message-start', messageId: 'm1' }),
      envelope(2, {
        type: 'mcp-connection-request',
        actionId: 'connect-1',
        mcpId: 'stripe',
        displayName: 'Stripe',
        authorizeUrl: 'https://example.com/authorize',
      }),
      envelope(3, {
        type: 'mcp-connection-result',
        actionId: 'connect-1',
        mcpId: 'stripe',
        status: 'connected',
      }),
    ]);

    expect(state.messages[0]?.parts).toContainEqual({
      type: 'mcp-connection',
      actionId: 'connect-1',
      mcpId: 'stripe',
      displayName: 'Stripe',
      authorizeUrl: 'https://example.com/authorize',
      state: 'connected',
    });
  });

  it('does not merge a later MCP connection into an earlier one after run-finish', () => {
    const historyRun = { runId: 'history' };
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, {
        type: 'message',
        role: 'user',
        messageId: 'u1',
        content: { markdown: 'Find a Notion page' },
      }),
      envelope(
        2,
        {
          type: 'mcp-connection-request',
          actionId: 'sevt_notion',
          mcpId: 'notion',
          displayName: 'Notion',
          authorizeUrl: 'https://example.com/notion',
        },
        historyRun
      ),
      envelope(3, {
        type: 'message',
        role: 'assistant',
        messageId: 'm1',
        content: { markdown: 'I do not have Notion connected yet.' },
      }),
      envelope(4, { type: 'run-finish', outcome: 'completed' }),
      envelope(5, {
        type: 'message',
        role: 'user',
        messageId: 'u2',
        content: { markdown: 'retrieve last Linear task' },
      }),
      envelope(
        6,
        {
          type: 'mcp-connection-request',
          actionId: 'sevt_linear',
          mcpId: 'linear',
          displayName: 'Linear',
          authorizeUrl: 'https://example.com/linear',
        },
        historyRun
      ),
    ]);

    const notionMessage = state.messages.find((message) =>
      message.parts.some((part) => part.type === 'mcp-connection' && part.mcpId === 'notion')
    );
    const linearMessage = state.messages.find((message) =>
      message.parts.some((part) => part.type === 'mcp-connection' && part.mcpId === 'linear')
    );

    expect(linearMessage?.id).not.toBe(notionMessage?.id);
    expect(linearMessage?.parts.filter((part) => part.type === 'mcp-connection')).toHaveLength(1);
  });

  it('folds durable user messages when role is user', () => {
    const state = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, {
        type: 'message',
        role: 'user',
        messageId: 'msg_user0000001',
        content: { markdown: 'Hello agent' },
      }),
      envelope(2, {
        type: 'message',
        role: 'assistant',
        messageId: 'msg_asst0000001',
        content: { markdown: 'Hello human' },
      }),
    ]);

    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({
      id: 'msg_user0000001',
      role: 'user',
      status: 'sent',
      parts: [{ type: 'text', text: 'Hello agent', state: 'done' }],
    });
    expect(state.messages[1]).toMatchObject({
      id: 'msg_asst0000001',
      role: 'assistant',
      status: 'sent',
      parts: [{ type: 'text', text: 'Hello human', state: 'done' }],
    });
  });

  it('tracks channel.typing on and off', () => {
    const on = applyEnvelope(
      createInitialAgentConversationState(),
      envelope(1, {
        type: 'channel.typing',
        state: 'on',
        status: 'Searching the docs…',
      })
    );
    expect(on.typing).toEqual({ status: 'Searching the docs…' });

    const off = applyEnvelope(on, envelope(2, { type: 'channel.typing', state: 'off' }));
    expect(off.typing).toBeUndefined();
  });

  it('clears typing on assistant message-start and durable assistant message', () => {
    const typing = applyEnvelopes(createInitialAgentConversationState(), [
      envelope(1, { type: 'channel.typing', state: 'on', status: 'Thinking…' }),
    ]);
    expect(typing.typing).toEqual({ status: 'Thinking…' });

    const started = applyEnvelope(typing, envelope(2, { type: 'message-start', messageId: 'm1' }));
    expect(started.typing).toBeUndefined();

    const typingAgain = applyEnvelope(started, envelope(3, { type: 'channel.typing', state: 'on' }));
    const durable = applyEnvelope(
      typingAgain,
      envelope(4, {
        type: 'message',
        role: 'assistant',
        messageId: 'm1',
        content: { markdown: 'Hello' },
      })
    );
    expect(durable.typing).toBeUndefined();
  });

  it('does not clear typing on durable user messages', () => {
    const typing = applyEnvelope(
      createInitialAgentConversationState(),
      envelope(1, {
        type: 'channel.typing',
        state: 'on',
      })
    );
    const next = applyEnvelope(
      typing,
      envelope(2, {
        type: 'message',
        role: 'user',
        messageId: 'msg_user0000001',
        content: { markdown: 'Hello agent' },
      })
    );

    expect(next.typing).toEqual({});
  });

  it('clears typing on tool-approval-request', () => {
    const typing = applyEnvelope(
      createInitialAgentConversationState(),
      envelope(1, {
        type: 'channel.typing',
        state: 'on',
        status: 'Thinking…',
      })
    );
    expect(typing.typing).toEqual({ status: 'Thinking…' });

    const next = applyEnvelope(
      typing,
      envelope(2, {
        type: 'tool-approval-request',
        approvalId: 'a1',
        toolUseId: 'tu1',
        toolName: 'delete_thing',
        input: { id: '1' },
      })
    );

    expect(next.typing).toBeUndefined();
  });

  it('folds card content into a card part', () => {
    const card = {
      type: 'card' as const,
      title: 'Support Agent',
      children: [{ type: 'text' as const, content: 'How can I help?' }],
    };
    const next = applyEnvelope(
      createInitialAgentConversationState(),
      envelope(1, {
        type: 'message',
        role: 'assistant',
        messageId: 'm-card',
        content: { card },
      })
    );

    expect(assistantMessages(next.messages)[0]?.parts).toEqual([{ type: 'card', card, sourceMessageId: 'm-card' }]);
  });

  it('folds exclusive durable content as markdown or card, not both', () => {
    const card = { type: 'card' as const, title: 'Support', children: [] as const };
    const next = applyEnvelope(
      createInitialAgentConversationState(),
      envelope(1, {
        type: 'message',
        role: 'assistant',
        messageId: 'm-both',
        content: { markdown: 'Hello', card } as AgentMessageContent,
      })
    );

    expect(assistantMessages(next.messages)[0]?.parts).toEqual([{ type: 'text', text: 'Hello', state: 'done' }]);
  });
});
