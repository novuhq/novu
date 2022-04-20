import React, { useEffect, useState } from 'react';
import { IMessage } from '@novu/shared';
import { NotificationCenter } from '../notification-center';
import { getUnseenCount } from '../../api/notifications';
import { INotificationBellProps } from '../notification-bell';
import { Popover } from './components/Popover';
import { IHeaderProps } from '../notification-center/components/layout/header/Header';
import { useSocket } from '../../hooks';

interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  children: (props: INotificationBellProps) => JSX.Element;
  header?: (props: IHeaderProps) => JSX.Element;
  footer?: () => JSX.Element;
}

export function PopoverNotificationCenter({ children, ...props }: IPopoverNotificationCenterProps) {
  const [unseenCount, setUnseenCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const count = (await getUnseenCount()).count;
      setUnseenCount(count);

      if (props.onUnseenCountChanged) {
        props.onUnseenCountChanged(count);
      }
    })();
  }, []);

  function handlerOnUnseenCount(count: number) {
    if (isNaN(count)) return;
    setUnseenCount(count);

    if (props.onUnseenCountChanged) {
      props.onUnseenCountChanged(count);
    }
  }

  return (
    <Popover bell={(bellProps) => children(bellProps)} unseenCount={unseenCount}>
      <NotificationCenter
        onNotificationClick={props.onNotificationClick}
        onUnseenCountChanged={handlerOnUnseenCount}
        onUrlChange={props.onUrlChange}
        header={props.header}
        footer={props.footer}
      />
    </Popover>
  );
}
