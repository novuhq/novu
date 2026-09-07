import { notificationItemStyles } from '@novu/js/ui-core';
import React, { type ReactNode } from 'react';
import { useStyle } from '../../../hooks/internal/useEngineStores';
import { useNotificationItem } from '../context';

export type NotificationItemContentProps = { className?: string; children?: ReactNode };

/** The column next to the avatar that holds the text, the actions and the date. */
export const Content = ({ className, children }: NotificationItemContentProps) => {
  const { notification } = useNotificationItem('Content');
  const style = useStyle();

  return (
    <div
      className={style({
        key: notificationItemStyles.content.key,
        className: [notificationItemStyles.content.className, className].filter(Boolean).join(' '),
        context: { notification },
      })}
    >
      {children}
    </div>
  );
};

export type NotificationItemTextProps = { className?: string; children?: ReactNode };

/** Groups the subject and the body. */
export const Text = ({ className, children }: NotificationItemTextProps) => {
  const { notification } = useNotificationItem('Text');
  const style = useStyle();

  return (
    <div
      className={style({
        key: notificationItemStyles.textContainer.key,
        className: [notificationItemStyles.textContainer.className, className].filter(Boolean).join(' '),
        context: { notification },
      })}
    >
      {children}
    </div>
  );
};
