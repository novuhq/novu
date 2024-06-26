import { ActorTypeEnum, ChannelTypeEnum, ButtonTypeEnum } from '@novu/shared';

type Avatar = {
  type: ActorTypeEnum;
  data: string | null;
};

export type Subscriber = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
};

type Action = {
  type: ButtonTypeEnum;
  label: string;
  url?: string;
};

export type InboxNotification = {
  id: string;
  subject?: string;
  body: string;
  to: Subscriber;
  read?: boolean;
  archived?: boolean;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  actor?: Subscriber;
  avatar?: Avatar;
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
