import type { BaseNovuUIOptions } from '@novu/js/ui';
import type { Notification } from '@novu/js';

export type NotificationsRenderProps = (notification: Notification) => React.ReactNode;

export type DefaultInboxProps = {
  renderNotification?: (notification: Notification) => React.ReactNode;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => React.ReactNode;
};

export type BaseProps = BaseNovuUIOptions;

export type DefaultProps = BaseProps &
  DefaultInboxProps & {
    children?: never;
  };

export type WithChildrenProps = BaseProps & {
  children: React.ReactNode;
};

export type { Notification };
