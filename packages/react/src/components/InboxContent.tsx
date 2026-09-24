import type { InboxPage, NotificationActionClickHandler, NotificationClickHandler } from '@novu/js/ui';
import React, { useMemo } from 'react';
import { useNotificationOutlets } from '../hooks/internal/useNotificationOutlets';
import { NoRendererProps, NotificationRendererProps, SubjectBodyRendererProps } from '../utils/types';
import { Mounter } from './Mounter';

export type InboxContentProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  initialPage?: InboxPage;
  hideNav?: boolean;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

export const InboxContent = React.memo((props: InboxContentProps) => {
  const { onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, initialPage, hideNav } = props;
  const outlets = useNotificationOutlets(props);

  const mountProps = useMemo(
    () => ({ ...outlets, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, initialPage, hideNav }),
    [outlets, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, initialPage, hideNav]
  );

  return <Mounter name="InboxContent" props={mountProps} />;
});

InboxContent.displayName = 'InboxContent';
