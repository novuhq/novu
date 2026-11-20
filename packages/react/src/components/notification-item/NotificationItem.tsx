import type { Notification } from '@novu/js';
import { SeverityLevelEnum } from '@novu/js';
import type { NotificationActionClickHandler, NotificationClickHandler } from '@novu/js/ui';
import {
  cn,
  createNotificationItemController,
  isInsideIsland,
  notificationItemStyles,
  SEVERITY_TO_BAR_KEYS,
  SEVERITY_TO_NOTIFICATION_KEYS,
} from '@novu/js/ui-core';
import React, { type ReactNode, useMemo, useRef } from 'react';
import { useEngineStores, useStyle } from '../../hooks/internal/useEngineStores';
import {
  type NotificationItemContextValue,
  NotificationItemProvider,
  useInheritedNotificationHandlers,
} from './context';
import { CustomActions, DefaultActions } from './parts/Actions';
import { Avatar } from './parts/Avatar';
import { Content, Text } from './parts/Content';
import { Date } from './parts/Date';
import { Dot } from './parts/Dot';
import { Body, Subject } from './parts/Subject';

export type NotificationItemProps = {
  notification: Notification;
  /** Your own arrangement of the parts. Without it, the built-in arrangement is rendered. */
  children?: ReactNode;
  className?: string;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  renderAvatar?: (notification: Notification) => ReactNode;
  renderSubject?: (notification: Notification) => ReactNode;
  renderBody?: (notification: Notification) => ReactNode;
  renderDefaultActions?: (notification: Notification) => ReactNode;
  renderCustomActions?: (notification: Notification) => ReactNode;
};

const DefaultArrangement = () => (
  <>
    <Avatar />
    <Content>
      <Text>
        <Subject />
        <Body />
      </Text>
      <DefaultActions />
      <CustomActions />
      <Date />
    </Content>
    <Dot />
  </>
);

/**
 * The built-in notification item, rendered natively in React.
 *
 * `<NotificationItem notification={n} />` is the default look. Pass children to arrange the parts yourself:
 * `NotificationItem.Avatar`, `Content`, `Text`, `Subject`, `Body`, `DefaultActions`, `CustomActions`, `Date`
 * and `Dot`. The root carries the item's behaviour in both modes: severity styling, the hover group, and the
 * click that marks the notification read and follows its redirect. Handlers fall back to the ones given to
 * `Inbox`, `Notifications` or `InboxContent`.
 */
const NotificationItemRoot = (props: NotificationItemProps) => {
  const {
    notification,
    children,
    className,
    onNotificationClick,
    onPrimaryActionClick,
    onSecondaryActionClick,
    renderAvatar,
    renderSubject,
    renderBody,
    renderDefaultActions,
    renderCustomActions,
  } = props;
  const style = useStyle();
  const { inbox } = useEngineStores();
  const inherited = useInheritedNotificationHandlers();

  const handlers = useMemo(
    () => ({
      onNotificationClick: onNotificationClick ?? inherited.onNotificationClick,
      onPrimaryActionClick: onPrimaryActionClick ?? inherited.onPrimaryActionClick,
      onSecondaryActionClick: onSecondaryActionClick ?? inherited.onSecondaryActionClick,
    }),
    [onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, inherited]
  );

  const latest = useRef({ notification, handlers });
  latest.current = { notification, handlers };
  const controller = useMemo(
    () =>
      createNotificationItemController({
        notification: () => latest.current.notification,
        handlers: () => latest.current.handlers,
        navigate: inbox.navigate,
      }),
    [inbox]
  );

  const contextValue = useMemo<NotificationItemContextValue>(
    () => ({
      notification,
      handlers,
      renderers: { renderAvatar, renderSubject, renderBody, renderDefaultActions, renderCustomActions },
    }),
    [notification, handlers, renderAvatar, renderSubject, renderBody, renderDefaultActions, renderCustomActions]
  );

  const severity = notification.severity ?? SeverityLevelEnum.NONE;

  return (
    <NotificationItemProvider value={contextValue}>
      <a
        className={style({
          key: SEVERITY_TO_NOTIFICATION_KEYS[severity],
          className: cn(
            notificationItemStyles.root.className,
            notificationItemStyles.root.severity[severity],
            { [notificationItemStyles.root.clickable]: controller.isClickable() },
            className
          ),
          context: { notification },
        })}
        onClick={(event) => {
          if (!isInsideIsland(event.target)) {
            event.stopPropagation();
          }
          void controller.handleClick(event.nativeEvent);
        }}
      >
        <div
          className={style({
            key: SEVERITY_TO_BAR_KEYS[severity],
            className: cn(notificationItemStyles.bar.className, notificationItemStyles.bar.severity[severity]),
            context: { notification },
          })}
        />
        {children ?? <DefaultArrangement />}
      </a>
    </NotificationItemProvider>
  );
};

NotificationItemRoot.displayName = 'NotificationItem';

export const NotificationItem = Object.assign(NotificationItemRoot, {
  Avatar,
  Content,
  Text,
  Subject,
  Body,
  DefaultActions,
  CustomActions,
  Date,
  Dot,
});
