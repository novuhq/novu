import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { WebChatService } from './web-chat-service';
import { HttpClient } from './http-client';

describe('WebChatService', () => {
  it('throws WebChatPlanLimitError on 402 accept response', async () => {
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
    const service = new WebChatService({ httpClient });

    await expect(service.sendMessage({ agentId: 'agent_1', text: 'hello' })).rejects.toMatchObject({
      name: 'WebChatPlanLimitError',
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
    const service = new WebChatService({ httpClient });

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
    const service = new WebChatService({ httpClient });

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
    const service = new WebChatService({ httpClient });

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

  it('GETs conversations with the session token already on the client', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ identifier: 'conv_abcdefghijkl', title: 'Billing' }],
        next: null,
        previous: null,
      }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const httpClient = new HttpClient({ apiUrl: 'https://test.novu.co' });
    httpClient.setAuthorizationToken('session-token');
    const service = new WebChatService({ httpClient });

    const result = await service.listConversations({ limit: 5, orderBy: 'lastActivityAt', orderDirection: 'DESC' });

    expect(result.conversations).toEqual([{ identifier: 'conv_abcdefghijkl', title: 'Billing' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/web-chat/conversations?limit=5&orderBy=lastActivityAt&orderDirection=DESC',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
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
    const service = new WebChatService({ httpClient });

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
    const service = new WebChatService({ httpClient });

    const result = await service.respondToAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'tool-approval:approve:approval_000001',
      idempotencyKey: 'idem_abcdefghijkl',
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
          idempotencyKey: 'idem_abcdefghijkl',
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
    const service = new WebChatService({ httpClient });

    const result = await service.sendAction({
      agentId: 'agent_1',
      conversationId: 'conv_abcdefghijkl',
      actionId: 'topic-billing',
      sourceMessageId: 'act_card0000001',
      value: 'billing',
      idempotencyKey: 'idem_billing0001',
    });

    expect(result).toEqual({ identifier: 'conv_abcdefghijkl' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/web-chat/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          agentId: 'agent_1',
          conversationIdentifier: 'conv_abcdefghijkl',
          actionId: 'topic-billing',
          sourceMessageId: 'act_card0000001',
          value: 'billing',
          idempotencyKey: 'idem_billing0001',
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
    const service = new WebChatService({ httpClient });

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

  it('skips invalid envelopes in history pages', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
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
    const service = new WebChatService({ httpClient });

    const result = await service.getEvents({
      conversationId: 'conv_abcdefghijkl',
    });

    expect(result).toEqual({ events: [], olderCursor: null });
    expect(warnSpy).toHaveBeenCalledWith('[novu web-chat] skipping history envelope:', 'invalid-schema');
    warnSpy.mockRestore();
  });
});
