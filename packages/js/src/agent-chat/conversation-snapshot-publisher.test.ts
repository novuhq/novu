import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent } from '@novu/agent-event-protocol';
import { createInitialAgentConversationState } from './agent-message.types';
import { createConversationSnapshotPublisher } from './conversation-snapshot-publisher';
import type { AgentChatChange } from './types';

function streamingChange(): AgentChatChange {
  return {
    kind: 'live',
    envelope: {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      sequence: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      conversationId: 'conv-1',
      agentId: 'agent-1',
      runId: 'run-1',
      turnId: 'turn-1',
      event: { type: 'message-delta', messageId: 'm1', delta: 'a' },
    },
    addedMessages: [],
    newActions: [],
  };
}

function terminalChange(event: AgentEvent): AgentChatChange {
  return {
    kind: 'live',
    envelope: {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      sequence: 2,
      timestamp: '2026-01-01T00:00:01.000Z',
      conversationId: 'conv-1',
      agentId: 'agent-1',
      runId: 'run-1',
      turnId: 'turn-1',
      event,
    },
    addedMessages: [],
    newActions: [],
  };
}

describe('createConversationSnapshotPublisher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('limits streaming publications to about one per throttle interval', () => {
    const publishes: number[] = [];
    const publisher = createConversationSnapshotPublisher({
      throttleMs: 50,
      onPublish: () => {
        publishes.push(Date.now());
      },
    });

    const snapshot = {
      ...createInitialAgentConversationState(),
      hasMore: false,
      isRunning: true,
    };

    for (let index = 0; index < 100; index += 1) {
      publisher.schedule(snapshot, streamingChange());
      jest.advanceTimersByTime(1);
    }

    jest.advanceTimersByTime(50);

    expect(publishes.length).toBeLessThanOrEqual(22);
    expect(publishes.length).toBeGreaterThanOrEqual(2);
  });

  it('publishes terminal run-finish changes immediately', () => {
    const publishes: string[] = [];
    const publisher = createConversationSnapshotPublisher({
      throttleMs: 50,
      onPublish: (snapshot) => {
        publishes.push(snapshot.isRunning ? 'running' : 'ready');
      },
    });

    publisher.schedule(
      {
        ...createInitialAgentConversationState(),
        hasMore: false,
        isRunning: true,
      },
      streamingChange()
    );

    publisher.schedule(
      {
        ...createInitialAgentConversationState(),
        hasMore: false,
        isRunning: false,
      },
      terminalChange({ type: 'run-finish', outcome: 'completed' })
    );

    expect(publishes).toEqual(['running', 'ready']);
  });

  it('publishes local sent/failed folds immediately', () => {
    const publishes: number[] = [];
    const publisher = createConversationSnapshotPublisher({
      throttleMs: 50,
      onPublish: () => {
        publishes.push(Date.now());
      },
    });

    publisher.schedule(
      {
        ...createInitialAgentConversationState(),
        hasMore: false,
        isRunning: false,
      },
      { kind: 'local', addedMessages: [], newActions: [] }
    );

    expect(publishes).toHaveLength(1);
  });
});
