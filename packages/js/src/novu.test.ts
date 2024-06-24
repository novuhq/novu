import { Novu } from './novu';

const mockFeedResponse = {
  data: [],
  hasMore: true,
  totalCount: 0,
  pageSize: 10,
  page: 1,
};

const initializeSession = jest.fn().mockResolvedValue({ token: 'token', profile: 'profile' });
const getNotificationsList = jest.fn(() => mockFeedResponse);

jest.mock('@novu/client', () => ({
  ...jest.requireActual('@novu/client'),
  ApiService: jest.fn().mockImplementation(() => {
    const apiService = {
      isAuthenticated: false,
      setAuthorizationToken: jest.fn(() => {
        apiService.isAuthenticated = true;
      }),
      getNotificationsList,
    };

    return apiService;
  }),
}));

jest.mock('./api/inbox-service', () => ({
  ...jest.requireActual('./api/inbox-service'),
  InboxService: jest.fn().mockImplementation(() => {
    const inboxService = {
      initializeSession,
    };

    return inboxService;
  }),
}));

describe('Novu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lazy session initialization', () => {
    test('should call the queued feeds.fetch after the session is initialized', async () => {
      const page = 1;
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      const res = await novu.feeds.fetch({ page });

      expect(initializeSession).toHaveBeenCalledTimes(1);
      expect(getNotificationsList).toHaveBeenCalledWith(page, {});
      expect(res).toEqual(mockFeedResponse);
    });

    test('should call the feeds.fetch right away when session is already initialized', async () => {
      const page = 1;
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      // await for session initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      const res = await novu.feeds.fetch({ page });

      expect(initializeSession).toHaveBeenCalledTimes(1);
      expect(getNotificationsList).toHaveBeenCalledWith(page, {});
      expect(res).toEqual(mockFeedResponse);
    });

    test('should reject the queued feeds.fetch if session initialization fails', async () => {
      const page = 1;
      const error = new Error('Failed to initialize session');
      initializeSession.mockRejectedValueOnce(error);
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });

      const fetchPromise = novu.feeds.fetch({ page });

      await expect(fetchPromise).rejects.toEqual(error);
    });

    test('should reject the feeds.fetch right away when session initialization has failed', async () => {
      const page = 1;
      const error = new Error('Failed to initialize session');
      initializeSession.mockRejectedValueOnce(error);
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      // await for session initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fetchPromise = novu.feeds.fetch({ page });

      await expect(fetchPromise).rejects.toEqual(error);
    });
  });
});
