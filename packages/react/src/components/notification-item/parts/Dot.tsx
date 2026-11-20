import { notificationItemStyles } from '@novu/js/ui-core';
import React from 'react';
import { useStyle } from '../../../hooks/internal/useEngineStores';
import { usePresence } from '../../../hooks/internal/usePresence';
import { useNotificationItem } from '../context';

export type NotificationItemDotProps = { className?: string };

/** The unread marker on the right edge of the item. It scales out when the item is read and back in when unread. */
export const Dot = ({ className }: NotificationItemDotProps) => {
  const { notification } = useNotificationItem('Dot');
  const style = useStyle();
  const dot = usePresence<HTMLSpanElement>(!notification.isRead, { appear: false });

  return (
    <div className={notificationItemStyles.dotContainer.className}>
      {dot.isMounted && (
        <span
          ref={dot.ref}
          className={style({
            key: notificationItemStyles.dot.key,
            className: [notificationItemStyles.dot.className, className].filter(Boolean).join(' '),
            context: { notification },
          })}
          data-state={dot.state}
        />
      )}
    </div>
  );
};
