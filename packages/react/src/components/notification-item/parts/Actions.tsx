import React, { useMemo } from 'react';
import { Mounter } from '../../Mounter';
import { useNotificationItem } from '../context';

/**
 * The read, archive and snooze controls. An island: the engine renders it into this block, so the dropdowns,
 * tooltips and pickers exist once. Clicks inside it never reach the item's own click handler.
 */
export const DefaultActions = () => {
  const { notification, renderers } = useNotificationItem('DefaultActions');
  const mountProps = useMemo(() => ({ notification }), [notification]);

  if (renderers.renderDefaultActions) {
    return <>{renderers.renderDefaultActions(notification)}</>;
  }

  return <Mounter name="NotificationDefaultActions" props={mountProps} bare />;
};

/** The primary and secondary action buttons. An island, like the default actions. */
export const CustomActions = () => {
  const { notification, handlers, renderers } = useNotificationItem('CustomActions');
  const { onPrimaryActionClick, onSecondaryActionClick } = handlers;
  const mountProps = useMemo(
    () => ({ notification, onPrimaryActionClick, onSecondaryActionClick }),
    [notification, onPrimaryActionClick, onSecondaryActionClick]
  );

  if (renderers.renderCustomActions) {
    return <>{renderers.renderCustomActions(notification)}</>;
  }

  return <Mounter name="NotificationCustomActions" props={mountProps} bare />;
};
