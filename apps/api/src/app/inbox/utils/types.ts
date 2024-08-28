import type { ChannelTypeEnum, UrlTarget } from '@novu/shared';

export type Subscriber = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
};

type Redirect = {
  url?: string;
  target?: UrlTarget;
};

type Action = {
  label: string;
  isCompleted: boolean;
  redirect?: Redirect;
};

export type InboxNotification = {
  id: string;
  subject?: string;
  body: string;
  to: Subscriber;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
  avatar?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  channelType: ChannelTypeEnum;
  tags?: string[];
  data?: Record<string, unknown>;
  redirect?: Redirect;
};

export type NotificationFilter = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
};
