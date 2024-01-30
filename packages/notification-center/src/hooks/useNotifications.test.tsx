import React, { useEffect, useState } from 'react';
import { act, renderHook, RenderHookResult } from '@testing-library/react-hooks';
import {
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  IMessage,
  IOrganizationEntity,
  ButtonTypeEnum,
  MessageActionStatusEnum,
  IPaginatedResponse,
} from '@novu/shared';
import { IUserPreferenceSettings } from '@novu/client';

import { ISession, INotificationsContext } from '../shared/interfaces';
import { NovuProvider } from '../components';
import { useNotifications } from './useNotifications';
import { queryClient } from '../components/novu-provider/NovuProvider';

const PROMISE_TIMEOUT = 150;
const promiseResolveTimeout = (ms: number, arg: unknown = {}) => new Promise((resolve) => setTimeout(resolve, ms, arg));

const templateId = 'templateId';
const notificationId = 'notificationId';
const mockSession: ISession = {
  token: 'token',
  profile: {
    _id: '_id',
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    subscriberId: 'subscriberId_1234',
    organizationId: 'organizationId?',
    environmentId: 'environmentId',
    aud: 'widget_user',
  },
};
const mockOrganization: IOrganizationEntity = {
  _id: '_id',
  name: 'mock organization',
  createdAt: '2023-12-27T13:17:06.309Z',
  updatedAt: '2023-12-27T13:17:06.409Z',
};

const mockUnseenCount = { count: 99 };
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
const mockNotificationsList: IPaginatedResponse<IMessage> = {
  data: [mockNotification],
  totalCount: 1,
  pageSize: 10,
  page: 0,
  hasMore: false,
};
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
const mockUserPreferences = [mockUserPreferenceSetting];

const mockServiceInstance = {
  initializeSession: jest.fn(() => promiseResolveTimeout(0, mockSession)),
  setAuthorizationToken: jest.fn(),
  disposeAuthorizationToken: jest.fn(),
  getOrganization: jest.fn(() => promiseResolveTimeout(0, mockOrganization)),
  getUnseenCount: jest.fn(() => promiseResolveTimeout(0, mockUnseenCount)),
  getUserPreference: jest.fn(() => promiseResolveTimeout(0, mockUserPreferences)),
  getNotificationsList: jest.fn(() => promiseResolveTimeout(0, mockNotificationsList)),
  updateSubscriberPreference: jest.fn(() => promiseResolveTimeout(0, mockUserPreferenceSetting)),
  markMessageAs: jest.fn(),
  updateAction: jest.fn(),
};

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('@novu/client', () => ({
  ...jest.requireActual<typeof import('@novu/client')>('@novu/client'),
  ApiService: jest.fn().mockImplementation(() => mockServiceInstance),
}));

jest.mock('socket.io-client', () => ({
  ...jest.requireActual<typeof import('socket.io-client')>('socket.io-client'),
  __esModule: true,
  io: jest.fn().mockImplementation(() => mockSocket),
}));

describe('useNotifications', () => {
  let hook: RenderHookResult<
    {
      children: any;
    },
    INotificationsContext
  >;

  beforeEach(() => {
    const wrapper = ({ children }) => (
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier="mock_app"
        subscriberId="mock_subscriber_id"
        initialFetchingStrategy={{ fetchNotifications: true }}
      >
        {children}
      </NovuProvider>
    );
    hook = renderHook(() => useNotifications(), { wrapper });
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('unseen count', async () => {
    const { rerender, result } = hook;

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(1);
    expect(result.current.unseenCount).toEqual(mockUnseenCount.count);
  });

  it('single page', async () => {
    const { rerender, result } = hook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    const { notifications, isLoading, hasNextPage } = result.current;

    expect(isLoading).toBeFalsy();
    expect(hasNextPage).toBeFalsy();
    expect(notifications).toStrictEqual([mockNotification]);
  });

  it('has next page', async () => {
    const mockNotificationsResponse = {
      data: [mockNotification],
      totalCount: 12,
      pageSize: 10,
      page: 0,
      hasMore: true,
    };
    mockServiceInstance.getNotificationsList.mockImplementationOnce(() =>
      promiseResolveTimeout(0, mockNotificationsResponse)
    );
    const { rerender, result } = hook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    const { notifications, isLoading, hasNextPage } = result.current;

    expect(isLoading).toBeFalsy();
    expect(hasNextPage).toBeTruthy();
    expect(notifications).toStrictEqual([mockNotification]);
  });

  it('setStore refetches notifications', async () => {
    const stores = [
      { storeId: 'first', query: { feedIdentifier: 'first' } },
      { storeId: 'second', query: { feedIdentifier: 'second' } },
    ];
    const wrapper = ({ children }) => (
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier="mock_app"
        subscriberId="mock_subscriber_id"
        stores={stores}
        initialFetchingStrategy={{ fetchNotifications: true }}
      >
        {children}
      </NovuProvider>
    );
    const innerHook = renderHook(() => useNotifications(), { wrapper });
    const { rerender, result } = innerHook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toHaveBeenNthCalledWith(1, 0, stores[0].query);

    act(() => {
      result.current.setStore('second');
    });

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toHaveBeenNthCalledWith(2, 0, stores[1].query);
  });

  const props = {
    applicationIdentifier: 'applicationIdentifier',
    subscriberId: 'subscriberId',
    subscriberHash: 'subscriberHash',
  };
  const applicationIdentifierChanged = {
    ...props,
    applicationIdentifier: 'applicationIdentifier1',
  };
  const subscriberIdChanged = {
    ...props,
    subscriberId: 'subscriberId1',
  };
  const subscriberHashChanged = {
    ...props,
    subscriberHash: 'subscriberHash1',
  };

  it.each`
    theChangeObject                 | change
    ${applicationIdentifierChanged} | ${`applicationIdentifier`}
    ${subscriberHashChanged}        | ${`subscriberHash`}
    ${subscriberIdChanged}          | ${`subscriberId`}
  `('refetches the notifications, unseen count, organization when $change changes', async ({ theChangeObject }) => {
    const payloads = [props, { ...theChangeObject }];

    const wrapper = ({ children }) => {
      const [payload, setPayload] = useState(payloads[0]);

      useEffect(() => {
        const timeout = setTimeout(() => {
          act(() => {
            setPayload(payloads[1]);
          });
        }, 200);

        return () => clearTimeout(timeout);
      }, []);

      return (
        <NovuProvider
          backendUrl="https://mock_url.com"
          applicationIdentifier={payload.applicationIdentifier}
          subscriberId={payload.subscriberId}
          subscriberHash={payload.subscriberHash}
          initialFetchingStrategy={{ fetchNotifications: true }}
        >
          {children}
        </NovuProvider>
      );
    };
    const innerHook = renderHook(() => useNotifications(), { wrapper });
    const { rerender, result } = innerHook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
    expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(1);
    expect(mockServiceInstance.getOrganization).toBeCalledTimes(1);

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(2);
    expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(2);
    expect(mockServiceInstance.getOrganization).toBeCalledTimes(2);
  });

  it('fetch next page', async () => {
    const mockNotification1 = { ...mockNotification, _id: 'mockNotification1' };
    const mockNotification2 = { ...mockNotification, _id: 'mockNotification2' };
    const mockNotification3 = { ...mockNotification, _id: 'mockNotification3' };
    const mockNotificationsResponse1 = {
      data: [mockNotification1, mockNotification2],
      totalCount: 3,
      pageSize: 2,
      page: 0,
      hasMore: true,
    };
    const mockNotificationsResponse2 = {
      data: [mockNotification3],
      totalCount: 3,
      pageSize: 2,
      page: 1,
      hasMore: false,
    };
    mockServiceInstance.getNotificationsList
      .mockImplementationOnce(() => promiseResolveTimeout(0, mockNotificationsResponse1))
      .mockImplementationOnce(() => promiseResolveTimeout(0, mockNotificationsResponse2));

    const { rerender, result } = hook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.hasNextPage).toBeTruthy();
    expect(result.current.notifications).toStrictEqual([mockNotification1, mockNotification2]);

    // fetch next page
    result.current.fetchNextPage();
    rerender();

    expect(result.current.isFetching).toBeTruthy();
    expect(result.current.isFetchingNextPage).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isFetching).toBeFalsy();
    expect(result.current.isFetchingNextPage).toBeFalsy();
    expect(result.current.hasNextPage).toBeFalsy();
    expect(result.current.notifications).toStrictEqual([mockNotification1, mockNotification2, mockNotification3]);
  });

  it('refetch will fetch notifications again for the same store', async () => {
    const mockNotification1 = { ...mockNotification, _id: 'mockNotification1' };
    const mockNotification2 = { ...mockNotification, _id: 'mockNotification2' };
    const mockNotification3 = { ...mockNotification, _id: 'mockNotification3' };
    const mockNotificationsResponse1 = {
      data: [mockNotification1],
      totalCount: 1,
      pageSize: 10,
      page: 0,
    };
    const mockNotificationsResponse2 = {
      data: [mockNotification1, mockNotification2, mockNotification3],
      totalCount: 3,
      pageSize: 10,
      page: 1,
    };
    mockServiceInstance.getNotificationsList
      .mockImplementationOnce(() => promiseResolveTimeout(0, mockNotificationsResponse1))
      .mockImplementationOnce(() => promiseResolveTimeout(0, mockNotificationsResponse2));

    const { rerender, result } = hook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toHaveBeenNthCalledWith(1, 0, {});
    expect(result.current.notifications).toStrictEqual([mockNotification1]);

    act(() => {
      result.current.refetch();
    });
    rerender();

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isFetching).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toHaveBeenNthCalledWith(2, 0, {});
    expect(result.current.notifications).toStrictEqual([mockNotification1, mockNotification2, mockNotification3]);
  });

  it('refetch will fetch notifications from a specified page number', async () => {
    const mockNotification1 = { ...mockNotification, _id: 'mockNotification1' };
    const mockNotification2 = { ...mockNotification, _id: 'mockNotification2' };
    const mockNotification3 = { ...mockNotification, _id: 'mockNotification3' };
    const mockNotificationsResponse1 = {
      data: [mockNotification1],
      totalCount: 1,
      pageSize: 10,
      page: 0,
    };
    const mockNotificationsResponse2 = {
      data: [mockNotification2, mockNotification3],
      totalCount: 3,
      pageSize: 10,
      page: 1,
    };
    mockServiceInstance.getNotificationsList
      .mockImplementationOnce(() => promiseResolveTimeout(0, mockNotificationsResponse1))
      .mockImplementationOnce(() => promiseResolveTimeout(0, mockNotificationsResponse2));

    const { rerender, result } = hook;

    expect(result.current.isLoading).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toHaveBeenNthCalledWith(1, 0, {});
    expect(result.current.notifications).toStrictEqual([mockNotification1]);

    act(() => {
      result.current.refetch({ page: 1 });
    });
    rerender();

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isFetching).toBeTruthy();

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    expect(mockServiceInstance.getNotificationsList).toHaveBeenNthCalledWith(2, 1, {});
    expect(result.current.notifications).toStrictEqual([mockNotification1, mockNotification2, mockNotification3]);
  });

  it('mark notification as read', async () => {
    mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
      promiseResolveTimeout(0, [{ ...mockNotification, read: true, seen: true }])
    );
    const { rerender, result } = hook;

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    act(() => {
      result.current.markNotificationAsRead(result.current.notifications[0]._id);
    });

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    const { notifications } = result.current;
    const [firstNotification] = notifications;

    expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith(firstNotification._id, {
      seen: true,
      read: true,
    });
    expect(firstNotification.read).toBeTruthy();
    expect(firstNotification.seen).toBeTruthy();
  });

  it('mark fetched notifications as read', async () => {
    const mockNotification1 = { ...mockNotification, _id: 'mockNotification1' };
    const mockNotification2 = { ...mockNotification, _id: 'mockNotification2' };
    const mockNotificationsResponse1 = {
      data: [mockNotification1, mockNotification2],
      totalCount: 10,
      pageSize: 10,
      page: 0,
      hasMore: false,
    };
    mockServiceInstance.getNotificationsList.mockImplementationOnce(() =>
      promiseResolveTimeout(0, mockNotificationsResponse1)
    );
    mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
      promiseResolveTimeout(0, [
        { ...mockNotification1, read: true, seen: true },
        { ...mockNotification2, read: true, seen: true },
      ])
    );
    const { rerender, result } = hook;

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    act(() => {
      result.current.markFetchedNotificationsAsRead();
    });

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    const { notifications } = result.current;
    const [firstNotification, secondNotification] = notifications;

    expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith([firstNotification._id, secondNotification._id], {
      seen: true,
      read: true,
    });
    expect(firstNotification.read).toBeTruthy();
    expect(firstNotification.seen).toBeTruthy();
    expect(secondNotification.read).toBeTruthy();
    expect(secondNotification.seen).toBeTruthy();
  });

  it('mark notification as seen', async () => {
    mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
      promiseResolveTimeout(0, [{ ...mockNotification, read: false, seen: true }])
    );
    const { rerender, result } = hook;

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    act(() => {
      result.current.markNotificationAsSeen(result.current.notifications[0]._id);
    });

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    const { notifications } = result.current;
    const [firstNotification] = notifications;

    expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith(firstNotification._id, {
      seen: true,
      read: false,
    });
    expect(firstNotification.read).toBeFalsy();
    expect(firstNotification.seen).toBeTruthy();
  });

  it('mark fetched notifications as seen', async () => {
    const mockNotification1 = { ...mockNotification, _id: 'mockNotification1' };
    const mockNotification2 = { ...mockNotification, _id: 'mockNotification2' };
    const mockNotificationsResponse1 = {
      data: [mockNotification1, mockNotification2],
      totalCount: 10,
      pageSize: 10,
      page: 0,
    };
    mockServiceInstance.getNotificationsList.mockImplementationOnce(() =>
      promiseResolveTimeout(0, mockNotificationsResponse1)
    );
    mockServiceInstance.markMessageAs.mockImplementationOnce(() =>
      promiseResolveTimeout(0, [
        { ...mockNotification1, read: false, seen: true },
        { ...mockNotification2, read: false, seen: true },
      ])
    );
    const { rerender, result } = hook;

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    act(() => {
      result.current.markFetchedNotificationsAsSeen();
    });

    await promiseResolveTimeout(PROMISE_TIMEOUT);
    rerender();

    const { notifications } = result.current;
    const [firstNotification, secondNotification] = notifications;

    expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith([firstNotification._id, secondNotification._id], {
      seen: true,
      read: false,
    });
    expect(firstNotification.read).toBeFalsy();
    expect(firstNotification.seen).toBeTruthy();
    expect(secondNotification.read).toBeFalsy();
    expect(secondNotification.seen).toBeTruthy();
  });
});
