import { ListNotificationsArgs } from './notifications';
import { Novu } from './novu';

const mockNotificationsResponse = {
  data: [],
  hasMore: true,
  filter: { tags: [], read: false, archived: false },
};

const initializeSession = jest.fn().mockResolvedValue({ token: 'token', profile: 'profile' });
const getNotificationsList = jest.fn(() => mockNotificationsResponse);
const fetchNotifications = jest.fn(() => mockNotificationsResponse);

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
      fetchNotifications,
    };

    return inboxService;
  }),
}));

describe('Novu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lazy session initialization', () => {
    test('should call the queued notifications.list after the session is initialized', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      const res = await novu.notifications.list(options);

      expect(initializeSession).toHaveBeenCalledTimes(1);
      expect(fetchNotifications).toHaveBeenCalledWith(options);
      expect(res).toEqual(mockNotificationsResponse);
    });

    test('should call the notifications.list right away when session is already initialized', async () => {
      const options: ListNotificationsArgs = {
        limit: 10,
        offset: 0,
      };
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      // await for session initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      const res = await novu.notifications.list({ limit: 10, offset: 0 });

      expect(initializeSession).toHaveBeenCalledTimes(1);
      expect(fetchNotifications).toHaveBeenCalledWith(options);
      expect(res).toEqual(mockNotificationsResponse);
    });

    test('should reject the queued notifications.list if session initialization fails', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };
      const error = new Error('Failed to initialize session');
      initializeSession.mockRejectedValueOnce(error);
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });

      const fetchPromise = novu.notifications.list(options);

      await expect(fetchPromise).rejects.toEqual(error);
    });

    test('should reject the notifications.list right away when session initialization has failed', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };
      const error = new Error('Failed to initialize session');
      initializeSession.mockRejectedValueOnce(error);
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      // await for session initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fetchPromise = novu.notifications.list(options);

      await expect(fetchPromise).rejects.toEqual(error);
    });
  });
});
