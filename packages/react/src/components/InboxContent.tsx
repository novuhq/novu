import type { InboxPage, NotificationActionClickHandler, NotificationClickHandler } from '@novu/js/ui';
import React, { useMemo } from 'react';
import { useNotificationOutlets } from '../hooks/internal/useNotificationOutlets';
import { NoRendererProps, NotificationRendererProps, SubjectBodyRendererProps } from '../utils/types';
import { Mounter } from './Mounter';
import { OutletScope } from './OutletScope';

export type InboxContentProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  initialPage?: InboxPage;
  hideNav?: boolean;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

const InboxContentMount = (props: InboxContentProps) => {
  const { onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, initialPage, hideNav } = props;
  const outlets = useNotificationOutlets(props);

  const mountProps = useMemo(
    () => ({ ...outlets, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, initialPage, hideNav }),
    [outlets, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, initialPage, hideNav]
  );

  return <Mounter name="InboxContent" props={mountProps} />;
};

export const InboxContent = React.memo((props: InboxContentProps) => (
  <OutletScope>
    <InboxContentMount {...props} />
  </OutletScope>
));

InboxContent.displayName = 'InboxContent';
