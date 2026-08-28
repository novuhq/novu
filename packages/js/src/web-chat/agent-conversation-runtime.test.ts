import { WebChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import type { AgentConversationSnapshot } from './conversation-runtime.types';
import { WebChat } from './web-chat';

describe('AgentConversationRuntime', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;
  let emitter: NovuEventEmitter;
  let sendMessage: jest.Mock;
  let getEvents: jest.Mock;
  let connect: jest.Mock;
  let webChat: WebChat;

  beforeEach(() => {
    emitter = new NovuEventEmitter();
    sendMessage = jest.fn();
    getEvents = jest.fn();
    connect = jest.fn().mockResolvedValue({ data: undefined });
    const webChatService = {
      sendMessage,
      respondToAction: jest.fn(),
      sendAction: jest.fn(),
      getEvents,
    } as unknown as WebChatService;
    webChat = new WebChat({
      inboxServiceInstance,
      eventEmitterInstance: emitter,
      webChatService,
      socket: { connect },
    });
  });

  afterEach(() => {
    webChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' }).dispose();
    webChat.conversation({ agentId: 'agent_1' }).dispose();
  });

  it('reuses a runtime keyed by agent and conversation id', () => {
    const first = webChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });
    const second = webChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    expect(first).toBe(second);
    first.dispose();
  });

  it('returns the same frozen snapshot reference until the next publication', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const runtime = webChat.conversation({ agentId: 'agent_1' });
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

    const store = webChat.getConversation({ agentId: 'agent_1', key: runtime.key });
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

    const runtime = webChat.conversation({ agentId: 'agent_1' });
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

    const runtime = webChat.conversation({ agentId: 'agent_1' });
    await runtime.sendMessage('hello');

    emitter.emit('web_chat.agent_event', {
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

    emitter.emit('web_chat.agent_event', {
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

    const snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('ready');
    expect(snapshot.run.isRunning).toBe(true);
    expect(snapshot.run.typing?.status).toBe('Thinking…');
    expect(snapshot.conversationStatus).toBe('active');
    expect(snapshot.pagination.hasMore).toBe(false);
    expect(snapshot.pagination.status).toBe('idle');

    runtime.dispose();
  });

  it('replaces a stale resume runtime when the create-flow runtime registers', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const createFlow = webChat.conversation({ agentId: 'agent_1' });
    const staleResume = webChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(staleResume).not.toBe(createFlow);

    await createFlow.sendMessage('hello');

    const resumed = webChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(resumed).toBe(createFlow);
    expect(resumed).not.toBe(staleResume);
    expect(resumed.getSnapshot().messages[0]).toMatchObject({
      role: 'user',
      parts: [{ type: 'text', text: 'hello' }],
    });

    createFlow.dispose();
  });

  it('clearCache disposes runtimes so a later resume gets a fresh instance', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = webChat.conversation({ agentId: 'agent_1' });
    await created.sendMessage('hello');
    const disposedRuntime = created;

    webChat.clearCache();

    const resumed = webChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(resumed).not.toBe(disposedRuntime);

    resumed.dispose();
  });

  it('does not register a disposed runtime after an in-flight send completes', async () => {
    let resolveSend!: (value: { identifier: string; messageId: string }) => void;
    sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    const created = webChat.conversation({ agentId: 'agent_1' });
    const sendPromise = created.sendMessage('hello');
    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledTimes(1);

    created.dispose();

    resolveSend({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    await sendPromise;

    const resumed = webChat.conversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(resumed).not.toBe(created);

    resumed.dispose();
  });

  it('isolates snapshot messages from store mutations', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = webChat.conversation({ agentId: 'agent_1' });
    await created.sendMessage('hello');

    const snapshot = created.getSnapshot();
    const storeBefore = webChat.getConversation({ agentId: 'agent_1', key: created.key });

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

    created.dispose();
  });
});
