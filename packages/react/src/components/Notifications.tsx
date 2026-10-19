import type { NotificationActionClickHandler, NotificationClickHandler } from '@novu/js/ui';
import React, { useMemo } from 'react';
import { useNotificationOutlets } from '../hooks/internal/useNotificationOutlets';
import { NoRendererProps, NotificationRendererProps, SubjectBodyRendererProps } from '../utils/types';
import { Mounter } from './Mounter';
import { OutletScope } from './OutletScope';

export type NotificationProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

const NotificationsMount = (props: NotificationProps) => {
  const { onNotificationClick, onPrimaryActionClick, onSecondaryActionClick } = props;
  const outlets = useNotificationOutlets(props);

  const mountProps = useMemo(
    () => ({ ...outlets, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick }),
    [outlets, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );

  return <Mounter name="Notifications" props={mountProps} />;
};

export const Notifications = React.memo((props: NotificationProps) => (
  <OutletScope>
    <NotificationsMount {...props} />
  </OutletScope>
));

Notifications.displayName = 'Notifications';
