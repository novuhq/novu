import { notificationItemStyles } from '@novu/js/ui-core';
import React from 'react';
import { useStyle } from '../../../hooks/internal/useEngineStores';
import { useNotificationItem } from '../context';

export type NotificationItemDotProps = { className?: string };

/** The unread marker on the right edge of the item. */
export const Dot = ({ className }: NotificationItemDotProps) => {
  const { notification } = useNotificationItem('Dot');
  const style = useStyle();

  return (
    <div className={notificationItemStyles.dotContainer.className}>
      {!notification.isRead && (
        <span
          className={style({
            key: notificationItemStyles.dot.key,
            className: [notificationItemStyles.dot.className, className].filter(Boolean).join(' '),
            context: { notification },
          })}
        />
      )}
    </div>
  );
};
