import { AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';
import type { AgentConversationSnapshot } from './conversation-runtime.types';

describe('AgentConversationRuntime', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;
  let emitter: NovuEventEmitter;
  let sendMessage: jest.Mock;
  let getEvents: jest.Mock;
  let connect: jest.Mock;
  let agentChat: AgentChat;

  beforeEach(() => {
    emitter = new NovuEventEmitter();
    sendMessage = jest.fn();
    getEvents = jest.fn();
    connect = jest.fn().mockResolvedValue({ data: undefined });
    const agentChatService = {
      sendMessage,
      respondToAction: jest.fn(),
      sendAction: jest.fn(),
      getEvents,
    } as unknown as AgentChatService;
    agentChat = new AgentChat({
      inboxServiceInstance,
      eventEmitterInstance: emitter,
      agentChatService,
      socket: { connect },
    });
  });

  afterEach(() => {
    for (const result of [
      agentChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' }),
      agentChat.conversation({ agentId: 'agent_1' }),
    ]) {
      if (result.ok) {
        result.data.dispose();
      }
    }
  });

  it('reuses a runtime keyed by agent and conversation id', () => {
    const first = agentChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });
    const second = agentChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.data).toBe(second.data);
    first.data.dispose();
  });

  it('returns the same frozen snapshot reference until the next publication', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const runtime = created.data;
    const before = runtime.getSnapshot();

    await runtime.sendMessage('hello');
    await runtime.sendMessage({ text: 'with metadata', metadata: { source: 'test' } });

    const afterSend = runtime.getSnapshot();
    expect(afterSend).not.toBe(before);
    expect(afterSend.messages[0]).toMatchObject({
      role: 'user',
      status: 'sent',
      parts: [{ type: 'text', text: 'hello', state: 'done' }],
    });
    expect(Object.isFrozen(afterSend)).toBe(true);
    expect(Object.isFrozen(afterSend.messages)).toBe(true);
    expect(Object.isFrozen(afterSend.pendingActions)).toBe(true);
    expect(Object.isFrozen(afterSend.run)).toBe(true);
    expect(Object.isFrozen(afterSend.pagination)).toBe(true);
    expect(Object.isFrozen(afterSend.messages[0])).toBe(true);
    expect(Object.isFrozen(afterSend.messages[0]?.parts[0])).toBe(true);

    const store = agentChat.getConversation({ agentId: 'agent_1', key: runtime.key });
    expect(afterSend.messages[0]).not.toBe(store?.messages[0]);

    const again = runtime.getSnapshot();
    expect(again).toBe(afterSend);

    expect(sendMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: 'hello' }));
    expect(sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ text: 'with metadata', metadata: { source: 'test' } })
    );

    runtime.dispose();
  });

  it('notifies subscribers only when the snapshot reference changes', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    getEvents.mockResolvedValue({ events: [], olderCursor: null });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    const runtime = created.data;
    const seen: AgentConversationSnapshot[] = [];

    const unsubscribe = runtime.subscribe((snapshot) => {
      seen.push(snapshot);
    });

    expect(seen).toHaveLength(1);
    const initial = seen[0];

    await runtime.sendMessage('hello');

    // Optimistic send publishes recovery clear, sending, sent, then catch-up recovery states.
    expect(seen).toHaveLength(7);
    expect(seen[0]).toBe(initial);
    for (let index = 1; index < seen.length; index += 1) {
      expect(seen[index]).not.toBe(seen[index - 1]);
    }

    const current = runtime.getSnapshot();
    runtime.getSnapshot();
    expect(seen).toHaveLength(7);
    expect(seen.every((snapshot, index) => snapshot === seen[index])).toBe(true);
    expect(current).toBe(seen[6]);

    unsubscribe();
    runtime.dispose();
  });

  it('separates run, conversationStatus, pagination, and session status in the snapshot', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    await created.data.sendMessage('hello');

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: 1,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 1,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: { type: 'run-start' },
      },
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: 1,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 2,
        timestamp: '2026-08-07T12:00:01.000Z',
        event: { type: 'channel.typing', state: 'on', status: 'Thinking…' },
      },
    });

    const snapshot = created.data.getSnapshot();
    expect(snapshot.status).toBe('ready');
    expect(snapshot.run.isRunning).toBe(true);
    expect(snapshot.run.typing?.status).toBe('Thinking…');
    expect(snapshot.conversationStatus).toBe('active');
    expect(snapshot.pagination.hasMore).toBe(false);
    expect(snapshot.pagination.status).toBe('idle');

    created.data.dispose();
  });

  it('replaces a stale resume runtime when the create-flow runtime registers', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const createFlow = agentChat.conversation({ agentId: 'agent_1' });
    if (!createFlow.ok) {
      return;
    }

    const staleResume = agentChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(staleResume.ok).toBe(true);
    if (!staleResume.ok) {
      return;
    }

    expect(staleResume.data).not.toBe(createFlow.data);

    await createFlow.data.sendMessage('hello');

    const resumed = agentChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) {
      return;
    }

    expect(resumed.data).toBe(createFlow.data);
    expect(resumed.data).not.toBe(staleResume.data);
    expect(resumed.data.getSnapshot().messages[0]).toMatchObject({
      role: 'user',
      parts: [{ type: 'text', text: 'hello' }],
    });

    createFlow.data.dispose();
  });

  it('clearCache disposes runtimes so a later resume gets a fresh instance', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    await created.data.sendMessage('hello');
    const disposedRuntime = created.data;

    agentChat.clearCache();

    const resumed = agentChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) {
      return;
    }

    expect(resumed.data).not.toBe(disposedRuntime);

    resumed.data.dispose();
  });

  it('does not register a disposed runtime after an in-flight send completes', async () => {
    let resolveSend!: (value: { identifier: string; messageId: string }) => void;
    sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    const sendPromise = created.data.sendMessage('hello');
    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledTimes(1);

    created.data.dispose();

    resolveSend({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    await sendPromise;

    const resumed = agentChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) {
      return;
    }

    expect(resumed.data).not.toBe(created.data);

    resumed.data.dispose();
  });

  it('isolates snapshot messages from store mutations', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    await created.data.sendMessage('hello');

    const snapshot = created.data.getSnapshot();
    const storeBefore = agentChat.getConversation({ agentId: 'agent_1', key: created.data.key });

    expect(snapshot.messages[0]?.parts[0]).toMatchObject({ type: 'text', text: 'hello' });
    expect(Object.isFrozen(snapshot.messages[0])).toBe(true);
    expect(Object.isFrozen(snapshot.messages[0]?.parts[0])).toBe(true);
    if (snapshot.messages[0]?.parts[0]?.type !== 'text') {
      return;
    }

    expect(() => {
      (snapshot.messages[0].parts[0] as { text: string }).text = 'mutated';
    }).toThrow(TypeError);

    expect(storeBefore?.messages[0]?.parts[0]).toMatchObject({ type: 'text', text: 'hello' });

    created.data.dispose();
  });
});
