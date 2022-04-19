import React, { useEffect } from 'react';
import { IMessage } from '@novu/shared';
import { NotificationCenter } from '../notification-center';
import { getUnseenCount } from '../../api/notifications';
import { INotificationBellProps } from '../notification-bell';
import { Popover } from './components/Popover';
import { IHeaderProps } from '../notification-center/components/layout/header/Header';

interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  children: (props: INotificationBellProps) => JSX.Element;
  unseenCount: number;
  header?: (props: IHeaderProps) => JSX.Element;
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
        header={props.header}
      />
    </Popover>
  );
}
