import type { InboxNotification } from '@novu/js';
import type { BaseNovuUIOptions } from '@novu/js/ui';

export type Notification = InboxNotification;
export type NotificationsRenderProps = (notification: Notification) => React.ReactNode;

export type InboxDefaultProps = {
  renderNotification?: (notification: Notification) => React.ReactNode;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => React.ReactNode;
};

export type BaseProps = BaseNovuUIOptions;

export type DefaultProps = BaseProps &
  InboxDefaultProps & {
    children?: never;
  };

export type WithChildrenProps = BaseProps & {
  children: React.ReactNode;
};
