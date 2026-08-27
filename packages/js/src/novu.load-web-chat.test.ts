import { createBoundWebChat } from './web-chat/bind-web-chat';
import { loadWebChat, Novu } from './index';

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

jest.mock('./web-chat/bind-web-chat', () => ({
  createBoundWebChat: jest.fn(),
}));

const mockCreateBoundWebChat = jest.mocked(createBoundWebChat);

function mockWebChatInstance() {
  return {
    clearCache: jest.fn(),
    conversation: jest.fn(() => ({ ok: true, data: { dispose: jest.fn() } })),
  };
}

beforeAll(() => jest.spyOn(global, 'fetch'));
afterAll(() => jest.restoreAllMocks());

describe('Novu.loadWebChat', () => {
  const applicationIdentifier = 'foo';
  const subscriberId = 'bar';

  beforeEach(() => {
    mockCreateBoundWebChat.mockReset();
    mockCreateBoundWebChat.mockReturnValue(mockWebChatInstance() as never);
    // @ts-expect-error
    global.fetch.mockImplementation(mockFetch);
  });

  test('webChat throws before loadWebChat completes', () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    expect(novu.isWebChatLoaded).toBe(false);
    expect(() => novu.webChat).toThrow('Web Chat is not loaded');
  });

  test('loadWebChat resolves to WebChat and named export delegates to it', async () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    const webChat = await novu.loadWebChat();
    const namedExportResult = await loadWebChat(novu);

    expect(webChat).toBe(namedExportResult);
    expect(webChat.conversation).toBeDefined();
    expect(novu.isWebChatLoaded).toBe(true);
    expect(() => novu.webChat).not.toThrow();
    expect(novu.webChat).toBe(webChat);
  });

  test('loadWebChat is idempotent for successful loads', async () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    const [first, second] = await Promise.all([novu.loadWebChat(), novu.loadWebChat()]);

    expect(first).toBe(second);
    expect(mockCreateBoundWebChat).toHaveBeenCalledTimes(1);
  });

  test('loadWebChat clears the cached promise after failure so a later call can retry', async () => {
    mockCreateBoundWebChat
      .mockImplementationOnce(() => {
        throw new Error('agent module load failed');
      })
      .mockReturnValue(mockWebChatInstance() as never);

    const novu = new Novu({ applicationIdentifier, subscriberId });

    await expect(novu.loadWebChat()).rejects.toThrow('agent module load failed');
    await expect(novu.loadWebChat()).resolves.toMatchObject({
      conversation: expect.any(Function),
    });
    expect(mockCreateBoundWebChat).toHaveBeenCalledTimes(2);
  });

  test('supports combined Inbox and Web Chat on one Novu instance', async () => {
    const novu = new Novu({ applicationIdentifier, subscriberId });

    const notifications = await novu.notifications.list({ limit: 10 });
    const webChat = await novu.loadWebChat();

    expect(notifications.data?.notifications).toEqual([]);
    expect(webChat.conversation({ agentId: 'agent_1' }).ok).toBe(true);
    expect(novu.notifications).toBeDefined();
    expect(novu.socket).toBeDefined();
  });
});
