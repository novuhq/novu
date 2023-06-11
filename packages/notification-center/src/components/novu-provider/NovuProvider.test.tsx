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
  members: [],
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
    });
  });
});
