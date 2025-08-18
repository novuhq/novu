import type {
  ChannelTypeEnum,
  CustomDataType,
  IPreferenceChannels,
  PreferenceLevelEnum,
  Redirect,
  SeverityLevelEnum,
} from '@novu/shared';

export type Subscriber = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
};

type Action = {
  label: string;
  isCompleted: boolean;
  redirect?: Redirect;
};

export type InboxNotification = {
  id: string;
  transactionId: string;
  subject?: string;
  body: string;
  to: Subscriber;
  isRead: boolean;
  isSeen: boolean;
  isArchived: boolean;
  isSnoozed: boolean;
  snoozedUntil?: string | null;
  deliveredAt?: string[];
  createdAt: string;
  readAt?: string | null;
  firstSeenAt?: string | null;
  archivedAt?: string | null;
  avatar?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  channelType: ChannelTypeEnum;
  tags?: string[];
  data?: Record<string, unknown>;
  redirect?: Redirect;
  workflow?: {
    id: string;
    identifier: string;
    name: string;
    critical: boolean;
    tags?: string[];
    data?: CustomDataType;
    severity: SeverityLevelEnum;
  };
  severity: SeverityLevelEnum;
};

export type NotificationFilter = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
  snoozed?: boolean;
  seen?: boolean;
  data?: string;
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
};

export type InboxPreference = {
  level: PreferenceLevelEnum;
  enabled: boolean;
  channels: IPreferenceChannels;
  workflow?: {
    id: string;
    identifier: string;
    name: string;
    critical: boolean;
    tags?: string[];
    data?: CustomDataType;
    severity: SeverityLevelEnum;
  };
};
