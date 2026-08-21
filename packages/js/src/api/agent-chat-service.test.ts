import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { AgentChatService } from './agent-chat-service';
import { HttpClient } from './http-client';

describe('AgentChatService', () => {
  it('throws AgentChatPlanLimitError on 402 accept response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({
        reason: 'agents',
        message: 'Upgrade your plan to activate this agent.',
      }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    httpClient.setAuthorizationToken('test-token');
    const service = new AgentChatService({ httpClient });

    await expect(service.sendMessage({ agentId: 'agent_1', text: 'hello' })).rejects.toMatchObject({
      name: 'AgentChatPlanLimitError',
      reason: 'agents',
      message: 'Upgrade your plan to activate this agent.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POSTs a new conversation message', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' } }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    httpClient.setAuthorizationToken('test-token');
    const service = new AgentChatService({ httpClient });

    const result = await service.sendMessage({ agentId: 'agent_1', text: 'hello' });

    expect(result).toEqual({ identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent_1', text: 'hello' }),
      })
    );
  });

  it('includes conversationIdentifier when resuming', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' } }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    const service = new AgentChatService({ httpClient });

    await service.sendMessage({
      agentId: 'agent_1',
      text: 'again',
      conversationId: 'conv_abcdefghijkl',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations',
      expect.objectContaining({
        body: JSON.stringify({
          agentId: 'agent_1',
          text: 'again',
          conversationIdentifier: 'conv_abcdefghijkl',
        }),
      })
    );
  });

  it('includes agentHash when provided', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' } }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    const service = new AgentChatService({ httpClient });

    await service.sendMessage({
      agentId: 'agent_1',
      text: 'hello',
      agentHash: 'signed-agent-hash',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations',
      expect.objectContaining({
        body: JSON.stringify({
          agentId: 'agent_1',
          text: 'hello',
          agentHash: 'signed-agent-hash',
        }),
      })
    );
  });

  it('GETs conversation events', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          events: [],
          olderCursor: null,
        },
      }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    const service = new AgentChatService({ httpClient });

    const result = await service.getEvents({
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result).toEqual({ events: [], olderCursor: null });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations/conv_abcdefghijkl/events',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('POSTs approval decision by echoing actionId', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { identifier: 'conv_abcdefghijkl' } }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    httpClient.setAuthorizationToken('test-token');
    const service = new AgentChatService({ httpClient });

    const result = await service.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'tool-approval:approve:approval_000001',
    });

    expect(result).toEqual({ identifier: 'conv_abcdefghijkl' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          agentId: 'agent_1',
          conversationIdentifier: 'conv_abcdefghijkl',
          actionId: 'tool-approval:approve:approval_000001',
        }),
      })
    );
  });

  it('POSTs a Card button action with sourceMessageId and value', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { identifier: 'conv_abcdefghijkl' } }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    httpClient.setAuthorizationToken('test-token');
    const service = new AgentChatService({ httpClient });

    const result = await service.sendAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'topic-billing',
      sourceMessageId: 'act_card0000001',
      value: 'billing',
    });

    expect(result).toEqual({ identifier: 'conv_abcdefghijkl' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          agentId: 'agent_1',
          conversationIdentifier: 'conv_abcdefghijkl',
          actionId: 'topic-billing',
          sourceMessageId: 'act_card0000001',
          value: 'billing',
        }),
      })
    );
  });

  it('GETs older conversation events with before cursor', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          events: [],
          olderCursor: 'act_older0001',
        },
      }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    const service = new AgentChatService({ httpClient });

    const result = await service.getEvents({
      conversationId: 'conv_abcdefghijkl',
      before: 'act_page0001',
      limit: 50,
    });

    expect(result).toEqual({ events: [], olderCursor: 'act_older0001' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agent-chat/conversations/conv_abcdefghijkl/events?before=act_page0001&limit=50',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('rejects invalid history payloads', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          events: [{ version: AGENT_EVENT_PROTOCOL_VERSION, event: { type: 'run-start' } }],
          olderCursor: null,
        },
      }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    const service = new AgentChatService({ httpClient });

    await expect(
      service.getEvents({
        conversationId: 'conv_abcdefghijkl',
      })
    ).rejects.toThrow('Agent event envelope failed schema validation');
  });
});
