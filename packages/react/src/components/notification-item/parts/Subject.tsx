import { notificationItemStyles } from '@novu/js/ui-core';
import React, { type ReactNode } from 'react';
import { useStyle } from '../../../hooks/internal/useEngineStores';
import { useNotificationItem } from '../context';
import { Markdown } from '../Markdown';

export type NotificationItemSubjectProps = { className?: string; children?: ReactNode };

export const Subject = ({ className, children }: NotificationItemSubjectProps) => {
  const { notification, renderers } = useNotificationItem('Subject');
  const style = useStyle();

  if (renderers.renderSubject) {
    return <>{renderers.renderSubject(notification)}</>;
  }

  if (children === undefined && !notification.subject) {
    return null;
  }

  return (
    <p
      className={style({
        key: notificationItemStyles.subject.key,
        className: [notificationItemStyles.subject.className, className].filter(Boolean).join(' '),
        context: { notification },
      })}
    >
      {children ?? (
        <Markdown
          strongKey={notificationItemStyles.subject.strongKey}
          emKey={notificationItemStyles.subject.emKey}
          context={{ notification }}
        >
          {notification.subject ?? ''}
        </Markdown>
      )}
    </p>
  );
};

export type NotificationItemBodyProps = { className?: string; children?: ReactNode };

export const Body = ({ className, children }: NotificationItemBodyProps) => {
  const { notification, renderers } = useNotificationItem('Body');
  const style = useStyle();

  if (renderers.renderBody) {
    return <>{renderers.renderBody(notification)}</>;
  }

  return (
    <p
      className={style({
        key: notificationItemStyles.body.key,
        className: [notificationItemStyles.body.className, className].filter(Boolean).join(' '),
        context: { notification },
      })}
    >
      {children ?? (
        <Markdown
          strongKey={notificationItemStyles.body.strongKey}
          emKey={notificationItemStyles.body.emKey}
          context={{ notification }}
        >
          {notification.body}
        </Markdown>
      )}
    </p>
  );
};
