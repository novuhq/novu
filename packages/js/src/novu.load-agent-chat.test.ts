import { createBoundAgentChat } from './agent-chat/bind-agent-chat';
import { loadAgentChat, Novu } from './index';

const sessionToken = 'cafebabe';
const mockSessionResponse = { data: { token: sessionToken } };

const mockNotificationsResponse = {
  data: [],
  hasMore: true,
  filter: { tags: [], read: false, archived: false },
};

async function mockFetch(url: string) {
  if (url.includes('/session')) {
    return {
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    };
  }
  if (url.includes('/notifications')) {
    return {
      ok: true,
      status: 200,
      json: async () => mockNotificationsResponse,
    };
  }
  throw new Error(`Unmocked request: ${url}`);
}

jest.mock('socket.io-client', () => {
  const mockIOFn = jest.fn(() => ({
    on: jest.fn(),
    disconnect: jest.fn(),
  }));
  return {
    __esModule: true,
    default: mockIOFn,
  };
});

jest.mock('./agent-chat/bind-agent-chat', () => ({
  createBoundAgentChat: jest.fn(),
}));

const mockCreateBoundAgentChat = jest.mocked(createBoundAgentChat);

function mockAgentChatInstance() {
  return {
    clearCache: jest.fn(),
    conversation: jest.fn(() => ({ ok: true, data: { dispose: jest.fn() } })),
  };
}

beforeAll(() => jest.spyOn(global, 'fetch'));
afterAll(() => jest.restoreAllMocks());

describe('Novu.loadAgentChat', () => {
  const applicationIdentifier = 'foo';
  const subscriberId = 'bar';

  beforeEach(() => {
    mockCreateBoundAgentChat.mockReset();
    mockCreateBoundAgentChat.mockReturnValue(mockAgentChatInstance() as never);
    // @ts-expect-error
    global.fetch.mockImplementation(mockFetch);
  });

  test('agentChat throws before loadAgentChat completes', () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    expect(() => novu.agentChat).toThrow('Agent Chat is not loaded');
  });

  test('loadAgentChat resolves to AgentChat and named export delegates to it', async () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    const agentChat = await novu.loadAgentChat();
    const namedExportResult = await loadAgentChat(novu);

    expect(agentChat).toBe(namedExportResult);
    expect(agentChat.conversation).toBeDefined();
    expect(() => novu.agentChat).not.toThrow();
    expect(novu.agentChat).toBe(agentChat);
  });

  test('loadAgentChat is idempotent for successful loads', async () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    const [first, second] = await Promise.all([novu.loadAgentChat(), novu.loadAgentChat()]);

    expect(first).toBe(second);
    expect(mockCreateBoundAgentChat).toHaveBeenCalledTimes(1);
  });

  test('loadAgentChat clears the cached promise after failure so a later call can retry', async () => {
    mockCreateBoundAgentChat
      .mockImplementationOnce(() => {
        throw new Error('agent module load failed');
      })
      .mockReturnValue(mockAgentChatInstance() as never);

    const novu = new Novu({ applicationIdentifier, subscriberId });

    await expect(novu.loadAgentChat()).rejects.toThrow('agent module load failed');
    await expect(novu.loadAgentChat()).resolves.toMatchObject({
      conversation: expect.any(Function),
    });
    expect(mockCreateBoundAgentChat).toHaveBeenCalledTimes(2);
  });

  test('supports combined Inbox and Agent Chat on one Novu instance', async () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    const notifications = await novu.notifications.list({ limit: 10 });
    const agentChat = await novu.loadAgentChat();

    expect(notifications.data?.notifications).toEqual([]);
    expect(agentChat.conversation({ agentId: 'agent_1' }).ok).toBe(true);
    expect(novu.notifications).toBeDefined();
    expect(novu.socket).toBeDefined();
  });
});
