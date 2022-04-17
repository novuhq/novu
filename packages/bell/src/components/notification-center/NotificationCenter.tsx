import React from 'react';
import { IMessage } from '@novu/shared';

import { App } from './components/App';

export interface INotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  bell?: JSX.Element | Element;
}

export function NotificationCenter(props: INotificationCenterProps) {
  return (
    <App
      onNotificationClick={props.onNotificationClick}
      onUnseenCountChanged={props.onUnseenCountChanged}
      onUrlChange={props.onUrlChange}
      bell={props.bell}
    />
  );
}
