import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';

describe('AgentChat', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;
  let emitter: NovuEventEmitter;
  let sendMessage: jest.Mock;
  let getEvents: jest.Mock;
  let agentChat: AgentChat;

  beforeEach(() => {
    emitter = new NovuEventEmitter();
    sendMessage = jest.fn();
    getEvents = jest.fn();
    const agentChatService = { sendMessage, getEvents } as unknown as AgentChatService;
    agentChat = new AgentChat({
      inboxServiceInstance,
      eventEmitterInstance: emitter,
      agentChatService,
    });
  });

  it('appends an optimistic user message then marks it sent with server messageId', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    const updates: Array<{ messages: Array<{ id: string; status: string; role: string }> }> = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      updates.push({ messages: data.messages.map((m) => ({ id: m.id, status: m.status, role: m.role })) });
    });

    const result = await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello' });

    expect(result).toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' },
    });
    expect(updates[0]?.messages[0]?.status).toBe('sending');
    expect(updates[0]?.messages[0]?.id).toMatch(/^opt_/);
    expect(updates[1]?.messages).toEqual([{ id: 'msg_abcdefghijkl', status: 'sent', role: 'user' }]);

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(snapshot?.messages).toHaveLength(1);
    expect(snapshot?.messages[0]).toMatchObject({
      id: 'msg_abcdefghijkl',
      role: 'user',
      status: 'sent',
      parts: [{ type: 'text', text: 'hello', state: 'done' }],
    });
  });

  it('marks the optimistic message failed when the request errors', async () => {
    sendMessage.mockRejectedValue(new Error('network'));

    const result = await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello' });

    expect(result.error).toBeDefined();
    const snapshot = agentChat.getConversation({ agentId: 'agent_1' });
    expect(snapshot?.messages[0]?.status).toBe('failed');
  });

  it('keeps both messages sent when two sends race before conversationId exists', async () => {
    let resolveFirst!: (value: { identifier: string; messageId: string }) => void;
    let resolveSecond!: (value: { identifier: string; messageId: string }) => void;
    sendMessage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const first = agentChat.sendMessage({ agentId: 'agent_1', text: 'one' });
    const second = agentChat.sendMessage({ agentId: 'agent_1', text: 'two' });

    resolveFirst({ identifier: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' });
    resolveSecond({ identifier: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' });

    await expect(first).resolves.toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_aaaaaaaaaaaa' },
    });
    await expect(second).resolves.toEqual({
      data: { conversationId: 'conv_abcdefghijkl', messageId: 'msg_bbbbbbbbbbbb' },
    });

    const byAgent = agentChat.getConversation({ agentId: 'agent_1' });
    const byId = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(byAgent?.messages).toHaveLength(2);
    expect(byAgent?.messages.map((m) => m.status)).toEqual(['sent', 'sent']);
    expect(byAgent?.messages.map((m) => m.id)).toEqual(['msg_aaaaaaaaaaaa', 'msg_bbbbbbbbbbbb']);
    expect(byAgent?.messages.map((m) => m.parts[0])).toEqual([
      { type: 'text', text: 'one', state: 'done' },
      { type: 'text', text: 'two', state: 'done' },
    ]);
    expect(byId?.messages).toEqual(byAgent?.messages);
    expect(byAgent?.conversationId).toBe('conv_abcdefghijkl');
  });

  it('returns retained messages for agentId after adopt without conversationId prop', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello' });

    const snapshot = agentChat.getConversation({ agentId: 'agent_1' });
    expect(snapshot?.conversationId).toBe('conv_abcdefghijkl');
    expect(snapshot?.messages).toHaveLength(1);
    expect(snapshot?.messages[0]).toMatchObject({
      status: 'sent',
      parts: [{ type: 'text', text: 'hello', state: 'done' }],
    });
  });

  it('clearCache drops retained conversation state', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });

    await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello' });
    agentChat.clearCache();

    expect(agentChat.getConversation({ agentId: 'agent_1' })).toBeUndefined();
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
      hasMore: false,
      next: null,
      previous: null,
    });

    const result = await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result.data?.hasMore).toBe(false);
    expect(result.data?.messages).toHaveLength(2);
    expect(result.data?.messages[0]).toMatchObject({
      id: 'msg_user0000001',
      role: 'user',
      parts: [{ type: 'text', text: 'prior question', state: 'done' }],
    });
    expect(result.data?.messages[1]).toMatchObject({
      id: 'msg_asst0000001',
      role: 'assistant',
      parts: [{ type: 'text', text: 'prior answer', state: 'done' }],
    });

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(snapshot?.messages).toEqual(result.data?.messages);
  });

  it('loadConversation replaces optimistic local state with server history', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl', messageId: 'msg_local000001' });
    await agentChat.sendMessage({ agentId: 'agent_1', text: 'stale local' });

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
      hasMore: true,
      next: null,
      previous: 'act_older',
    });

    const result = await agentChat.loadConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result.data?.hasMore).toBe(true);
    expect(result.data?.messages).toHaveLength(1);
    expect(result.data?.messages[0]).toMatchObject({
      id: 'msg_server00001',
      parts: [{ type: 'text', text: 'from server', state: 'done' }],
    });
  });
});
