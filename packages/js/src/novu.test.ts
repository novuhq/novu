import { Novu } from './novu';

const mockSessionResponse = { data: { token: 'cafebabe' } };

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

beforeAll(() => jest.spyOn(global, 'fetch'));
afterAll(() => jest.restoreAllMocks());

describe('Novu', () => {
  const applicationIdentifier = 'foo';
  const subscriberId = 'bar';

  beforeEach(() => {
    // @ts-ignore
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
        body: JSON.stringify({ applicationIdentifier, subscriberId }),
        headers: {
          'Content-Type': 'application/json',
          'Novu-API-Version': '2024-06-26',
          'User-Agent': '@novu/js@test',
        },
      });

      const { data } = await novu.notifications.list(options);
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.novu.co/v1/inbox/notifications?limit=10', {
        method: 'GET',
        body: undefined,
        headers: {
          Authorization: 'Bearer cafebabe',
          'Content-Type': 'application/json',
          'Novu-API-Version': '2024-06-26',
          'User-Agent': '@novu/js@test',
        },
      });

      expect(data).toEqual({
        notifications: mockNotificationsResponse.data,
        hasMore: mockNotificationsResponse.hasMore,
        filter: mockNotificationsResponse.filter,
      });
    });
  });
});
