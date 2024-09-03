import { ListNotificationsArgs } from './notifications';
import { Novu } from './novu';
import { NovuError } from './utils/errors';

const mockNotificationsResponse = {
  data: [],
  hasMore: true,
  filter: { tags: [], read: false, archived: false },
};

const post = jest.fn().mockResolvedValue({ token: 'token', profile: 'profile' });
const getFullResponse = jest.fn(() => mockNotificationsResponse);
const updateHeaders = jest.fn();
const setAuthorizationToken = jest.fn();

jest.mock('@novu/client', () => ({
  ...jest.requireActual('@novu/client'),
  HttpClient: jest.fn().mockImplementation(() => {
    const httpClient = {
      post,
      getFullResponse,
      updateHeaders,
      setAuthorizationToken,
    };

    return httpClient;
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
      const { data } = await novu.notifications.list(options);

      expect(post).toHaveBeenCalledTimes(1);
      expect(getFullResponse).toHaveBeenCalledWith('/inbox/notifications?limit=10');
      expect(data).toEqual({
        notifications: mockNotificationsResponse.data,
        hasMore: mockNotificationsResponse.hasMore,
        filter: mockNotificationsResponse.filter,
      });
    });

    test('should call the notifications.list right away when session is already initialized', async () => {
      const options: ListNotificationsArgs = {
        limit: 10,
        offset: 0,
      };
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      // await for session initialization
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      const { data } = await novu.notifications.list({ limit: 10, offset: 0 });

      expect(post).toHaveBeenCalledTimes(1);
      expect(getFullResponse).toHaveBeenCalledWith('/inbox/notifications?limit=10');
      expect(data).toEqual({
        notifications: mockNotificationsResponse.data,
        hasMore: mockNotificationsResponse.hasMore,
        filter: mockNotificationsResponse.filter,
      });
    });

    test('should reject the queued notifications.list if session initialization fails', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };
      const expectedError = 'reason';
      post.mockRejectedValueOnce(expectedError);
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });

      const { error } = await novu.notifications.list(options);

      expect(error).toEqual(new NovuError('Failed to initialize session, please contact the support', expectedError));
    });

    test('should reject the notifications.list right away when session initialization has failed', async () => {
      const options = {
        limit: 10,
        offset: 0,
      };
      const expectedError = 'reason';
      post.mockRejectedValueOnce(expectedError);
      const novu = new Novu({ applicationIdentifier: 'applicationIdentifier', subscriberId: 'subscriberId' });
      // await for session initialization
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      const { error } = await novu.notifications.list(options);

      expect(error).toEqual(new NovuError('Failed to initialize session, please contact the support', expectedError));
    });
  });
});
