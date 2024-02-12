/* cSpell:disable */
import React from 'react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
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

import { ISession } from '../../shared/interfaces';
import { NovuProvider } from '../../components';
import { queryClient } from '../../components/novu-provider/NovuProvider';
import { NotificationBell, PopoverNotificationCenter } from '../..';

configure({
  testIdAttribute: 'data-test-id',
});

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

const mockUnseenCount = { count: 1 };
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
  lastSeenDate: '2023-06-09T12:53:55.095Z',
  lastReadDate: '2023-06-09T12:53:55.095Z',
  createdAt: '2023-06-09T12:53:55.095Z',
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
  getUnreadCount: jest.fn(() => promiseResolveTimeout(0, mockUnseenCount)),
  getTabCount: jest.fn(() => promiseResolveTimeout(0, mockUnseenCount)),
  getUserPreference: jest.fn(() => promiseResolveTimeout(0, mockUserPreferences)),
  getNotificationsList: jest.fn(() => promiseResolveTimeout(0, mockNotificationsList)),
  updateSubscriberPreference: jest.fn(() => promiseResolveTimeout(0, mockUserPreferenceSetting)),
  markMessageAs: jest.fn(() => promiseResolveTimeout(0, [{ ...mockNotification, read: true, seen: true }])),
  markAllMessagesAsRead: jest.fn(() => promiseResolveTimeout(0, [{ ...mockNotification }])),
  markAllMessagesAsSeen: jest.fn(() => promiseResolveTimeout(0, [{ ...mockNotification }])),
  updateAction: jest.fn(() => promiseResolveTimeout(0)),
  postUsageLog: jest.fn(() => promiseResolveTimeout(0)),
  removeMessage: jest.fn(() => promiseResolveTimeout(0)),
};

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
};

const onNotificationClick = jest.fn();

jest.mock('@novu/client', () => ({
  ...jest.requireActual<typeof import('@novu/client')>('@novu/client'),
  ApiService: jest.fn().mockImplementation(() => mockServiceInstance),
}));

jest.mock('socket.io-client', () => ({
  ...jest.requireActual<typeof import('socket.io-client')>('socket.io-client'),
  __esModule: true,
  io: jest.fn().mockImplementation(() => mockSocket),
}));

window.ResizeObserver =
  window.ResizeObserver ||
  jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
  }));

describe('NovuProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  const props = {
    applicationIdentifier: 'mock_app',
    subscriberId: 'mock_subscriber_id',
    subscriberHash: 'mock_subscriber_hash',
  };

  it.each`
    allProps                                          | prop
    ${{ ...props, applicationIdentifier: undefined }} | ${'applicationIdentifier'}
    ${{ ...props, subscriberId: undefined }}          | ${'subscriberId'}
  `('when $prop is not provided should not initialize the session', async ({ allProps }) => {
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={allProps.applicationIdentifier}
        subscriberId={allProps.subscriberId}
        subscriberHash={allProps.subscriberHash}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    await waitFor(() => {
      expect(mockServiceInstance.initializeSession).toBeCalledTimes(0);
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(0);
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(0);
    });
  });

  it.each`
    fetchNotifications
    ${true}
    ${false}
  `(
    'when applicationIdentifier and subscriberId are provided should initialize the session and fetch notifications: $fetchNotifications',
    async ({ fetchNotifications }) => {
      render(
        <NovuProvider
          backendUrl="https://mock_url.com"
          socketUrl="wss://mock_url.com"
          applicationIdentifier={'applicationIdentifier'}
          subscriberId={'subscriberId'}
          initialFetchingStrategy={{ fetchNotifications }}
        >
          <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
            {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
          </PopoverNotificationCenter>
        </NovuProvider>
      );

      await waitFor(() => {
        expect(mockServiceInstance.initializeSession).toBeCalledTimes(1);
        expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(fetchNotifications ? 1 : 0);
      });

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockServiceInstance.initializeSession).toBeCalledTimes(1);
        expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(fetchNotifications ? 1 : 0);
        expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(fetchNotifications ? 1 : 0);
      });
    }
  );

  it('when bell button is clicked and session initialized should fetch notifications', async () => {
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={'applicationIdentifier'}
        subscriberId={'subscriberId'}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockServiceInstance.initializeSession).toBeCalledTimes(1);
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
    });
  });

  it('should show the feeds tabs', async () => {
    const newsletterFeed = 'newsletter';
    const hotDealFeed = 'hotdeal';
    const newsletterNotifications = Array.from({ length: 10 }, (_, i) => ({
      ...mockNotification,
      _id: `${notificationId}${i + 1}`,
      content: `${mockNotification.content} ${newsletterFeed}`,
    }));
    const hotDealNotifications = Array.from({ length: 10 }, (_, i) => ({
      ...mockNotification,
      _id: `${notificationId}${i + 11}`,
      content: `${mockNotification.content} ${hotDealFeed}`,
    }));

    mockServiceInstance.getNotificationsList
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, {
          data: [...newsletterNotifications],
          totalCount: 10,
          pageSize: 10,
          page: 0,
          hasMore: true,
        })
      )
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, {
          data: [...hotDealNotifications],
          totalCount: 10,
          pageSize: 10,
          page: 0,
          hasMore: true,
        })
      );
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={'applicationIdentifier'}
        subscriberId={'subscriberId'}
        stores={[
          { storeId: newsletterFeed, query: { feedIdentifier: newsletterFeed } },
          { storeId: hotDealFeed, query: { feedIdentifier: hotDealFeed } },
        ]}
      >
        <PopoverNotificationCenter
          onNotificationClick={onNotificationClick}
          colorScheme="dark"
          tabs={[
            { name: 'Newsletter', storeId: newsletterFeed },
            { name: 'Hot Deal', storeId: hotDealFeed },
          ]}
        >
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(screen.queryByTestId(`tab-${newsletterFeed}`)).toBeDefined();
      expect(screen.queryByTestId(`tab-${hotDealFeed}`)).toBeDefined();
      expect(screen.queryByText('Newsletter')).toBeDefined();
      expect(screen.queryByText('Hot Deal')).toBeDefined();
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(10);
      screen.queryAllByTestId('notification-content').forEach((item) => {
        expect(item.innerHTML).toEqual(`${mockNotification.content} ${newsletterFeed}`);
      });
    });

    fireEvent.click(screen.getByTestId(`tab-${hotDealFeed}`));

    await waitFor(() => {
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(2);
      expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
      expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith(
        newsletterNotifications.map((el) => el._id),
        { seen: true, read: false }
      );
      expect(screen.queryByTestId('notifications-scroll-area')).toBeDefined();
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(10);
      screen.queryAllByTestId('notification-content').forEach((item) => {
        expect(item.innerHTML).toEqual(`${mockNotification.content} ${hotDealFeed}`);
      });
    });
  });

  it('when changing applicationIdentifier, subscriberId, subscriberHash should reinitialize the session and fetch notifications', async () => {
    const subscriberOneProps = {
      applicationIdentifier: 'mock_app',
      subscriberId: 'mock_subscriber_id1',
      subscriberHash: 'mock_subscriber_hash1',
    };
    const subscriberTwoProps = {
      applicationIdentifier: 'mock_app',
      subscriberId: 'mock_subscriber_id2',
      subscriberHash: 'mock_subscriber_hash2',
    };
    const subscriberTwoHashProps = {
      applicationIdentifier: 'mock_app',
      subscriberId: 'mock_subscriber_id2',
      subscriberHash: 'mock_subscriber_hash3',
    };
    const appTwoProps = {
      applicationIdentifier: 'mock_app2',
      subscriberId: 'mock_subscriber_id2',
      subscriberHash: 'mock_subscriber_hash2',
    };
    mockServiceInstance.getNotificationsList
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, { ...mockNotificationsList, data: [{ ...mockNotification, content: 'content1' }] })
      )
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, { ...mockNotificationsList, data: [{ ...mockNotification, content: 'content2' }] })
      )
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, { ...mockNotificationsList, data: [{ ...mockNotification, content: 'content3' }] })
      )
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, { ...mockNotificationsList, data: [{ ...mockNotification, content: 'content4' }] })
      );

    const { rerender } = render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={subscriberOneProps.applicationIdentifier}
        subscriberId={subscriberOneProps.subscriberId}
        subscriberHash={subscriberOneProps.subscriberHash}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockServiceInstance.initializeSession).toBeCalledTimes(1);
      expect(mockServiceInstance.getOrganization).toBeCalledTimes(1);
      expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(1);
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content1');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });

    rerender(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={subscriberTwoProps.applicationIdentifier}
        subscriberId={subscriberTwoProps.subscriberId}
        subscriberHash={subscriberTwoProps.subscriberHash}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    await waitFor(() => {
      expect(mockServiceInstance.initializeSession).toBeCalledTimes(2);
      expect(mockServiceInstance.getOrganization).toBeCalledTimes(2);
      expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(2);
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(2);
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content2');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });

    rerender(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={subscriberTwoHashProps.applicationIdentifier}
        subscriberId={subscriberTwoHashProps.subscriberId}
        subscriberHash={subscriberTwoHashProps.subscriberHash}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    await waitFor(() => {
      expect(mockServiceInstance.initializeSession).toBeCalledTimes(3);
      expect(mockServiceInstance.getOrganization).toBeCalledTimes(3);
      expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(3);
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(3);
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content3');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });

    rerender(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={appTwoProps.applicationIdentifier}
        subscriberId={appTwoProps.subscriberId}
        subscriberHash={appTwoProps.subscriberHash}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    await waitFor(() => {
      expect(mockServiceInstance.initializeSession).toBeCalledTimes(4);
      expect(mockServiceInstance.getOrganization).toBeCalledTimes(4);
      expect(mockServiceInstance.getUnseenCount).toBeCalledTimes(4);
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(4);
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content4');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });
  });

  it('when scrolling to the bottom should fetch the next page', async () => {
    const firstTenNotifications = Array.from({ length: 10 }, (_, i) => ({
      ...mockNotification,
      _id: `${notificationId}${i + 1}`,
      content: `${mockNotification.content}${i + 1}`,
    }));
    const secondTenNotifications = Array.from({ length: 10 }, (_, i) => ({
      ...mockNotification,
      _id: `${notificationId}${i + 11}`,
      content: `${mockNotification.content}${i + 11}`,
    }));

    mockServiceInstance.getNotificationsList
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, {
          data: [...firstTenNotifications],
          totalCount: 20,
          pageSize: 10,
          page: 0,
          hasMore: true,
        })
      )
      .mockImplementationOnce(() =>
        promiseResolveTimeout(0, {
          data: [...secondTenNotifications],
          totalCount: 20,
          pageSize: 10,
          page: 1,
          hasMore: true,
        })
      );
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={'applicationIdentifier'}
        subscriberId={'subscriberId'}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(1);
      expect(screen.queryByTestId('notifications-scroll-area')).toBeDefined();
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(10);
      screen.queryAllByTestId('notification-content').forEach((item, i) => {
        expect(item.innerHTML).toEqual(`${mockNotification.content}${i + 1}`);
      });
    });

    fireEvent.scroll(document.querySelectorAll('.nc-notifications-list')[0], { target: { scrollY: 1000 } });

    await waitFor(() => {
      expect(mockServiceInstance.getNotificationsList).toBeCalledTimes(2);
      expect(screen.queryByTestId('notifications-scroll-area')).toBeDefined();
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(20);
      screen.queryAllByTestId('notification-content').forEach((item, i) => {
        expect(item.innerHTML).toEqual(`${mockNotification.content}${i + 1}`);
      });
    });
  });

  it('when clicking on "Mark all as read" should mark all messages as read and seen', async () => {
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={'applicationIdentifier'}
        subscriberId={'subscriberId'}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.queryAllByTestId('notification-list-item')[0].getAttribute('class')).toContain(
        'nc-notifications-list-item-unread'
      );
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });

    fireEvent.click(screen.getByTestId('notifications-header-mark-all-as-read'));

    await waitFor(() => {
      expect(mockServiceInstance.markAllMessagesAsRead).toBeCalledTimes(1);
      expect(screen.queryAllByTestId('notification-list-item')[0].getAttribute('class')).toContain(
        'nc-notifications-list-item-read'
      );
    });
  });

  it('when clicking on notification should mark it as read', async () => {
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={'applicationIdentifier'}
        subscriberId={'subscriberId'}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.queryAllByTestId('notification-list-item')[0].getAttribute('class')).toContain(
        'nc-notifications-list-item-unread'
      );
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });

    fireEvent.click(screen.getByTestId('notification-list-item'));

    await waitFor(() => {
      expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
      expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith(notificationId, { seen: true, read: true });
      expect(screen.queryAllByTestId('notification-list-item')[0].getAttribute('class')).toContain(
        'nc-notifications-list-item-read'
      );
    });
  });

  // Due to flakiness in tests, skipping this for now intentionally
  it.skip('when clicking on mark as read from dropdown menu should mark it as read', async () => {
    render(
      <NovuProvider
        backendUrl="https://mock_url.com"
        socketUrl="wss://mock_url.com"
        applicationIdentifier={'applicationIdentifier'}
        subscriberId={'subscriberId'}
      >
        <PopoverNotificationCenter onNotificationClick={onNotificationClick} colorScheme="dark">
          {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.queryAllByTestId('notification-list-item')).toHaveLength(1);
      expect(screen.queryAllByTestId('notification-list-item')[0].getAttribute('class')).toContain(
        'nc-notifications-list-item-unread'
      );
      expect(screen.getByTestId('notification-content').innerHTML).toEqual('content');
      expect(screen.getByTestId('unseen-count-label').firstElementChild?.textContent).toEqual('1');
    });

    fireEvent.click(screen.getByTestId('notification-dots-button'));

    await waitFor(() => {
      expect(screen.queryAllByTestId('notification-mark-as-read')).toHaveLength(1);
      expect(screen.queryAllByTestId('notification-remove-message')).toHaveLength(1);
    });

    fireEvent.click(screen.getByTestId('notification-mark-as-read'));
    await promiseResolveTimeout(0);

    await waitFor(() => {
      expect(mockServiceInstance.markMessageAs).toBeCalledTimes(1);
      expect(mockServiceInstance.markMessageAs).toHaveBeenCalledWith(notificationId, { seen: true, read: true });
      expect(screen.queryAllByTestId('notification-list-item')[0].getAttribute('class')).toContain(
        'nc-notifications-list-item-read'
      );
    });

    fireEvent.click(screen.getByTestId('notification-dots-button'));

    await waitFor(() => {
      expect(screen.queryAllByTestId('notification-mark-as-unread')).toHaveLength(1);
      expect(screen.queryAllByTestId('notification-remove-message')).toHaveLength(1);
    });
  }, 10000);
});
