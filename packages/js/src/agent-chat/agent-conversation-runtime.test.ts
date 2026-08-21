import { AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';
import type { AgentConversationSnapshot } from './conversation-runtime.types';

describe('AgentConversationRuntime', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;
  let emitter: NovuEventEmitter;
  let sendMessage: jest.Mock;
  let respondToAction: jest.Mock;
  let sendAction: jest.Mock;
  let getEvents: jest.Mock;
  let connect: jest.Mock;
  let agentChat: AgentChat;

  beforeEach(() => {
    emitter = new NovuEventEmitter();
    sendMessage = jest.fn();
    respondToAction = jest.fn();
    sendAction = jest.fn();
    getEvents = jest.fn();
    connect = jest.fn().mockResolvedValue({ data: undefined });
    const agentChatService = { sendMessage, respondToAction, sendAction, getEvents } as unknown as AgentChatService;
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

  it('creates separate runtimes for different conversation ids', () => {
    const first = agentChat.conversation({ agentId: 'agent_1', conversationId: 'conv_aaaaaaaaaaaa' });
    const second = agentChat.conversation({ agentId: 'agent_1', conversationId: 'conv_bbbbbbbbbbbb' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.data).not.toBe(second.data);
    first.data.dispose();
    second.data.dispose();
  });

  it('returns the same snapshot reference until the next publication', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const runtime = created.data;
    const before = runtime.getSnapshot();

    await runtime.sendMessage('hello');

    const afterSend = runtime.getSnapshot();
    expect(afterSend).not.toBe(before);
    expect(afterSend.messages[0]).toMatchObject({
      role: 'user',
      status: 'sent',
      parts: [{ type: 'text', text: 'hello', state: 'done' }],
    });

    const again = runtime.getSnapshot();
    expect(again).toBe(afterSend);

    runtime.dispose();
  });

  it('freezes published snapshots and nested collections', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    await created.data.sendMessage('hello');
    const snapshot = created.data.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.messages)).toBe(true);
    expect(Object.isFrozen(snapshot.pendingActions)).toBe(true);
    expect(Object.isFrozen(snapshot.run)).toBe(true);
    expect(Object.isFrozen(snapshot.pagination)).toBe(true);

    created.data.dispose();
  });

  it('notifies subscribers only when the snapshot reference changes', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

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

    // Optimistic send publishes twice: sending, then sent.
    expect(seen).toHaveLength(3);
    expect(seen[0]).toBe(initial);
    expect(seen[1]).not.toBe(initial);
    expect(seen[2]).not.toBe(seen[1]);

    const current = runtime.getSnapshot();
    runtime.getSnapshot();
    expect(seen).toHaveLength(3);
    expect(seen.every((snapshot, index) => snapshot === seen[index])).toBe(true);
    expect(current).toBe(seen[2]);

    unsubscribe();
    runtime.dispose();
  });

  it('accepts sendMessage text shorthand and object form', async () => {
    sendMessage
      .mockResolvedValueOnce({ identifier: 'conv_aaaaaaaaaaaa', messageId: 'msg_aaaaaaaaaaaa' })
      .mockResolvedValueOnce({ identifier: 'conv_bbbbbbbbbbbb', messageId: 'msg_bbbbbbbbbbbb' });

    const first = agentChat.conversation({ agentId: 'agent_1' });
    const second = agentChat.conversation({ agentId: 'agent_1' });
    if (!first.ok || !second.ok) {
      return;
    }

    await first.data.sendMessage('hello');
    await second.data.sendMessage({ text: 'hello', metadata: { source: 'test' } });

    expect(sendMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: 'hello' }));
    expect(sendMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ text: 'hello' }));

    first.data.dispose();
    second.data.dispose();
  });

  it('keeps respondToAction and sendAction as distinct methods', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    respondToAction.mockResolvedValue({ identifier: 'conv_abcdefghijkl' });
    sendAction.mockResolvedValue({ identifier: 'conv_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    await created.data.sendMessage('hi');

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: 1,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 't1',
        sequence: 1,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: { type: 'message-start', messageId: 'msg_asst0000001' },
      },
    });
    emitter.emit('agent_chat.agent_event', {
      result: {
        version: 1,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 't1',
        sequence: 2,
        timestamp: '2026-08-07T12:00:01.000Z',
        event: {
          type: 'tool-approval-request',
          approvalId: 'approval_000001',
          toolUseId: 'tu_0000001',
          toolName: 'deleteOrder',
          input: { orderId: '123' },
          approveActionId: 'tool-approval:approve:approval_000001',
          denyActionId: 'tool-approval:deny:approval_000001',
        },
      },
    });

    await created.data.respondToAction({ actionId: 'approval_000001', decision: 'approved' });
    await created.data.sendAction({
      actionId: 'topic-billing',
      sourceMessageId: 'act_card0000001',
      value: 'billing',
    });

    expect(respondToAction).toHaveBeenCalledTimes(1);
    expect(sendAction).toHaveBeenCalledTimes(1);
    expect(respondToAction.mock.calls[0]?.[0]).toMatchObject({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'tool-approval:approve:approval_000001',
    });
    expect(sendAction.mock.calls[0]?.[0]).toMatchObject({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'topic-billing',
      sourceMessageId: 'act_card0000001',
      value: 'billing',
    });

    created.data.dispose();
  });

  it('returns a not-implemented error from cancelRun', () => {
    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    const result = created.data.cancelRun();
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.message).toContain('not supported');

    created.data.dispose();
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

    created.data.dispose();
  });

  it('registers the runtime by conversation id after the first send', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    const created = agentChat.conversation({ agentId: 'agent_1' });
    if (!created.ok) {
      return;
    }

    await created.data.sendMessage('hello');

    const resumed = agentChat.conversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) {
      return;
    }

    expect(resumed.data).toBe(created.data);

    created.data.dispose();
  });
});
