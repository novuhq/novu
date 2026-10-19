import { afterAll, beforeAll, beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
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

vi.mock('socket.io-client', () => {
  const mockIOFn = vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  }));
  return {
    __esModule: true,
    default: mockIOFn,
  };
});

beforeAll(() => {
  vi.spyOn(global, 'fetch');
});
afterAll(() => {
  vi.restoreAllMocks();
});

describe('Novu', () => {
  const applicationIdentifier = 'foo';
  const subscriberId = 'bar';

  beforeEach(() => {
    // @ts-expect-error
    global.fetch.mockImplementation(mockFetch) as Mock;
  });

  describe('http client', () => {
    test('should call the notifications.list after the session is initialized', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };

      const novu = new Novu({ applicationIdentifier, subscriberId });
      const [sessionUrl, sessionRequest] = (fetch as Mock).mock.calls[0];
      expect(sessionUrl).toBe('https://api.novu.co/v1/inbox/session');
      expect(sessionRequest.method).toBe('POST');
      expect(sessionRequest.headers).toEqual({
        'Novu-API-Version': '2024-06-26',
        'Novu-Client-Version': '@novu/js@test',
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(sessionRequest.body)).toMatchObject({ applicationIdentifier, subscriber: { subscriberId } });

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

      expect(data).toMatchObject({
        notifications: mockNotificationsResponse.data,
        hasMore: mockNotificationsResponse.hasMore,
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

      const mockIO = (await vi.importMock<typeof import('socket.io-client')>('socket.io-client')).default;
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
