import { Novu } from './novu';

const sessionToken = 'cafebabe';
const mockSessionResponse = { data: { token: sessionToken } };

const mockNotificationsResponse = {
  data: [],
  hasMore: true,
  filter: { tags: [], read: false, archived: false },
};

async function mockFetch(url: string, reqInit: Request) {
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

beforeAll(() => jest.spyOn(global, 'fetch'));
afterAll(() => jest.restoreAllMocks());

describe('Novu', () => {
  const applicationIdentifier = 'foo';
  const subscriberId = 'bar';

  beforeEach(() => {
    // @ts-expect-error
    global.fetch.mockImplementation(mockFetch) as jest.Mock;
  });

  describe('http client', () => {
    test('should call the notifications.list after the session is initialized', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };

      const novu = new Novu({ applicationIdentifier, subscriberId });
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.novu.co/v1/inbox/session', {
        method: 'POST',
        body: JSON.stringify({ applicationIdentifier, subscriber: { subscriberId } }),
        headers: {
          'Novu-API-Version': '2024-06-26',
          'Novu-Client-Version': '@novu/js@test',
          'Content-Type': 'application/json',
        },
      });

      const { data } = await novu.notifications.list(options);
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.novu.co/v1/inbox/notifications?limit=10', {
        method: 'GET',
        body: undefined,
        headers: {
          'Novu-API-Version': '2024-06-26',
          'Novu-Client-Version': '@novu/js@test',
          'Content-Type': 'application/json',
          Authorization: 'Bearer cafebabe',
        },
      });

      expect(data).toEqual({
        notifications: mockNotificationsResponse.data,
        hasMore: mockNotificationsResponse.hasMore,
        filter: mockNotificationsResponse.filter,
      });
    });
  });

  describe('socket options', () => {
    test('should initialize socket.io with socketOptions when provided', async () => {
      const socketUrl = 'https://custom-socket.example.com';
      const socketOptions = {
        path: '/custom-socket-path',
        reconnectionDelay: 5000,
      };

      const novu = new Novu({
        applicationIdentifier,
        subscriberId,
        socketUrl,
        socketOptions,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await novu.socket.connect();

      const mockIO = jest.requireMock('socket.io-client').default;
      expect(mockIO).toHaveBeenCalledWith(
        socketUrl,
        expect.objectContaining({
          path: '/custom-socket-path',
          reconnectionDelay: 5000,
          reconnectionDelayMax: 10000,
          transports: ['websocket'],
          query: {
            token: sessionToken,
          },
        })
      );
    });
  });
});
