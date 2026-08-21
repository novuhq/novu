import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { AgentChatPlanLimitError, AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';
import { derivePendingActions } from './agent-message.types';
import type { AgentChatChange } from './types';

describe('AgentChat', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;
  let emitter: NovuEventEmitter;
  let sendMessage: jest.Mock;
  let respondToAction: jest.Mock;
  let sendAction: jest.Mock;
  let cancelRun: jest.Mock;
  let getEvents: jest.Mock;
  let connect: jest.Mock;
  let agentChat: AgentChat;

  beforeEach(() => {
    emitter = new NovuEventEmitter();
    sendMessage = jest.fn();
    respondToAction = jest.fn();
    sendAction = jest.fn();
    cancelRun = jest.fn();
    getEvents = jest.fn();
    connect = jest.fn().mockResolvedValue({ data: undefined });
    const agentChatService = {
      sendMessage,
      respondToAction,
      sendAction,
      cancelRun,
      getEvents,
    } as unknown as AgentChatService;
    agentChat = new AgentChat({
      inboxServiceInstance,
      eventEmitterInstance: emitter,
      agentChatService,
      socket: { connect },
    });
  });

  it('appends an optimistic user message then marks it sent with server messageId', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    const updates: Array<{
      key: string;
      conversationId?: string;
      messages: Array<{ id: string; status: string; role: string }>;
    }> = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      updates.push({
        key: data.key,
        conversationId: data.conversationId,
        messages: data.messages.map((m) => ({ id: m.id, status: m.status, role: m.role })),
      });
    });

    const result = await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    expect(result).toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' },
    });
    expect(updates[0]?.key).toBe('local_session1');
    expect(updates[0]?.conversationId).toBeUndefined();
    expect(updates[0]?.messages[0]?.status).toBe('sending');
    expect(updates[0]?.messages[0]?.id).toMatch(/^opt_/);
    expect(updates[1]?.key).toBe('local_session1');
    expect(updates[1]?.conversationId).toBe('conv_abcdefghijkl');
    expect(updates[1]?.messages).toEqual([{ id: 'msg_abcdefghijkl', status: 'sent', role: 'user' }]);

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(snapshot?.key).toBe('local_session1');
    expect(snapshot?.messages[0]).toMatchObject({
      id: 'msg_abcdefghijkl',
      role: 'user',
      status: 'sent',
      parts: [{ type: 'text', text: 'hello', state: 'done' }],
    });
  });

  it('keeps the session key stable so a create listener sees sending → sent', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    const statuses: string[] = [];

    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key !== 'local_session1') {
        return;
      }

      statuses.push(data.messages[0]?.status ?? '');
    });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    expect(statuses).toEqual(['sending', 'sent']);
  });

  it('marks the optimistic message failed when the request errors', async () => {
    sendMessage.mockRejectedValue(new Error('network'));

    const result = await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    expect(result.error).toBeDefined();
    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.messages[0]?.status).toBe('failed');
  });

  it('returns AgentChatPlanLimitError when accept is blocked by plan limits', async () => {
    sendMessage.mockRejectedValue(new AgentChatPlanLimitError('agents', 'Upgrade your plan to activate this agent.'));

    const result = await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    expect(result.error).toBeInstanceOf(AgentChatPlanLimitError);
    expect(result.error).toMatchObject({
      reason: 'agents',
      message: 'Upgrade your plan to activate this agent.',
    });
  });

  it('serializes overlapping creates on the same session key until conversationId is claimed', async () => {
    let resolveFirst!: (value: { identifier: string; messageId: string }) => void;
    sendMessage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(async (args) => {
        expect(args.conversationId).toBe('conv_abcdefghijkl');

        return { identifier: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' };
      });

    const first = agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_session1' });
    const second = agentChat.sendMessage({ agentId: 'agent_1', text: 'two', key: 'local_session1' });

    expect(agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' })?.messages).toHaveLength(2);

    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      agentId: 'agent_1',
      text: 'one',
      conversationId: undefined,
    });

    resolveFirst({ identifier: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' });

    await expect(first).resolves.toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' },
    });
    await expect(second).resolves.toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' },
    });

    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      agentId: 'agent_1',
      text: 'two',
      conversationId: 'conv_abcdefghijkl',
    });
  });

  it('omitting conversationId on two different session keys creates two conversations', async () => {
    sendMessage
      .mockResolvedValueOnce({ identifier: 'conv_aaaaaaaaaaaa', messageId: 'msg_aaaaaaaaaaaa' })
      .mockResolvedValueOnce({ identifier: 'conv_bbbbbbbbbbbb', messageId: 'msg_bbbbbbbbbbbb' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_a' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'two', key: 'local_b' });

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      agentId: 'agent_1',
      text: 'one',
      conversationId: undefined,
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      agentId: 'agent_1',
      text: 'two',
      conversationId: undefined,
    });

    expect(agentChat.getConversation({ agentId: 'agent_1', key: 'local_a' })?.conversationId).toBe('conv_aaaaaaaaaaaa');
    expect(agentChat.getConversation({ agentId: 'agent_1', key: 'local_b' })?.conversationId).toBe('conv_bbbbbbbbbbbb');
  });

  it('does not serialize appends after the conversation id is known', async () => {
    let resolveSecond!: (value: { identifier: string; messageId: string }) => void;
    let resolveThird!: (value: { identifier: string; messageId: string }) => void;

    sendMessage
      .mockResolvedValueOnce({ identifier: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveThird = resolve;
          })
      );

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_session1' });

    const second = agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'two',
      key: 'local_session1',
      conversationId: 'conv_abcdefghijkl',
    });
    const third = agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'three',
      key: 'local_session1',
      conversationId: 'conv_abcdefghijkl',
    });
    await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledTimes(3);

    resolveSecond({ identifier: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' });
    resolveThird({ identifier: 'conv_abcdefghijkl', messageId: 'msg_cccccccccccc' });
    await expect(second).resolves.toMatchObject({ data: { messageId: 'msg_bbbbbbbbbbbb' } });
    await expect(third).resolves.toMatchObject({ data: { messageId: 'msg_cccccccccccc' } });
  });

  it('serializes create retries after a failed create so waiters do not double-mint', async () => {
    let resolveSecond!: (value: { identifier: string; messageId: string }) => void;
    let resolveThird!: (value: { identifier: string; messageId: string }) => void;

    sendMessage
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveThird = resolve;
          })
      );

    const failed = agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_session1' });
    const second = agentChat.sendMessage({ agentId: 'agent_1', text: 'two', key: 'local_session1' });
    const third = agentChat.sendMessage({ agentId: 'agent_1', text: 'three', key: 'local_session1' });

    await expect(failed).resolves.toMatchObject({ error: expect.anything() });

    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledTimes(2);

    resolveSecond({ identifier: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' });
    await expect(second).resolves.toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' },
    });

    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(sendMessage).toHaveBeenNthCalledWith(3, {
      agentId: 'agent_1',
      text: 'three',
      conversationId: 'conv_abcdefghijkl',
    });

    resolveThird({ identifier: 'conv_abcdefghijkl', messageId: 'msg_cccccccccccc' });
    await expect(third).resolves.toMatchObject({ data: { messageId: 'msg_cccccccccccc' } });
  });

  it('appends by conversationId alone after create (JS caller without local key)', async () => {
    sendMessage
      .mockResolvedValueOnce({ identifier: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' })
      .mockResolvedValueOnce({ identifier: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_session1' });
    await agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'two',
      conversationId: 'conv_abcdefghijkl',
    });

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(snapshot?.messages).toHaveLength(2);
    expect(snapshot?.key).toBe('local_session1');
  });

  it('rejects a stale key that points at a different claimed conversation', async () => {
    sendMessage
      .mockResolvedValueOnce({ identifier: 'conv_aaaaaaaaaaaa', messageId: 'msg_aaaaaaaaaaaa' })
      .mockResolvedValueOnce({ identifier: 'conv_bbbbbbbbbbbb', messageId: 'msg_bbbbbbbbbbbb' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_stale' });

    await agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'two',
      key: 'local_stale',
      conversationId: 'conv_bbbbbbbbbbbb',
    });

    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      agentId: 'agent_1',
      text: 'two',
      conversationId: 'conv_bbbbbbbbbbbb',
    });

    const previous = agentChat.getConversation({ agentId: 'agent_1', key: 'local_stale' });
    expect(previous?.messages).toHaveLength(1);
    expect(previous?.conversationId).toBe('conv_aaaaaaaaaaaa');

    const next = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_bbbbbbbbbbbb',
    });
    expect(next?.messages).toHaveLength(1);
    expect(next?.key).toBe('conv_bbbbbbbbbbbb');
  });

  it('resume-by-id after create receives sending → sent on the resume key', async () => {
    sendMessage
      .mockResolvedValueOnce({ identifier: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' })
      .mockResolvedValueOnce({ identifier: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'one', key: 'local_session1' });

    const resumeStatuses: string[] = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key !== 'conv_abcdefghijkl') {
        return;
      }

      resumeStatuses.push(data.messages.map((m) => m.status).join(','));
    });

    getEvents.mockResolvedValue({ events: [], olderCursor: null });
    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    await agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'two',
      key: 'conv_abcdefghijkl',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(resumeStatuses.some((s) => s.includes('sending'))).toBe(true);
    expect(resumeStatuses.some((s) => s.includes('sent'))).toBe(true);
  });

  it('clearCache drops retained conversation state', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });
    agentChat.clearCache();

    expect(agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' })).toBeUndefined();
    expect(
      agentChat.getConversation({
        agentId: 'agent_1',
        conversationId: 'conv_abcdefghijkl',
      })
    ).toBeUndefined();
  });

  it('loadConversation folds history into the store including user turns', async () => {
    getEvents.mockResolvedValue({
      events: [
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 1,
          timestamp: '2026-08-06T12:00:00.000Z',
          event: {
            type: 'message',
            role: 'user',
            messageId: 'msg_user0000001',
            content: { markdown: 'prior question' },
          },
        },
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't2',
          sequence: 2,
          timestamp: '2026-08-06T12:00:01.000Z',
          event: {
            type: 'message',
            role: 'assistant',
            messageId: 'msg_asst0000001',
            content: { markdown: 'prior answer' },
          },
        },
      ],
      olderCursor: null,
    });

    const result = await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result.data?.messages).toHaveLength(2);
    expect(result.data?.messages[0]).toMatchObject({
      id: 'msg_user0000001',
      role: 'user',
      parts: [{ type: 'text', text: 'prior question', state: 'done' }],
    });

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(snapshot?.key).toBe('conv_abcdefghijkl');
    expect(snapshot?.messages).toEqual(result.data?.messages);
  });

  it('loadConversation merges history with local-only messages by messageId', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_local000001' });
    await agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'ack locally',
      key: 'conv_abcdefghijkl',
      conversationId: 'conv_abcdefghijkl',
    });

    getEvents.mockResolvedValue({
      events: [
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 1,
          timestamp: '2026-08-06T12:00:00.000Z',
          event: {
            type: 'message',
            role: 'user',
            messageId: 'msg_server00001',
            content: { markdown: 'from server' },
          },
        },
      ],
      olderCursor: 'act_older',
    });

    const result = await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result.data?.messages.map((message) => message.id)).toEqual(['msg_server00001', 'msg_local000001']);
  });

  it('loadConversation dedupes when history already contains the ack’d messageId', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_shared00001' });
    await agentChat.sendMessage({
      agentId: 'agent_1',
      text: 'same turn',
      key: 'conv_abcdefghijkl',
      conversationId: 'conv_abcdefghijkl',
    });

    getEvents.mockResolvedValue({
      events: [
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 1,
          timestamp: '2026-08-06T12:00:00.000Z',
          event: {
            type: 'message',
            role: 'user',
            messageId: 'msg_shared00001',
            content: { markdown: 'same turn' },
          },
        },
      ],
      olderCursor: null,
    });

    const result = await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result.data?.messages).toHaveLength(1);
    expect(result.data?.messages[0]?.id).toBe('msg_shared00001');
  });

  it('loadConversation uses a resume holder separate from an in-flight create session', async () => {
    getEvents.mockResolvedValue({
      events: [
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_bbbbbbbbbbbb',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 1,
          timestamp: '2026-08-06T12:00:00.000Z',
          event: {
            type: 'message',
            role: 'user',
            messageId: 'msg_hist0000001',
            content: { markdown: 'old thread' },
          },
        },
      ],
      olderCursor: null,
    });

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_bbbbbbbbbbbb',
    });

    sendMessage.mockResolvedValue({ identifier: 'conv_aaaaaaaaaaaa', messageId: 'msg_new00000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'fresh chat', key: 'local_new' });

    expect(sendMessage).toHaveBeenCalledWith({
      agentId: 'agent_1',
      text: 'fresh chat',
      conversationId: undefined,
    });

    const created = agentChat.getConversation({ agentId: 'agent_1', key: 'local_new' });
    const resumed = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_bbbbbbbbbbbb',
    });

    expect(created?.conversationId).toBe('conv_aaaaaaaaaaaa');
    expect(created?.messages[0]).toMatchObject({
      id: 'msg_new00000001',
      parts: [{ type: 'text', text: 'fresh chat', state: 'done' }],
    });
    expect(resumed?.key).toBe('conv_bbbbbbbbbbbb');
    expect(resumed?.messages[0]?.id).toBe('msg_hist0000001');
  });

  it('tracks isRunning and status on messages.updated and getConversation after live run lifecycle', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    const updates: Array<{ isRunning: boolean; status: string }> = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key === 'local_session1') {
        updates.push({ isRunning: data.isRunning, status: data.status });
      }
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
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
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 2,
        timestamp: '2026-08-07T12:00:01.000Z',
        event: { type: 'run-finish', outcome: 'completed' },
      },
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 3,
        timestamp: '2026-08-07T12:00:02.000Z',
        event: { type: 'resolve' },
      },
    });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.isRunning).toBe(false);
    expect(snapshot?.status).toBe('resolved');
    expect(updates.some((update) => update.isRunning === true && update.status === 'active')).toBe(true);
    expect(updates.at(-1)).toEqual({ isRunning: false, status: 'resolved' });
  });

  it('tracks typing on messages.updated and getConversation after channel.typing', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    const updates: Array<{ typing?: { status?: string } }> = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key === 'local_session1') {
        updates.push({ typing: data.typing });
      }
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 1,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: { type: 'channel.typing', state: 'on', status: 'Searching the docs…' },
      },
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 2,
        timestamp: '2026-08-07T12:00:01.000Z',
        event: { type: 'channel.typing', state: 'off' },
      },
    });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.typing).toBeUndefined();
    expect(updates.some((update) => update.typing?.status === 'Searching the docs…')).toBe(true);
    expect(updates.at(-1)).toEqual({ typing: undefined });
  });

  it('folds a live agent_chat.agent_event into the matching conversation holder', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    const updates: string[][] = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key === 'local_session1') {
        updates.push(data.messages.map((message) => message.id));
      }
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 1,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: {
          type: 'message',
          role: 'assistant',
          messageId: 'msg_asst0000001',
          content: { markdown: 'live reply' },
        },
      },
    });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.messages).toHaveLength(2);
    expect(snapshot?.messages[1]).toMatchObject({
      id: 'msg_asst0000001',
      role: 'assistant',
      parts: [{ type: 'text', text: 'live reply', state: 'done' }],
    });
    expect(updates.at(-1)).toEqual(['msg_user0000001', 'msg_asst0000001']);
  });

  it('ignores live envelopes for conversations that are not open', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_otherother1',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 1,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: {
          type: 'message',
          role: 'assistant',
          messageId: 'msg_asst0000001',
          content: { markdown: 'other chat' },
        },
      },
    });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.messages).toHaveLength(1);
    expect(snapshot?.messages[0]?.id).toBe('msg_user0000001');
  });

  it('ignores live envelopes without conversationIdentifier', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 'turn_1',
        sequence: 1,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: {
          type: 'message',
          role: 'assistant',
          messageId: 'msg_asst0000001',
          content: { markdown: 'no public id' },
        },
      },
    });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.messages).toHaveLength(1);
  });

  it('connects the socket on the first subscribe and refcounts later calls', () => {
    agentChat.subscribe();
    agentChat.subscribe();

    expect(connect).toHaveBeenCalledTimes(1);

    agentChat.unsubscribe();
    agentChat.unsubscribe();
    agentChat.unsubscribe();

    agentChat.subscribe();
    expect(connect).toHaveBeenCalledTimes(2);
  });

  function historyPage(
    events: Array<{
      sequence: number;
      messageId: string;
      role: 'user' | 'assistant';
      markdown: string;
    }>,
    olderCursor: string | null = null
  ) {
    return {
      events: events.map((event) => ({
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'history',
        turnId: 't1',
        sequence: event.sequence,
        timestamp: '2026-08-07T12:00:00.000Z',
        event: {
          type: 'message' as const,
          role: event.role,
          messageId: event.messageId,
          content: { markdown: event.markdown },
        },
      })),
      olderCursor,
    };
  }

  function liveAssistantEnvelope(args: { sequence: number; messageId: string; markdown: string }) {
    return {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 't1',
        sequence: args.sequence,
        timestamp: '2026-08-07T12:00:03.000Z',
        event: {
          type: 'message' as const,
          role: 'assistant' as const,
          messageId: args.messageId,
          content: { markdown: args.markdown },
        },
      },
    };
  }

  function liveEnvelope(args: { sequence: number; event: Record<string, unknown> }) {
    return {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 't1',
        sequence: args.sequence,
        timestamp: '2026-08-07T12:00:03.000Z',
        event: args.event,
      },
    } as any;
  }

  function liveUserEnvelope(args: { sequence: number; messageId: string }) {
    return liveEnvelope({
      sequence: args.sequence,
      event: { type: 'message', role: 'user', messageId: args.messageId, content: { markdown: 'second' } },
    });
  }

  async function waitForMessageIds(expected: string[]): Promise<void> {
    const current = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    if (current && current.messages.map((message) => message.id).join() === expected.join()) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${expected.join(',')}`)), 1000);
      const unsubscribe = emitter.on('agent_chat.messages.updated', ({ data }) => {
        if (data.key !== 'local_session1') {
          return;
        }

        if (data.messages.map((message) => message.id).join() === expected.join()) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });
  }

  async function waitForGetEventsCalls(count: number): Promise<void> {
    if (getEvents.mock.calls.length >= count) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`timed out waiting for getEvents × ${count}`)), 1000);
      const timer = setInterval(() => {
        if (getEvents.mock.calls.length >= count) {
          clearTimeout(timeout);
          clearInterval(timer);
          resolve();
        }
      }, 0);
    });
  }

  async function openClaimedConversation(): Promise<void> {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });
    agentChat.subscribe();
  }

  it('on reconnect catch-up pulls newest events into open conversations', async () => {
    await openClaimedConversation();

    getEvents.mockResolvedValue(
      historyPage([
        { sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' },
        { sequence: 2, messageId: 'msg_asst_missed1', role: 'assistant', markdown: 'missed while offline' },
      ])
    );

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForMessageIds(['msg_user0000001', 'msg_asst_missed1']);

    expect(getEvents).toHaveBeenCalledWith({ conversationId: 'conv_abcdefghijkl' });
  });

  it('catch-up after send claims a conversation that received live events early', async () => {
    agentChat.subscribe();

    let sendStarted = false;
    let resolveSend!: (value: { identifier: string; messageId: string }) => void;
    sendMessage.mockImplementationOnce(() => {
      sendStarted = true;

      return new Promise((resolve) => {
        resolveSend = resolve;
      });
    });

    getEvents.mockResolvedValue(
      historyPage([
        { sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' },
        { sequence: 2, messageId: 'msg_asst_early001', role: 'assistant', markdown: 'beat the ack' },
      ])
    );

    const sent = agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (sendStarted) {
          resolve();

          return;
        }

        setTimeout(tick, 0);
      };

      tick();
    });

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({
        sequence: 2,
        messageId: 'msg_asst_early001',
        markdown: 'beat the ack',
      })
    );

    expect(agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' })?.messages).toHaveLength(1);

    resolveSend({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await sent;

    await waitForMessageIds(['msg_user0000001', 'msg_asst_early001']);
    expect(getEvents).toHaveBeenCalledWith({ conversationId: 'conv_abcdefghijkl' });
  });

  it('buffers live envelopes during catch-up and applies them after', async () => {
    await openClaimedConversation();

    let resolveEvents!: (value: ReturnType<typeof historyPage>) => void;
    getEvents.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvents = resolve;
        })
    );

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForGetEventsCalls(1);

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({
        sequence: 3,
        messageId: 'msg_asst_live001',
        markdown: 'arrived during catch-up',
      })
    );

    expect(agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' })?.messages).toHaveLength(1);

    resolveEvents(
      historyPage([
        { sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' },
        { sequence: 2, messageId: 'msg_asst_http001', role: 'assistant', markdown: 'from http catch-up' },
      ])
    );

    await waitForMessageIds(['msg_user0000001', 'msg_asst_http001', 'msg_asst_live001']);
  });

  it('does not duplicate envelopes already present in the catch-up page', async () => {
    await openClaimedConversation();

    let resolveEvents!: (value: ReturnType<typeof historyPage>) => void;
    getEvents.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvents = resolve;
        })
    );

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForGetEventsCalls(1);

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({
        sequence: 2,
        messageId: 'msg_asst_overlap1',
        markdown: 'same as http page',
      })
    );

    resolveEvents(
      historyPage([
        { sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' },
        { sequence: 2, messageId: 'msg_asst_overlap1', role: 'assistant', markdown: 'same as http page' },
      ])
    );

    await waitForMessageIds(['msg_user0000001', 'msg_asst_overlap1']);

    const assistant = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' })?.messages[1];
    expect(assistant?.parts).toEqual([{ type: 'text', text: 'same as http page', state: 'done' }]);
  });

  it('flushes buffered live envelopes when catch-up HTTP fails', async () => {
    await openClaimedConversation();

    let rejectEvents!: (error: Error) => void;
    getEvents.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectEvents = reject;
        })
    );

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForGetEventsCalls(1);

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({
        sequence: 2,
        messageId: 'msg_asst_flush001',
        markdown: 'kept after http failure',
      })
    );

    rejectEvents(new Error('getEvents failed'));
    await waitForMessageIds(['msg_user0000001', 'msg_asst_flush001']);
  });

  it('runs a second catch-up when reconnect arrives during an in-flight catch-up', async () => {
    await openClaimedConversation();

    const resolvers: Array<(value: ReturnType<typeof historyPage>) => void> = [];
    getEvents.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        })
    );

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForGetEventsCalls(1);

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });

    resolvers[0]!(
      historyPage([
        { sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' },
        { sequence: 2, messageId: 'msg_asst_first001', role: 'assistant', markdown: 'first catch-up' },
      ])
    );

    await waitForMessageIds(['msg_user0000001', 'msg_asst_first001']);
    await waitForGetEventsCalls(2);

    resolvers[1]!(
      historyPage([
        { sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' },
        { sequence: 2, messageId: 'msg_asst_first001', role: 'assistant', markdown: 'first catch-up' },
        { sequence: 3, messageId: 'msg_asst_second01', role: 'assistant', markdown: 'second catch-up' },
      ])
    );

    await waitForMessageIds(['msg_user0000001', 'msg_asst_first001', 'msg_asst_second01']);
  });

  it('reconnect catch-up preserves previously fetched older pages and olderCursor', async () => {
    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 3, messageId: 'msg_new0000001', role: 'user', markdown: 'recent' }], 'act_page0001')
    );
    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 1, messageId: 'msg_old0000001', role: 'user', markdown: 'older' }], 'act_older0001')
    );
    await agentChat.fetchMore({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    agentChat.subscribe();
    getEvents.mockClear();
    getEvents.mockResolvedValueOnce(
      historyPage(
        [
          { sequence: 3, messageId: 'msg_new0000001', role: 'user', markdown: 'recent' },
          { sequence: 4, messageId: 'msg_asst_missed1', role: 'assistant', markdown: 'missed while offline' },
        ],
        'act_page0001'
      )
    );

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForGetEventsCalls(1);
    await Promise.resolve();
    await Promise.resolve();

    const conversation = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(conversation?.messages.map((message) => message.id)).toEqual([
      'msg_old0000001',
      'msg_new0000001',
      'msg_asst_missed1',
    ]);
    expect(conversation?.hasMore).toBe(true);
    // Newest catch-up page already overlaps known sequence — do not walk olderCursor.
    expect(getEvents).toHaveBeenCalledTimes(1);
  });

  it('reconnect catch-up pages older events when the offline gap exceeds one page', async () => {
    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 1, messageId: 'msg_user0000001', role: 'user', markdown: 'hello' }], null)
    );
    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    agentChat.subscribe();
    getEvents.mockClear();

    getEvents.mockImplementation((args: { conversationId: string; before?: string }) => {
      if (!args.before) {
        return Promise.resolve(
          historyPage(
            [
              { sequence: 4, messageId: 'msg_asst_page2a', role: 'assistant', markdown: 'newest page a' },
              { sequence: 5, messageId: 'msg_asst_page2b', role: 'assistant', markdown: 'newest page b' },
            ],
            'act_mid0001'
          )
        );
      }

      expect(args.before).toBe('act_mid0001');

      return Promise.resolve(
        historyPage(
          [
            { sequence: 2, messageId: 'msg_asst_page1a', role: 'assistant', markdown: 'older missed a' },
            { sequence: 3, messageId: 'msg_asst_page1b', role: 'assistant', markdown: 'older missed b' },
          ],
          null
        )
      );
    });

    const expectedIds = ['msg_user0000001', 'msg_asst_page1a', 'msg_asst_page1b', 'msg_asst_page2a', 'msg_asst_page2b'];

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await waitForGetEventsCalls(2);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${expectedIds.join(',')}`)), 1000);
      const unsubscribe = emitter.on('agent_chat.messages.updated', ({ data }) => {
        if (data.messages.map((message) => message.id).join() === expectedIds.join()) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });

      const current = agentChat.getConversation({
        agentId: 'agent_1',
        conversationId: 'conv_abcdefghijkl',
      });
      if (current?.messages.map((message) => message.id).join() === expectedIds.join()) {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });

    expect(getEvents).toHaveBeenNthCalledWith(1, { conversationId: 'conv_abcdefghijkl' });
    expect(getEvents).toHaveBeenNthCalledWith(2, {
      conversationId: 'conv_abcdefghijkl',
      before: 'act_mid0001',
    });
  });

  it('does not catch up when nothing is subscribed', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    emitter.emit('socket.connect.resolved', { args: { socketUrl: 'http://127.0.0.1:8787' } });
    await Promise.resolve();

    expect(getEvents).not.toHaveBeenCalled();
  });

  it('does not catch up when socket connect resolves with an error', async () => {
    await openClaimedConversation();

    emitter.emit('socket.connect.resolved', {
      args: { socketUrl: 'http://127.0.0.1:8787' },
      error: new Error('connect failed'),
    });
    await Promise.resolve();

    expect(getEvents).not.toHaveBeenCalled();
  });

  it('loadConversation sets hasMore from olderCursor', async () => {
    getEvents.mockResolvedValue(
      historyPage([{ sequence: 3, messageId: 'msg_new0000001', role: 'user', markdown: 'recent' }], 'act_older0001')
    );

    const result = await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result.data?.hasMore).toBe(true);
    expect(agentChat.getConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' })?.hasMore).toBe(true);
  });

  it('fetchMore prepends older messages and advances the cursor', async () => {
    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 3, messageId: 'msg_new0000001', role: 'user', markdown: 'recent' }], 'act_page0001')
    );
    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 1, messageId: 'msg_old0000001', role: 'user', markdown: 'older' }], 'act_older0001')
    );

    const result = await agentChat.fetchMore({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(getEvents).toHaveBeenLastCalledWith({
      conversationId: 'conv_abcdefghijkl',
      before: 'act_page0001',
    });
    expect(result.data?.messages.map((message) => message.id)).toEqual(['msg_old0000001', 'msg_new0000001']);
    expect(result.data?.hasMore).toBe(true);
    expect(agentChat.getConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' })?.hasMore).toBe(true);
  });

  it('fetchMore no-ops when olderCursor is null and does not call getEvents', async () => {
    getEvents.mockResolvedValue(
      historyPage([{ sequence: 1, messageId: 'msg_only0000001', role: 'user', markdown: 'only page' }], null)
    );
    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    getEvents.mockClear();

    const result = await agentChat.fetchMore({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(getEvents).not.toHaveBeenCalled();
    expect(result.data?.hasMore).toBe(false);
    expect(result.data?.messages.map((message) => message.id)).toEqual(['msg_only0000001']);
  });

  it('fetchMore does not lower lastSequence so live envelopes still apply', async () => {
    getEvents.mockResolvedValueOnce(
      historyPage(
        [
          { sequence: 3, messageId: 'msg_new0000001', role: 'user', markdown: 'recent user' },
          { sequence: 4, messageId: 'msg_new0000002', role: 'assistant', markdown: 'recent assistant' },
        ],
        'act_page0001'
      )
    );
    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({
        sequence: 5,
        messageId: 'msg_live0000001',
        markdown: 'live after load',
      })
    );

    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 1, messageId: 'msg_old0000001', role: 'user', markdown: 'older user' }], null)
    );

    await agentChat.fetchMore({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({
        sequence: 6,
        messageId: 'msg_live0000002',
        markdown: 'live after fetchMore',
      })
    );

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });
    expect(snapshot?.messages.map((message) => message.id)).toEqual([
      'msg_old0000001',
      'msg_new0000001',
      'msg_new0000002',
      'msg_live0000001',
      'msg_live0000002',
    ]);
    expect(snapshot?.hasMore).toBe(false);
  });

  function approvalHistoryPage(approvalId: string) {
    return {
      events: [
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 1,
          timestamp: '2026-08-07T12:00:00.000Z',
          event: { type: 'run-start' as const },
        },
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 2,
          timestamp: '2026-08-07T12:00:01.000Z',
          event: { type: 'message-start' as const, messageId: 'msg_asst0000001' },
        },
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 3,
          timestamp: '2026-08-07T12:00:02.000Z',
          event: {
            type: 'tool-approval-request' as const,
            approvalId,
            toolUseId: 'tu_0000001',
            toolName: 'deleteOrder',
            input: { orderId: '123' },
            approveActionId: `tool-approval:approve:${approvalId}`,
            denyActionId: `tool-approval:deny:${approvalId}`,
          },
        },
        {
          version: AGENT_EVENT_PROTOCOL_VERSION,
          conversationId: 'internal',
          conversationIdentifier: 'conv_abcdefghijkl',
          agentId: 'agent_1',
          runId: 'history',
          turnId: 't1',
          sequence: 4,
          timestamp: '2026-08-07T12:00:03.000Z',
          event: { type: 'run-finish' as const, outcome: 'paused' as const },
        },
      ],
      olderCursor: null,
    };
  }

  it('loadConversation exposes messages that derive pending approvals after fold', async () => {
    getEvents.mockResolvedValue(approvalHistoryPage('approval_000001'));

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(derivePendingActions(snapshot?.messages ?? [])).toEqual([
      {
        type: 'tool-approval',
        id: 'approval_000001',
        approvalId: 'approval_000001',
        toolUseId: 'tu_0000001',
        toolName: 'deleteOrder',
        input: { orderId: '123' },
        approveActionId: 'tool-approval:approve:approval_000001',
        denyActionId: 'tool-approval:deny:approval_000001',
      },
    ]);
  });

  it('respondToAction POSTs echoed actionId and does not flip pending state optimistically', async () => {
    getEvents.mockResolvedValue(approvalHistoryPage('approval_000001'));
    respondToAction.mockResolvedValue({
      identifier: 'conv_abcdefghijkl',
    });

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    const result = await agentChat.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'approval_000001',
      decision: 'approved',
    });

    expect(result).toEqual({
      data: { conversationId: 'conv_abcdefghijkl' },
    });
    expect(respondToAction).toHaveBeenCalledWith({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'tool-approval:approve:approval_000001',
    });

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(derivePendingActions(snapshot?.messages ?? [])[0]?.type).toBe('tool-approval');
  });

  it('respondToAction POSTs trust-server action id when decision is trust-server', async () => {
    const page = approvalHistoryPage('approval_000001');
    const requestEvent = page.events[2]?.event as {
      type: 'tool-approval-request';
      trustToolActionId?: string;
      trustServerActionId?: string;
      source?: { type: 'mcp'; serverName: string };
    };
    requestEvent.trustToolActionId = 'mcp-approval:approve-tool:approval_000001:deleteOrder:GitHub';
    requestEvent.trustServerActionId = 'mcp-approval:approve-server:approval_000001:deleteOrder:GitHub';
    requestEvent.source = { type: 'mcp', serverName: 'GitHub' };
    getEvents.mockResolvedValue(page);
    respondToAction.mockResolvedValue({
      identifier: 'conv_abcdefghijkl',
    });

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    const result = await agentChat.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'approval_000001',
      decision: 'trust-server',
    });

    expect(result).toEqual({
      data: { conversationId: 'conv_abcdefghijkl' },
    });
    expect(respondToAction).toHaveBeenCalledWith({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'mcp-approval:approve-server:approval_000001:deleteOrder:GitHub',
    });
  });

  it('respondToAction resolves pending state only after tool-approval-response envelope', async () => {
    getEvents.mockResolvedValue(approvalHistoryPage('approval_000001'));
    respondToAction.mockResolvedValue({
      identifier: 'conv_abcdefghijkl',
    });

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    await agentChat.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'approval_000001',
      decision: 'approved',
    });

    emitter.emit('agent_chat.agent_event', {
      result: {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: 'internal',
        conversationIdentifier: 'conv_abcdefghijkl',
        agentId: 'agent_1',
        runId: 'run_1',
        turnId: 't1',
        sequence: 5,
        timestamp: '2026-08-07T12:00:04.000Z',
        event: {
          type: 'tool-approval-response',
          approvalId: 'approval_000001',
          decision: 'approved',
        },
      },
    });

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(derivePendingActions(snapshot?.messages ?? [])).toEqual([]);
    expect(snapshot?.messages[0]?.parts.find((part) => part.type === 'approval')).toMatchObject({
      approvalId: 'approval_000001',
      state: 'approved',
    });
  });

  it('respondToAction returns error without POST when pending approval is missing', async () => {
    getEvents.mockResolvedValue(approvalHistoryPage('approval_000001'));

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    const result = await agentChat.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'approval_missing',
      decision: 'denied',
    });

    expect(result.error).toBeDefined();
    expect(respondToAction).not.toHaveBeenCalled();
  });

  it('respondToAction returns error without POST when pending approval lacks action id', async () => {
    const page = approvalHistoryPage('approval_000001');
    const requestEvent = page.events[2]?.event as {
      type: 'tool-approval-request';
      approveActionId?: string;
      denyActionId?: string;
    };
    delete requestEvent.approveActionId;
    delete requestEvent.denyActionId;
    getEvents.mockResolvedValue(page);

    await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    const result = await agentChat.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'approval_000001',
      decision: 'denied',
    });

    expect(result.error).toBeDefined();
    expect(respondToAction).not.toHaveBeenCalled();
  });

  it('sendAction POSTs actionId, value, and sourceMessageId', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    sendAction.mockResolvedValue({ identifier: 'conv_abcdefghijkl' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hi', key: 'local_card' });
    const result = await agentChat.sendAction({
      agentId: 'agent_1',
      key: 'local_card',
      actionId: 'topic-billing',
      sourceMessageId: 'act_card0000001',
      value: 'billing',
    });

    expect(result).toEqual({ data: { conversationId: 'conv_abcdefghijkl' } });
    expect(sendAction).toHaveBeenCalledWith({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'topic-billing',
      sourceMessageId: 'act_card0000001',
      value: 'billing',
    });
  });

  it('sendAction returns error without POST when sourceMessageId is empty', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hi', key: 'local_card_empty' });
    const result = await agentChat.sendAction({
      agentId: 'agent_1',
      key: 'local_card_empty',
      actionId: 'topic-billing',
      sourceMessageId: '   ',
    });

    expect(result.error).toBeDefined();
    expect(sendAction).not.toHaveBeenCalled();
  });

  function recordChanges(key: string) {
    const changes: AgentChatChange[] = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key === key) {
        changes.push(data.change);
      }
    });

    return changes;
  }

  it('reports a live fold as new activity while a history page is in flight', async () => {
    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 3, messageId: 'msg_new0000001', role: 'user', markdown: 'recent' }], 'act_page0001')
    );
    await agentChat.loadConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    let resolveOlderPage!: (value: ReturnType<typeof historyPage>) => void;
    getEvents.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOlderPage = resolve;
        })
    );

    const changes = recordChanges('conv_abcdefghijkl');
    const older = agentChat.fetchMore({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({ sequence: 4, messageId: 'msg_live0000001', markdown: 'live during fetchMore' })
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.kind).toBe('live');
    expect(changes[0]?.addedMessages.map((message) => message.id)).toEqual(['msg_live0000001']);

    resolveOlderPage(
      historyPage([{ sequence: 1, messageId: 'msg_old0000001', role: 'user', markdown: 'older' }], null)
    );
    await older;

    expect(changes[1]?.kind).toBe('history');
    expect(changes[1]?.addedMessages.map((message) => message.id)).toEqual(['msg_old0000001']);
  });

  it('carries the envelope that caused a live fold', async () => {
    await openClaimedConversation();
    const changes = recordChanges('local_session1');

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({ sequence: 2, messageId: 'msg_asst0000001', markdown: 'live reply' })
    );

    const change = changes[0];
    expect(change?.kind === 'live' && change.envelope.sequence).toBe(2);
  });

  it('does not report an envelope the sequence gate drops', async () => {
    await openClaimedConversation();

    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({ sequence: 2, messageId: 'msg_asst0000001', markdown: 'live reply' })
    );

    const changes = recordChanges('local_session1');
    emitter.emit(
      'agent_chat.agent_event',
      liveAssistantEnvelope({ sequence: 2, messageId: 'msg_asst0000001', markdown: 'duplicate' })
    );

    expect(changes).toHaveLength(0);
  });

  it('reports a sent message once under the server id and never the optimistic id', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    const changes = recordChanges('local_session1');

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    expect(changes.map((change) => change.kind)).toEqual(['local', 'local']);
    expect(changes.map((change) => change.addedMessages.map((message) => message.id))).toEqual([
      [],
      ['msg_abcdefghijkl'],
    ]);
  });

  it('does not report a sent message twice when the live echo folds before the ack', async () => {
    await openClaimedConversation();

    let resolveSend!: (value: { identifier: string; messageId: string }) => void;
    sendMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    const changes = recordChanges('local_session1');
    const sent = agentChat.sendMessage({ agentId: 'agent_1', text: 'second', key: 'local_session1' });

    emitter.emit('agent_chat.agent_event', liveUserEnvelope({ sequence: 2, messageId: 'msg_user0000002' }));
    resolveSend({ identifier: 'conv_abcdefghijkl', messageId: 'msg_user0000002' });
    await sent;

    const reported = changes.flatMap((change) => change.addedMessages.map((message) => message.id));
    expect(reported.filter((id) => id === 'msg_user0000002')).toHaveLength(1);
  });

  it('reports no added message when a send fails', async () => {
    sendMessage.mockRejectedValue(new Error('network'));
    const changes = recordChanges('local_session1');

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    expect(changes.map((change) => change.kind)).toEqual(['local', 'local']);
    expect(changes.map((change) => change.addedMessages)).toEqual([[], []]);
  });

  it('reports a pending approval from history once across reloads', async () => {
    getEvents.mockResolvedValue(approvalHistoryPage('approval_000001'));
    const changes = recordChanges('conv_abcdefghijkl');

    await agentChat.loadConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });
    await agentChat.loadConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    expect(changes[0]?.newActions.map((action) => action.id)).toEqual(['approval_000001']);
    expect(changes[1]?.newActions).toEqual([]);
  });

  it('reports a live approval on the fold that raises it, adding no message', async () => {
    await openClaimedConversation();
    const changes = recordChanges('local_session1');

    emitter.emit(
      'agent_chat.agent_event',
      liveEnvelope({ sequence: 2, event: { type: 'message-start', messageId: 'msg_asst0000001' } })
    );
    emitter.emit(
      'agent_chat.agent_event',
      liveEnvelope({
        sequence: 3,
        event: {
          type: 'tool-approval-request',
          approvalId: 'approval_000001',
          toolUseId: 'tu_0000001',
          toolName: 'deleteOrder',
          input: { orderId: '123' },
          approveActionId: 'tool-approval:approve:approval_000001',
          denyActionId: 'tool-approval:deny:approval_000001',
        },
      })
    );

    expect(changes[0]?.newActions).toEqual([]);
    expect(changes[1]?.kind).toBe('live');
    expect(changes[1]?.addedMessages).toEqual([]);
    expect(changes[1]?.newActions.map((action) => action.id)).toEqual(['approval_000001']);
  });

  it('stays silent for an approval discovered by paging backwards', async () => {
    getEvents.mockResolvedValueOnce(
      historyPage([{ sequence: 9, messageId: 'msg_new0000001', role: 'user', markdown: 'recent' }], 'act_page0001')
    );
    await agentChat.loadConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    getEvents.mockResolvedValueOnce(approvalHistoryPage('approval_000001'));
    const changes = recordChanges('conv_abcdefghijkl');
    await agentChat.fetchMore({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', conversationId: 'conv_abcdefghijkl' });
    expect(derivePendingActions(snapshot?.messages ?? []).map((action) => action.id)).toEqual(['approval_000001']);
    expect(changes[0]?.kind).toBe('history');
    expect(changes[0]?.newActions).toEqual([]);
  });

  it('cancelRun posts to the server and does not call unsubscribe', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    cancelRun.mockResolvedValue({ status: 'canceled', runId: 'run_abc123' });

    const result = await agentChat.cancelRun({
      agentId: 'agent_1',
      key: 'local_session1',
      idempotencyKey: 'cancel_key_1',
    });

    expect(result).toEqual({ data: { status: 'canceled', runId: 'run_abc123' } });
    expect(cancelRun).toHaveBeenCalledWith({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      idempotencyKey: 'cancel_key_1',
      agentHash: undefined,
    });
  });

  it('sets isRunning false when a live run-finish aborted envelope arrives', () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    void agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });
    agentChat.subscribe();

    emitter.emit('agent_chat.agent_event', {
      result: liveEnvelope({
        sequence: 2,
        event: { type: 'run-start' },
      }),
    });

    emitter.emit('agent_chat.agent_event', {
      result: liveEnvelope({
        sequence: 3,
        event: { type: 'run-finish', outcome: 'aborted' },
      }),
    });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1', key: 'local_session1' });
    expect(snapshot?.isRunning).toBe(false);
  });

  it('cancelRun after complete is a safe client-side no-op response', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    cancelRun.mockResolvedValue({ status: 'no-op' });

    const result = await agentChat.cancelRun({ agentId: 'agent_1', key: 'local_session1' });

    expect(result).toEqual({ data: { status: 'no-op' } });
  });

  it('allows concurrent cancelRun and sendMessage without calling unsubscribe', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello', key: 'local_session1' });

    cancelRun.mockResolvedValue({ status: 'canceled', runId: 'run_abc123' });
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl2' });

    const [cancelResult, sendResult] = await Promise.all([
      agentChat.cancelRun({ agentId: 'agent_1', key: 'local_session1', idempotencyKey: 'cancel_concurrent' }),
      agentChat.sendMessage({ agentId: 'agent_1', text: 'follow up', key: 'local_session1' }),
    ]);

    expect(cancelResult).toEqual({ data: { status: 'canceled', runId: 'run_abc123' } });
    expect(sendResult.data?.conversationId).toBe('conv_abcdefghijkl');
    expect(cancelRun).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
