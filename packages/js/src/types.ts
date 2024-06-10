export enum NotificationStatus {
  READ = 'read',
  SEEN = 'seen',
  UNREAD = 'unread',
  UNSEEN = 'unseen',
}

export enum NotificationButton {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export enum NotificationActionStatus {
  PENDING = 'pending',
  DONE = 'done',
}

export enum ActorType {
  NONE = 'none',
  USER = 'user',
  SYSTEM_ICON = 'system_icon',
  SYSTEM_CUSTOM = 'system_custom',
}

export enum CtaType {
  REDIRECT = 'redirect',
}

export enum PreferenceLevel {
  GLOBAL = 'global',
  TEMPLATE = 'template',
}

export enum ChannelType {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
}

export enum PreferenceOverrideSource {
  SUBSCRIBER = 'subscriber',
  TEMPLATE = 'template',
  WORKFLOW_OVERRIDE = 'workflowOverride',
}

export type Session = {
  token: string;
  profile: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    subscriberId: string;
    organizationId: string;
    environmentId: string;
    aud: 'widget_user';
  };
};

export type Actor = {
  type: ActorType;
  data: string | null;
};

export type ChannelCredentials = {
  webhookUrl?: string;
  deviceTokens?: string[];
};

export type SubscriberChannel = {
  providerId: string;
  integrationIdentifier?: string;
  credentials: ChannelCredentials;
};

export type Subscriber = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  subscriberId: string;
  channels?: SubscriberChannel[];
  isOnline?: boolean;
  lastOnlineAt?: string;
  _organizationId: string;
  _environmentId: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
};

export type MessageButton = {
  type: NotificationButton;
  content: string;
  resultContent?: string;
};

export type MessageAction = {
  status?: NotificationActionStatus;
  buttons?: MessageButton[];
  result: {
    payload?: Record<string, unknown>;
    type?: NotificationButton;
  };
};

export type Cta = {
  type: CtaType;
  data: {
    url?: string;
  };
  action?: MessageAction;
};

export type WorkflowInfo = {
  _id: string;
  name: string;
  critical: boolean;
  tags?: string[];
  identifier: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
};

export type ChannelPreference = {
  email?: boolean;
  sms?: boolean;
  in_app?: boolean;
  chat?: boolean;
  push?: boolean;
};

export type ChannelPreferenceOverride = {
  channel: ChannelType;
  source: PreferenceOverrideSource;
};

export type PaginatedResponse<T = unknown> = {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TODO = any;
