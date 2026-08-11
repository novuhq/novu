import { AgentChatService } from './agent-chat-service';
import { HttpClient } from './http-client';

describe('AgentChatService', () => {
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
      'https://test.novu.co/v1/web-chat/conversations',
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
      'https://test.novu.co/v1/web-chat/conversations',
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
      'https://test.novu.co/v1/web-chat/conversations',
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
      'https://test.novu.co/v1/web-chat/conversations/conv_abcdefghijkl/events',
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

    const result = await service.respondToApproval({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'tool-approval:approve:approval_000001',
    });

    expect(result).toEqual({ identifier: 'conv_abcdefghijkl' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/web-chat/conversations',
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
      'https://test.novu.co/v1/web-chat/conversations/conv_abcdefghijkl/events?before=act_page0001&limit=50',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
