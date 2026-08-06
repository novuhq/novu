import { AgentChatService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { AgentChat } from './agent-chat';

describe('AgentChat', () => {
  const inboxServiceInstance = { isSessionInitialized: true } as any;
  let emitter: NovuEventEmitter;
  let sendMessage: jest.Mock;
  let agentChat: AgentChat;

  beforeEach(() => {
    emitter = new NovuEventEmitter();
    sendMessage = jest.fn();
    const agentChatService = { sendMessage } as unknown as AgentChatService;
    agentChat = new AgentChat({
      inboxServiceInstance,
      eventEmitterInstance: emitter,
      agentChatService,
    });
  });

  it('appends an optimistic user message then marks it sent', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl' });
    const updates: Array<{ messages: Array<{ status: string; role: string }> }> = [];
    emitter.on('agent_chat.messages.updated', ({ data }) => {
      updates.push({ messages: data.messages.map((m) => ({ status: m.status, role: m.role })) });
    });

    const result = await agentChat.sendMessage({ agentId: 'agent_1', text: 'hello' });

    expect(result).toEqual({ data: { conversationId: 'conv_abcdefghijkl' } });
    expect(updates[0]?.messages).toEqual([{ status: 'sending', role: 'user' }]);
    expect(updates[1]?.messages).toEqual([{ status: 'sent', role: 'user' }]);

    const snapshot = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });
    expect(snapshot?.messages).toHaveLength(1);
    expect(snapshot?.messages[0]).toMatchObject({
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
    let resolveFirst!: (value: { identifier: string }) => void;
    let resolveSecond!: (value: { identifier: string }) => void;
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

    resolveFirst({ identifier: 'conv_abcdefghijkl' });
    resolveSecond({ identifier: 'conv_abcdefghijkl' });

    await expect(first).resolves.toEqual({ data: { conversationId: 'conv_abcdefghijkl' } });
    await expect(second).resolves.toEqual({ data: { conversationId: 'conv_abcdefghijkl' } });

    const byAgent = agentChat.getConversation({ agentId: 'agent_1' });
    const byId = agentChat.getConversation({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(byAgent?.messages).toHaveLength(2);
    expect(byAgent?.messages.map((m) => m.status)).toEqual(['sent', 'sent']);
    expect(byAgent?.messages.map((m) => m.parts[0])).toEqual([
      { type: 'text', text: 'one', state: 'done' },
      { type: 'text', text: 'two', state: 'done' },
    ]);
    expect(byId?.messages).toEqual(byAgent?.messages);
    expect(byAgent?.conversationId).toBe('conv_abcdefghijkl');
  });

  it('returns retained messages for agentId after adopt without conversationId prop', async () => {
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl' });

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
    sendMessage.mockResolvedValue({ identifier: 'conv_abcdefghijkl' });

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
});
