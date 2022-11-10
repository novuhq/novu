import { renderHook } from '@testing-library/react-hooks';
import { useNotifications } from './use-notifications.hook';
import React from 'react';
import { IMessage, ChannelCTATypeEnum } from '@novu/shared';

let realUseContext;
let useContextMock;

describe('@novu/hooks/use-notifications', () => {
  beforeEach(() => {
    realUseContext = React.useContext;
    useContextMock = React.useContext = jest.fn();
    useContextMock.mockReturnValue({
      notifications: { default_store: [...messages] },
      hasNextPage: true,
      fetching: false,
    });
  });
  afterEach(() => {
    React.useContext = realUseContext;
  });
  it('validate markAsSeen interface', () => {
    const hook = renderHook(() => useNotifications({ storeId: 'default_store' }));

    const markAsSeen = hook.result.current.markAsSeen;

    const messageId = '123';
    const readExist = true;

    try {
      markAsSeen(messageId, readExist, messages);
    } catch (e) {
      expect(e).toBe(true);
    }
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
