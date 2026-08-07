import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';

describe('AgentChat', () => {
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
    const agentChatService = { sendMessage, getEvents } as unknown as AgentChatService;
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
    }>
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
      olderCursor: null,
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
});
