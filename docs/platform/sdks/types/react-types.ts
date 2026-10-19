import type { AllAppearance, AllElements, Variables } from '@novu/js/ui';
import type {
  BellProps,
  InboxContentProps,
  InboxProps as InboxPropsInternal,
  NotificationProps,
  Notification as NotificationType,
  SlackConnectButtonProps,
  SubscriptionAppearance,
  SubscriptionProps,
  UseNotificationsProps,
  UseNotificationsResult,
} from '@novu/react';

export type InboxProps = Omit<InboxPropsInternal, 'children'>;
export type { BellProps, InboxContentProps, NotificationProps };

export type InboxAppearanceProps = Omit<AllAppearance, 'elements'>;

export type InboxAppearanceVariables = Variables;
export type InboxAppearanceElements = AllElements;

export type { SubscriptionProps, SubscriptionAppearance };

export type { UseNotificationsProps, UseNotificationsResult };
export type { NotificationType };

export type { SlackConnectButtonProps };
