import React, { useEffect } from 'react';
import { IMessage } from '@novu/shared';
import { NotificationCenter } from '../notification-center';
import { getUnseenCount } from '../../api/notifications';
import { INotificationBellProps } from '../notification-bell';
import { Popover } from './components/Popover';

interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  children: (props: INotificationBellProps) => JSX.Element;
  unseenCount: number;
}

export function PopoverNotificationCenter({ children, ...props }: IPopoverNotificationCenterProps) {
  const { unseenCount } = props;

  useEffect(() => {
    (async () => {
      if (props.onUnseenCountChanged) {
        props.onUnseenCountChanged((await getUnseenCount()).count);
      }
    })();
  }, []);

  function handlerOnUnseenCount(count: number) {
    if (isNaN(count)) return;
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
      />
    </Popover>
  );
}
