export enum ActorTypeEnum {
  NONE = 'none',
  USER = 'user',
  SYSTEM_ICON = 'system_icon',
  SYSTEM_CUSTOM = 'system_custom',
}

export enum ButtonTypeEnum {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export enum ChannelTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
}

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
  isCompleted: boolean;
};

export type Notification = {
  id: string;
  subject?: string;
  body: string;
  to: Subscriber;
  read?: boolean;
  archived?: boolean;
  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
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
