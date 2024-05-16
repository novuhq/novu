import {
  ApiService,
  IUserGlobalPreferenceSettings,
  IUserPreferenceSettings,
} from '@novu/client';
import { WebSocketEventEnum } from '@novu/shared';
import io from 'socket.io-client';

import {
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  IMessage,
  IOrganizationEntity,
  ButtonTypeEnum,
  MessageActionStatusEnum,
} from '@novu/shared';
import { ISession } from '../utils/types';

import {
  HeadlessService,
  NOTIFICATION_CENTER_TOKEN_KEY,
} from './headless.service';

const promiseResolveTimeout = (ms: number, arg: unknown = {}) =>
  new Promise((resolve) => setTimeout(resolve, ms, arg));

const promiseRejectTimeout = (ms: number, arg: unknown = {}) =>
  new Promise((resolve, reject) => setTimeout(reject, ms, arg));

const templateId = 'templateId';
const notificationId = 'notificationId';
const mockSession: ISession = {
  token: 'token',
  profile: {
    _id: '_id',
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    organizationId: 'organizationId?',
    environmentId: 'environmentId',
    aud: 'widget_user',
    subscriberId: '1234ABCD',
  },
};
const mockOrganization: IOrganizationEntity = {
  _id: '_id',
  name: 'mock organization',
  members: [],
};
const mockUnseenCount = { count: 99 };
const mockUnreadCount = { count: 101 };
const mockNotification: IMessage = {
  _id: notificationId,
  _templateId: templateId,
  _environmentId: '_environmentId',
  _organizationId: '_organizationId',
  _notificationId: '_notificationId',
  _subscriberId: '_subscriberId',
  templateIdentifier: 'templateIdentifier',
  content: 'content',
  channel: ChannelTypeEnum.IN_APP,
  seen: false,
  read: false,
  lastSeenDate: 'lastSeenDate',
  lastReadDate: 'lastReadDate',
  createdAt: 'createdAt',
  cta: {
    type: ChannelCTATypeEnum.REDIRECT,
    data: {},
    action: {
      status: MessageActionStatusEnum.PENDING,
      buttons: [{ type: ButtonTypeEnum.PRIMARY, content: 'button' }],
      result: {
        payload: {},
        type: ButtonTypeEnum.PRIMARY,
      },
    },
  },
  _feedId: '_feedId',
  payload: {},
};
const mockNotificationsList: Array<IMessage> = [mockNotification];

const mockUserPreferenceSetting: IUserPreferenceSettings = {
  template: { _id: templateId, name: 'mock template', critical: false },
  preference: {
    enabled: true,
    channels: {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    },
  },
};

const mockUserGlobalPreferenceSetting: IUserGlobalPreferenceSettings = {
  preference: {
    enabled: true,
    channels: {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    },
  },
};

const mockUserPreferences = [mockUserPreferenceSetting];

const mockServiceInstance = {
  initializeSession: jest.fn(() => promiseResolveTimeout(0, mockSession)),
  setAuthorizationToken: jest.fn(),
  disposeAuthorizationToken: jest.fn(),
  getOrganization: jest.fn(() => promiseResolveTimeout(0, mockOrganization)),
  getUnseenCount: jest.fn(() => promiseResolveTimeout(0, mockUnseenCount)),
  getUnreadCount: jest.fn(() => promiseResolveTimeout(0, mockUnreadCount)),
  getUserPreference: jest.fn(() =>
    promiseResolveTimeout(0, mockUserPreferences)
  ),
  getNotificationsList: jest.fn(() =>
    promiseResolveTimeout(0, mockNotificationsList)
  ),
  updateSubscriberPreference: jest.fn(() =>
    promiseResolveTimeout(0, mockUserPreferenceSetting)
  ),
  updateSubscriberGlobalPreference: jest.fn(() =>
    promiseResolveTimeout(0, mockUserGlobalPreferenceSetting)
  ),
  markMessageAs: jest.fn(),
  removeMessage: jest.fn(),
  removeMessages: jest.fn(),
  updateAction: jest.fn(),
  markAllMessagesAsRead: jest.fn(),
  markAllMessagesAsSeen: jest.fn(),
  removeAllMessages: jest.fn(),
};

jest.mock('@novu/client', () => ({
  ...jest.requireActual<typeof import('@novu/client')>('@novu/client'),
  ApiService: jest.fn().mockImplementation(() => mockServiceInstance),
}));

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  ...jest.requireActual<typeof import('socket.io-client')>('socket.io-client'),
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockSocket),
}));

jest.spyOn(Storage.prototype, 'getItem');
jest.spyOn(Storage.prototype, 'setItem');
jest.spyOn(Storage.prototype, 'removeItem');
Storage.prototype.getItem = jest.fn();
Storage.prototype.setItem = jest.fn();
Storage.prototype.removeItem = jest.fn();

describe('headless.service', () => {
  const options = {
    backendUrl: 'http://127.0.0.1:3000',
    socketUrl: 'http://127.0.0.1:3001',
    applicationIdentifier: 'applicationIdentifier',
    subscriberId: 'subscriberId',
    subscriberHash: 'subscriberHash',
    config: {
      retry: 0,
      retryDelay: 0,
    },
  };

  describe('constructor', () => {
    test('sets the options', () => {
      const headlessService = new HeadlessService(options);

      expect(ApiService).toHaveBeenCalledWith(options.backendUrl);
      expect((headlessService as any).options).toEqual(options);
      expect((headlessService as any).queryClient).not.toBeUndefined();
      expect((headlessService as any).queryService).not.toBeUndefined();
      expect(localStorage.getItem).toHaveBeenCalledWith(
        NOTIFICATION_CENTER_TOKEN_KEY
      );
    });

    test.skip('when there is no token should call disposeAuthorizationToken', () => {
      expect(localStorage.getItem).toHaveBeenCalledWith(
        NOTIFICATION_CENTER_TOKEN_KEY
      );
      expect(mockServiceInstance.disposeAuthorizationToken).toBeCalledTimes(1);
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        NOTIFICATION_CENTER_TOKEN_KEY
      );
    });

    test.skip('when there is a token should call setAuthorizationToken', () => {
      const mockToken = 'mock-token';
      jest.spyOn(Storage.prototype, 'setItem');
      Storage.prototype.getItem = jest
        .fn()
        .mockImplementationOnce(() => mockToken);

      expect(mockServiceInstance.setAuthorizationToken).toHaveBeenCalledWith(
        mockToken
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        NOTIFICATION_CENTER_TOKEN_KEY,
        mockToken
      );
    });
  });

  describe('initializeSession', () => {
    test('calls initializeSession successfully', async () => {
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onSuccess = jest.fn();

      headlessService.initializeSession({
        listener,
        onSuccess,
      });
      expect((headlessService as any).session).toBeNull();
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.initializeSession).toBeCalledTimes(1);
      expect((headlessService as any).session).toEqual(mockSession);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        NOTIFICATION_CENTER_TOKEN_KEY,
        mockSession.token
      );
      expect(mockServiceInstance.setAuthorizationToken).toHaveBeenCalledWith(
        mockSession.token
      );
      expect(io).toHaveBeenNthCalledWith(
        1,
        options.socketUrl,
        expect.objectContaining({
          reconnectionDelayMax: 10000,
          transports: ['websocket'],
          query: {
            token: `${mockSession.token}`,
          },
        })
      );
      expect(mockSocket.on).toHaveBeenNthCalledWith(
        1,
        'connect_error',
        expect.any(Function)
      );
      expect(onSuccess).toHaveBeenNthCalledWith(1, mockSession);
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.initializeSession.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();

      headlessService.initializeSession({
        listener,
        onError,
      });
      expect((headlessService as any).session).toBeNull();
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.initializeSession).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect((headlessService as any).session).toBeNull();
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('fetchOrganization', () => {
    test('calls fetchOrganization successfully', async () => {
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchOrganization({
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getOrganization).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, mockOrganization);
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.getOrganization.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchOrganization({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getOrganization).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('fetchUnseenCount', () => {
    test('calls fetchUnseenCount successfully', async () => {
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchUnseenCount({
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, mockUnseenCount);
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.getUnseenCount.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchUnseenCount({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('fetchUnreadCount', () => {
    test('calls fetchUnreadCount successfully', async () => {
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchUnreadCount({
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getUnreadCount).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, mockUnreadCount);
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.getUnreadCount.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchUnreadCount({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getUnreadCount).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('fetchNotifications', () => {
    test('calls fetchNotifications successfully', async () => {
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchNotifications({
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, mockNotificationsList);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          isLoading: false,
          data: mockNotificationsList,
        })
      );
    });

    test('will return the cached data', async () => {
      const headlessService = new HeadlessService(options);
      const listener1 = jest.fn();
      const onSuccess1 = jest.fn();
      (headlessService as any).session = mockSession;

      // fetch
      headlessService.fetchNotifications({
        listener: listener1,
        onSuccess: onSuccess1,
      });

      expect(listener1).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(onSuccess1).toHaveBeenNthCalledWith(1, mockNotificationsList);

      // fetch again
      const listener2 = jest.fn();
      const onSuccess2 = jest.fn();
      headlessService.fetchNotifications({
        listener: listener2,
        onSuccess: onSuccess2,
      });

      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener2).toBeCalledWith(
        expect.objectContaining({
          isLoading: false,
          data: mockNotificationsList,
        })
      );
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.getNotificationsList.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchNotifications({
        listener,
        onError,
      });
      expect(listener).toBeCalledTimes(1);
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('listenNotificationReceive', () => {
    test('calls listenNotificationReceive successfully', async () => {
      // when
      const mockedMessage = { test: 'hello' };
      const headlessService = new HeadlessService(options);
      const messageListener = jest.fn();
      const notificationsListener = jest.fn();
      const mockedSocket = {
        on: jest.fn((type, callback) => {
          if (type === WebSocketEventEnum.RECEIVED) {
            callback({ message: mockedMessage });
          }
        }),
        off: jest.fn(),
      };
      (headlessService as any).session = mockSession;
      (headlessService as any).socket = mockedSocket;
      // fetch notifications before, the listenNotificationReceive will clear notifications cache
      headlessService.fetchNotifications({
        listener: notificationsListener,
      });
      await promiseResolveTimeout(0);

      // then
      headlessService.listenNotificationReceive({
        listener: messageListener,
      });
      await promiseResolveTimeout(0);

      // check results
      expect(mockedSocket.on).toHaveBeenNthCalledWith(
        1,
        WebSocketEventEnum.RECEIVED,
        expect.any(Function)
      );
      expect(messageListener).toHaveBeenCalledWith(mockedMessage);

      // should fetch the notifications again, because the cache should be cleared
      const onNotificationsListSuccess = jest.fn();
      headlessService.fetchNotifications({
        listener: notificationsListener,
        onSuccess: onNotificationsListSuccess,
        onError: (error) => {
          console.log({ error });
        },
      });
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(3);
      expect(notificationsListener).toHaveBeenCalledTimes(8);
      expect(notificationsListener).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          isLoading: false,
          data: mockNotificationsList,
        })
      );
      expect(onNotificationsListSuccess).toHaveBeenNthCalledWith(
        1,
        mockNotificationsList
      );
    });

    test('should unsubscribe', async () => {
      // when
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const mockedSocket = {
        on: jest.fn(),
        off: jest.fn(),
      };
      (headlessService as any).session = mockSession;
      (headlessService as any).socket = mockedSocket;

      // then
      const unsubscribe = headlessService.listenUnseenCountChange({
        listener,
      });
      unsubscribe();

      expect(mockedSocket.off).toHaveBeenCalledWith(WebSocketEventEnum.UNSEEN);
    });
  });

  describe('listenUnseenCountChange', () => {
    test('calls listenUnseenCountChange successfully', async () => {
      // when
      const mockedUnseenCount = { unseenCount: 101 };
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const unseenCountListener = jest.fn();
      const notificationsListener = jest.fn();
      const mockedSocket = {
        on: jest.fn((type, callback) => {
          if (type === WebSocketEventEnum.UNSEEN) {
            callback(mockedUnseenCount);
          }
        }),
        off: jest.fn(),
      };
      (headlessService as any).session = mockSession;
      (headlessService as any).socket = mockedSocket;
      // fetch unseen count before, the listenUnseenCountChange will update it later
      headlessService.fetchUnseenCount({
        listener: unseenCountListener,
      });
      await promiseResolveTimeout(0);
      // fetch notifications before, the listenUnseenCountChange will clear notifications cache
      headlessService.fetchNotifications({
        listener: notificationsListener,
      });
      await promiseResolveTimeout(0);

      // then
      headlessService.listenUnseenCountChange({
        listener,
      });
      await promiseResolveTimeout(0);

      // check results
      expect(mockedSocket.on).toHaveBeenNthCalledWith(
        1,
        WebSocketEventEnum.UNSEEN,
        expect.any(Function)
      );
      expect(listener).toHaveBeenCalledWith(mockedUnseenCount.unseenCount);
      expect(unseenCountListener).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: { count: mockedUnseenCount.unseenCount },
        })
      );

      // should fetch the notifications again, because the cache should be cleared
      const onNotificationsListSuccess = jest.fn();
      headlessService.fetchNotifications({
        listener: notificationsListener,
        onSuccess: onNotificationsListSuccess,
        onError: (error) => {
          console.log({ error });
        },
      });
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(2);
      expect(notificationsListener).toHaveBeenCalledTimes(6);
      expect(notificationsListener).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          isLoading: false,
          data: mockNotificationsList,
        })
      );
      expect(onNotificationsListSuccess).toHaveBeenNthCalledWith(
        1,
        mockNotificationsList
      );
    });

    test('should unsubscribe', async () => {
      // when
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const mockedSocket = {
        on: jest.fn(),
        off: jest.fn(),
      };
      (headlessService as any).session = mockSession;
      (headlessService as any).socket = mockedSocket;

      // then
      const unsubscribe = headlessService.listenUnseenCountChange({
        listener,
      });
      unsubscribe();

      expect(mockedSocket.off).toHaveBeenCalledWith(WebSocketEventEnum.UNSEEN);
    });
  });

  describe('listenUnreadCountChange', () => {
    test('calls listenUnreadCountChange successfully', async () => {
      // when
      const mockedUnreadCount = { unreadCount: 101 };
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const unreadCountListener = jest.fn();
      const notificationsListener = jest.fn();
      const mockedSocket = {
        on: jest.fn((type, callback) => {
          if (type === WebSocketEventEnum.UNREAD) {
            callback(mockedUnreadCount);
          }
        }),
        off: jest.fn(),
      };
      (headlessService as any).session = mockSession;
      (headlessService as any).socket = mockedSocket;
      // fetch unseen count before, the listenUnreadCountChange will update it later
      headlessService.fetchUnreadCount({
        listener: unreadCountListener,
      });
      await promiseResolveTimeout(0);
      // fetch notifications before, the listenUnreadCountChange will clear notifications cache
      headlessService.fetchNotifications({
        listener: notificationsListener,
      });
      await promiseResolveTimeout(0);

      // then
      headlessService.listenUnreadCountChange({
        listener,
      });
      await promiseResolveTimeout(0);

      // check results
      expect(mockedSocket.on).toHaveBeenNthCalledWith(
        1,
        WebSocketEventEnum.UNREAD,
        expect.any(Function)
      );
      expect(listener).toHaveBeenCalledWith(mockedUnreadCount.unreadCount);
      expect(unreadCountListener).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: { count: mockedUnreadCount.unreadCount },
        })
      );

      // should fetch the notifications again, because the cache should be cleared
      const onNotificationsListSuccess = jest.fn();
      headlessService.fetchNotifications({
        listener: notificationsListener,
        onSuccess: onNotificationsListSuccess,
        onError: (error) => {
          console.log({ error });
        },
      });
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(2);
      expect(notificationsListener).toHaveBeenCalledTimes(6);
      expect(notificationsListener).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          isLoading: false,
          data: mockNotificationsList,
        })
      );
      expect(onNotificationsListSuccess).toHaveBeenNthCalledWith(
        1,
        mockNotificationsList
      );
    });

    test('should unsubscribe', async () => {
      // when
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const mockedSocket = {
        on: jest.fn(),
        off: jest.fn(),
      };
      (headlessService as any).session = mockSession;
      (headlessService as any).socket = mockedSocket;

      // then
      const unsubscribe = headlessService.listenUnreadCountChange({
        listener,
      });
      unsubscribe();

      expect(mockedSocket.off).toHaveBeenCalledWith(WebSocketEventEnum.UNREAD);
    });
  });

  describe('fetchUserPreferences', () => {
    test('calls fetchUserPreferences successfully', async () => {
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchUserPreferences({
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getUserPreference).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, mockUserPreferences);
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.getUserPreference.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.fetchUserPreferences({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(0);

      expect(mockServiceInstance.getUserPreference).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('updateUserPreferences', () => {
    test('calls updateUserPreferences successfully', async () => {
      const channelType = 'chat';
      const checked = false;
      const updatedUserPreferenceSetting = {
        ...mockUserPreferenceSetting,
        preference: {
          enabled: true,
          channels: {
            email: true,
            sms: true,
            in_app: true,
            chat: false,
            push: true,
          },
        },
      };
      mockServiceInstance.updateSubscriberPreference.mockImplementationOnce(
        () => promiseResolveTimeout(0, updatedUserPreferenceSetting)
      );
      const headlessService = new HeadlessService(options);
      const fetchUserPreferencesListener = jest.fn();
      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchUserPreferences({
        listener: fetchUserPreferencesListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchUserPreferencesListener).toHaveBeenCalledTimes(2);

      headlessService.updateUserPreferences({
        templateId,
        channelType,
        checked,
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.updateSubscriberPreference).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(
        1,
        updatedUserPreferenceSetting
      );
      expect(fetchUserPreferencesListener).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: [updatedUserPreferenceSetting],
        })
      );
    });

    test('handles the error', async () => {
      const channelType = 'chat';
      const checked = false;
      const error = new Error('error');
      mockServiceInstance.updateSubscriberPreference.mockImplementationOnce(
        () => promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.updateUserPreferences({
        templateId,
        channelType,
        checked,
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.updateSubscriberPreference).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('updateUserGlobalPreferences', () => {
    test('calls updateUserGlobalPreferences successfully', async () => {
      const payload = {
        enabled: true,
        preferences: [
          {
            channelType: ChannelTypeEnum.EMAIL,
            enabled: false,
          },
        ],
      };

      const updatedUserGlobalPreferenceSetting = {
        preference: {
          enabled: true,
          channels: {
            email: false,
          },
        },
      };
      mockServiceInstance.updateSubscriberGlobalPreference.mockImplementationOnce(
        () => promiseResolveTimeout(0, updatedUserGlobalPreferenceSetting)
      );
      const headlessService = new HeadlessService(options);

      const listener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.updateUserGlobalPreferences({
        preferences: payload.preferences,
        enabled: payload.enabled,
        listener,
        onSuccess,
      });

      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(
        mockServiceInstance.updateSubscriberGlobalPreference
      ).toBeCalledTimes(1);

      expect(onSuccess).toHaveBeenNthCalledWith(
        1,
        updatedUserGlobalPreferenceSetting
      );
    });

    test('handles the error', async () => {
      const payload = {
        enabled: true,
        preferences: [
          {
            channelType: ChannelTypeEnum.EMAIL,
            enabled: true,
          },
        ],
      };

      const error = new Error('error');
      mockServiceInstance.updateSubscriberGlobalPreference.mockImplementationOnce(
        () => promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.updateUserGlobalPreferences({
        preferences: payload.preferences,
        enabled: payload.enabled,
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(
        mockServiceInstance.updateSubscriberGlobalPreference
      ).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('markNotificationsAsRead', () => {
    test('calls markNotificationsAsRead successfully', async () => {
      const updatedNotification = {
        ...mockNotification,
        seen: true,
        read: true,
      };
      mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
        promiseResolveTimeout(0, [updatedNotification])
      );

      mockServiceInstance.getNotificationsList.mockImplementationOnce(() =>
        promiseResolveTimeout(0, [updatedNotification])
      );

      const headlessService = new HeadlessService(options);
      const markNotificationsAsReadListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.markNotificationsAsRead({
        messageId: notificationId,
        listener: markNotificationsAsReadListener,
        onSuccess,
      });

      expect(markNotificationsAsReadListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(300);

      expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, [updatedNotification]);
      expect(fetchNotificationsListener).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: [updatedNotification],
          error: null,
          isError: false,
          isFetching: true,
          isLoading: false,
          status: 'success',
        })
      );
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.markNotificationsAsRead({
        messageId: notificationId,
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('markNotificationsAs', () => {
    const PAYLOADS = [
      { seen: true },
      { seen: false },
      { seen: true, read: false },
      { seen: false, read: true },
      { seen: false, read: false },
      { seen: true, read: true },
      { read: true },
      { read: false },
    ];

    test.each(PAYLOADS)(
      'calls markNotificationsAs successfully with payload: %s',
      async (payload) => {
        const updatedNotification = {
          ...mockNotification,
          ...payload,
        };
        mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
          promiseResolveTimeout(0, [updatedNotification])
        );

        mockServiceInstance.getNotificationsList.mockImplementationOnce(() =>
          promiseResolveTimeout(0, [updatedNotification])
        );

        const headlessService = new HeadlessService(options);
        const markNotificationsAsListener = jest.fn();
        const fetchNotificationsListener = jest.fn();
        const onSuccess = jest.fn();
        (headlessService as any).session = mockSession;
        headlessService.fetchNotifications({
          listener: fetchNotificationsListener,
        });
        await promiseResolveTimeout(0);

        expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

        headlessService.markNotificationsAs({
          messageId: notificationId,
          mark: payload,
          listener: markNotificationsAsListener,
          onSuccess,
        });

        expect(markNotificationsAsListener).toBeCalledWith(
          expect.objectContaining({ isLoading: true, data: undefined })
        );
        await promiseResolveTimeout(300);

        expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
        expect(onSuccess).toHaveBeenNthCalledWith(1, [updatedNotification]);
        expect(fetchNotificationsListener).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            data: [updatedNotification],
            error: null,
            isError: false,
            isFetching: true,
            isLoading: false,
            status: 'success',
          })
        );
      }
    );

    test.each(PAYLOADS)(
      `handles the error with payload: %s`,
      async (payload) => {
        const error = new Error('error');
        mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
          promiseRejectTimeout(0, error)
        );
        const headlessService = new HeadlessService(options);
        const listener = jest.fn();
        const onError = jest.fn();
        (headlessService as any).session = mockSession;

        headlessService.markNotificationsAs({
          messageId: notificationId,
          mark: payload,
          listener,
          onError,
        });
        expect(listener).toBeCalledWith(
          expect.objectContaining({ isLoading: true, data: undefined })
        );
        await promiseResolveTimeout(100);

        expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(error);
        expect(listener).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ isLoading: false, data: undefined, error })
        );
      }
    );
  });

  describe('removeNotification', () => {
    test('calls removeNotification successfully', async () => {
      const updatedNotification = {
        ...mockNotification,
        deleted: true,
      };
      mockServiceInstance.removeMessage.mockImplementationOnce(() =>
        promiseResolveTimeout(0, updatedNotification)
      );
      const headlessService = new HeadlessService(options);
      const removeNotificationListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.removeNotification({
        messageId: notificationId,
        listener: removeNotificationListener,
        onSuccess,
      });

      expect(removeNotificationListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.removeMessage).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, updatedNotification);
      expect(fetchNotificationsListener).toHaveBeenNthCalledWith(
        2,
        expect.not.objectContaining({
          data: [updatedNotification],
        })
      );
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.removeMessage.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.removeNotification({
        messageId: notificationId,
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.removeMessage).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('removeNotifications', () => {
    test('calls removeNotifications successfully', async () => {
      const removedNotifications = {};
      mockServiceInstance.removeMessages.mockImplementationOnce(() =>
        promiseResolveTimeout(0, removedNotifications)
      );
      const headlessService = new HeadlessService(options);
      const removeNotificationListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.removeNotifications({
        messageIds: [notificationId],
        listener: removeNotificationListener,
        onSuccess,
      });

      expect(removeNotificationListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.removeMessages).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, removedNotifications);
      expect(fetchNotificationsListener).toHaveBeenNthCalledWith(
        2,
        expect.not.objectContaining({
          data: removedNotifications,
        })
      );
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.removeMessages.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.removeNotifications({
        messageIds: [notificationId],
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.removeMessages).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('updateAction', () => {
    test('calls updateAction successfully', async () => {
      const actionButtonType = ButtonTypeEnum.PRIMARY;
      const status = MessageActionStatusEnum.PENDING;
      const payload = {};
      const updatedNotification = {
        ...mockNotification,
        cta: {
          ...mockNotification.cta,
          action: {
            status,
            buttons: [{ type: ButtonTypeEnum.PRIMARY, content: 'button' }],
            result: {
              payload,
              type: ButtonTypeEnum.PRIMARY,
            },
          },
        },
      };
      mockServiceInstance.updateAction.mockImplementationOnce(() =>
        promiseResolveTimeout(0, updatedNotification)
      );
      const headlessService = new HeadlessService(options);
      const markNotificationsAsReadListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.updateAction({
        messageId: notificationId,
        actionButtonType,
        status,
        payload,
        listener: markNotificationsAsReadListener,
        onSuccess,
      });

      expect(markNotificationsAsReadListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.updateAction).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, updatedNotification);
      expect(fetchNotificationsListener).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: [updatedNotification],
        })
      );
    });

    test('handles the error', async () => {
      const actionButtonType = ButtonTypeEnum.PRIMARY;
      const status = MessageActionStatusEnum.PENDING;
      const payload = {};
      const error = new Error('error');
      mockServiceInstance.updateAction.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.updateAction({
        messageId: notificationId,
        actionButtonType,
        status,
        payload,
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.updateAction).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('markAllMessagesAsRead', () => {
    test('calls markAllMessagesAsRead successfully', async () => {
      mockServiceInstance.markAllMessagesAsRead.mockImplementationOnce(() =>
        promiseResolveTimeout(0)
      );
      const headlessService = new HeadlessService(options);
      const markAllNotificationsAsReadListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.markAllMessagesAsRead({
        listener: markAllNotificationsAsReadListener,
        onSuccess,
      });

      expect(markAllNotificationsAsReadListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.markAllMessagesAsRead).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, {});
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.markAllMessagesAsRead.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.markAllMessagesAsRead({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.markAllMessagesAsRead).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('markAllMessagesAsSeen', () => {
    test('calls markAllMessagesAsSeen successfully', async () => {
      mockServiceInstance.markAllMessagesAsSeen.mockImplementationOnce(() =>
        promiseResolveTimeout(0)
      );
      const headlessService = new HeadlessService(options);
      const markAllNotificationsAsSeenListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.markAllMessagesAsSeen({
        listener: markAllNotificationsAsSeenListener,
        onSuccess,
      });

      expect(markAllNotificationsAsSeenListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.markAllMessagesAsSeen).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1, {});
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.markAllMessagesAsSeen.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.markAllMessagesAsSeen({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.markAllMessagesAsSeen).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });

  describe('removeAllNotifications', () => {
    test('calls removeAllNotifications successfully', async () => {
      mockServiceInstance.removeAllMessages.mockImplementationOnce(() =>
        promiseResolveTimeout(0)
      );
      const headlessService = new HeadlessService(options);
      const removeAllNotificationsListener = jest.fn();
      const fetchNotificationsListener = jest.fn();
      const onSuccess = jest.fn();
      (headlessService as any).session = mockSession;
      headlessService.fetchNotifications({
        listener: fetchNotificationsListener,
      });
      await promiseResolveTimeout(0);

      expect(fetchNotificationsListener).toHaveBeenCalledTimes(2);

      headlessService.removeAllNotifications({
        listener: removeAllNotificationsListener,
        onSuccess,
      });

      expect(removeAllNotificationsListener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.removeAllMessages).toBeCalledTimes(1);
      expect(onSuccess).toHaveBeenNthCalledWith(1);
    });

    test('handles the error', async () => {
      const error = new Error('error');
      mockServiceInstance.removeAllMessages.mockImplementationOnce(() =>
        promiseRejectTimeout(0, error)
      );
      const headlessService = new HeadlessService(options);
      const listener = jest.fn();
      const onError = jest.fn();
      (headlessService as any).session = mockSession;

      headlessService.removeAllNotifications({
        listener,
        onError,
      });
      expect(listener).toBeCalledWith(
        expect.objectContaining({ isLoading: true, data: undefined })
      );
      await promiseResolveTimeout(100);

      expect(mockServiceInstance.removeAllMessages).toBeCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(listener).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isLoading: false, data: undefined, error })
      );
    });
  });
});
