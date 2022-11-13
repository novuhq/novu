import { renderHook } from '@testing-library/react-hooks';
import { IUseNotifications, useNotifications } from './use-notifications.hook';
import React from 'react';
import { IMessage, ChannelCTATypeEnum, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';

let realUseContext;
let useContextMock;
let renderedUseNotification: IUseNotifications;

describe('@novu/notification-center - useNotifications', () => {
  beforeEach(() => {
    realUseContext = React.useContext;
    useContextMock = React.useContext = jest.fn();
    useContextMock.mockReturnValue({
      notifications: { default_store: [...messages] },
      fetchNextPage: () => {},
      hasNextPage: { default_store: true },
      fetching: false,
      markAsRead: () => {},
      updateAction: () => {},
      refetch: () => {},
      markAsSeen: () => {},
      onWidgetClose: () => {},
      onTabChange: () => {},
      markAllAsRead: () => {},
    });
    renderedUseNotification = renderHook(() => useNotifications({ storeId: 'default_store' })).result.current;
  });
  afterEach(() => {
    React.useContext = realUseContext;
  });

  it('validate notification interface', () => {
    const { notifications } = renderedUseNotification;

    expect(notifications).toStrictEqual(messages);
  });

  it('validate fetchNextPage interface', () => {
    const fetchNextPageSpy = jest.spyOn(renderedUseNotification, 'fetchNextPage');

    renderedUseNotification.fetchNextPage();

    expect(fetchNextPageSpy).toBeCalledWith();
  });

  it('validate hasNextPage interface', () => {
    const { hasNextPage } = renderedUseNotification;

    expect(hasNextPage).toBe(true);
  });

  it('validate fetching interface', () => {
    const { fetching } = renderedUseNotification;

    expect(fetching).toBe(false);
  });

  it('validate markAsRead interface', () => {
    const markAsReadSpy = jest.spyOn(renderedUseNotification, 'markAsRead');

    const messageId = 'message-id-123';

    renderedUseNotification.markAsRead(messageId);

    expect(markAsReadSpy).toBeCalledWith(messageId);
  });

  it('validate updateAction interface', () => {
    const updateActionSpy = jest.spyOn(renderedUseNotification, 'updateAction');

    const messageId = 'message-id-123';
    const actionType = ButtonTypeEnum.PRIMARY;
    const messageAction = MessageActionStatusEnum.DONE;
    const payload = { cta: 'click on me!' };

    renderedUseNotification.updateAction(messageId, actionType, messageAction, payload);

    expect(updateActionSpy).toBeCalledWith(messageId, actionType, messageAction, payload);
  });

  it('validate refetch interface', () => {
    const refetchSpy = jest.spyOn(renderedUseNotification, 'refetch');

    renderedUseNotification.refetch();

    expect(refetchSpy).toBeCalledWith();
  });

  it('validate markAsSeen interface', () => {
    const markAsSeenSpy = jest.spyOn(renderedUseNotification, 'markAsSeen');

    const messageId = '123';
    const readExist = true;
    renderedUseNotification.markAsSeen(messageId, readExist, messages);

    expect(markAsSeenSpy).toBeCalledWith(messageId, readExist, messages);
  });

  it('validate onWidgetClose interface', () => {
    const onWidgetCloseSpy = jest.spyOn(renderedUseNotification, 'onWidgetClose');
    const { onWidgetClose } = renderedUseNotification;

    onWidgetClose();

    expect(onWidgetCloseSpy).toBeCalledWith();
  });

  it('validate onTabChange interface', () => {
    const onTabChangeSpy = jest.spyOn(renderedUseNotification, 'onTabChange');

    renderedUseNotification.onTabChange();

    expect(onTabChangeSpy).toBeCalledWith();
  });

  it('validate markAllAsRead interface', () => {
    const markAllAsReadSpy = jest.spyOn(renderedUseNotification, 'markAllAsRead');

    renderedUseNotification.markAllAsRead();

    expect(markAllAsReadSpy).toBeCalledWith();
  });
});

const messages = [
  {
    _id: '632c7a4121063d22a154995e',
    _templateId: '62f4cfe6f0c93be661f8fc78',
    _environmentId: '62f4cf8ff0c93be661f8fb9a',
    _notificationId: '632c7a4121063d22a1549950',
    _organizationId: '62f4cf8ff0c93be661f8fb95',
    _subscriberId: '62f4cf90f0c93be661f8fbcc',
    cta: {
      type: ChannelCTATypeEnum.REDIRECT,
      data: { url: '' },
    },
    _feedId: '632ac58edc96bf1c8a4ba4e9',
    channel: 'in_app',
    content: 'test old<br />',
    seen: true,
    read: true,
    transactionId: 'e47988af-07ea-48d3-a470-01e0260b5992',
    payload: {
      cta: '',
    },
    createdAt: '2022-09-22T15:07:45.495Z',
    lastReadDate: '2022-09-22T17:39:19.878Z',
    lastSeenDate: '2022-09-22T17:39:19.878Z',
  } as IMessage,
];
