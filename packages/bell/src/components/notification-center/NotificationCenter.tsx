import React from 'react';
import { INotificationCenterProps } from '../../index';
import { App } from './components/App';

export function NotificationCenter(props: INotificationCenterProps) {
  return <App {...props} />;
}
