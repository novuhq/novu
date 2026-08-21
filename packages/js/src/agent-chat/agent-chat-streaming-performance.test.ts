import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';
import { createConversationSnapshotPublisher } from './conversation-snapshot-publisher';

describe('agent chat streaming performance', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;

  it('batches multiple live envelopes in the same microtask into one store publication', async () => {
    const emitter = new NovuEventEmitter();
    const sendMessage = jest.fn().mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    const agentChat = new AgentChat({
      inboxServiceInstance,
      eventEmitterInstance: emitter,
      agentChatService: { sendMessage, getEvents: jest.fn() } as unknown as AgentChatService,
      socket: { connect: jest.fn().mockResolvedValue({ data: undefined }) },
    });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    const updates: number[] = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key === 'local_session1' && data.change.kind === 'live') {
        updates.push(Date.now());
      }
    });

    for (let sequence = 2; sequence <= 51; sequence += 1) {
      emitter.emit('agent_chat.agent_event', {
        result: {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'run_1',
          turnId: 't1',
          sequence,
          timestamp: '2026-08-07T12:00:03.000Z',
          event:
            sequence === 2
              ? { type: 'run-start' }
              : sequence === 3
                ? { type: 'message-start', messageId: 'msg_asst0000001' }
                : { type: 'message-delta', messageId: 'msg_asst0000001', delta: 'x' },
        },
      });
    }

    await Promise.resolve();

    expect(updates.length).toBe(1);
  });

  it('reduces throttled hook publications versus an unthrottled baseline', () => {
    jest.useFakeTimers();
    const snapshot = {
      messages: [],
      isRunning: true,
      status: 'active' as const,
      hasMore: false,
    };
    const change = {
      kind: 'live' as const,
      envelope: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        sequence: 3,
        timestamp: '2026-01-01T00:00:00.000Z',
        conversationId: 'conv-1',
        agentId: 'agent-1',
        runId: 'run-1',
        turnId: 'turn-1',
        event: { type: 'message-delta' as const, messageId: 'm1', delta: 'a' },
      },
      addedMessages: [],
      newActions: [],
    };

    let unthrottledCount = 0;
    const unthrottled = createConversationSnapshotPublisher({
      onPublish: () => {
        unthrottledCount += 1;
      },
    });

    let throttledCount = 0;
    const throttled = createConversationSnapshotPublisher({
      throttleMs: 50,
      onPublish: () => {
        throttledCount += 1;
      },
    });

    for (let index = 0; index < 100; index += 1) {
      unthrottled.schedule(snapshot, change);
      throttled.schedule(snapshot, change);
      jest.advanceTimersByTime(1);
    }

    jest.advanceTimersByTime(50);

    expect(unthrottledCount).toBe(100);
    expect(throttledCount).toBeLessThan(unthrottledCount);
    expect(throttledCount).toBeLessThanOrEqual(22);
    jest.useRealTimers();
  });
});
