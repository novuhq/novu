import { notificationItemStyles } from '@novu/js/ui-core';
import React from 'react';
import { useStyle } from '../../../hooks/internal/useEngineStores';
import { useNotificationItem } from '../context';

export type NotificationItemAvatarProps = { className?: string };

export const Avatar = ({ className }: NotificationItemAvatarProps) => {
  const { notification, renderers } = useNotificationItem('Avatar');
  const style = useStyle();

  if (renderers.renderAvatar) {
    return <>{renderers.renderAvatar(notification)}</>;
  }

  if (!notification.avatar) {
    return (
      <div
        className={style({
          key: notificationItemStyles.avatarFallback.key,
          className: [notificationItemStyles.avatarFallback.className, className].filter(Boolean).join(' '),
          context: { notification },
        })}
      />
    );
  }

  return (
    <img
      alt=""
      className={style({
        key: notificationItemStyles.avatar.key,
        className: [notificationItemStyles.avatar.className, className].filter(Boolean).join(' '),
        context: { notification },
      })}
      src={notification.avatar}
    />
  );
};
