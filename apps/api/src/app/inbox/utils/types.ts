import type { ChannelTypeEnum } from '@novu/shared';

export type Subscriber = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
};

type Action = {
  label: string;
  url?: string;
  isCompleted: boolean;
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
};

export type NotificationFilter = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
};
