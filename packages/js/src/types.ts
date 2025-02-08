import { NovuError } from './utils/errors';

export { type FiltersCountResponse, type ListNotificationsResponse } from './notifications';
export type { Notification } from './notifications';
export type { Preference } from './preferences/preference';
export type { NovuError } from './utils/errors';

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

export enum WebSocketEvent {
  RECEIVED = 'notification_received',
  UNREAD = 'unread_count_changed',
  UNSEEN = 'unseen_count_changed',
}

export enum ActionTypeEnum {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export type Session = {
  token: string;
  totalUnreadCount: number;
  removeNovuBranding: boolean;
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

export type Subscriber = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
};

export type Redirect = {
  url: string;
  target?: '_self' | '_blank' | '_parent' | '_top' | '_unfencedTop';
};

export type Action = {
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
  channelType: ChannelType;
  tags?: string[];
  data?: Record<string, unknown>;
  redirect?: Redirect;
};

export type NotificationFilter = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
};

export type Workflow = {
  id: string;
  identifier: string;
  name: string;
  critical: boolean;
  tags?: string[];
};

export type ChannelPreference = {
  email?: boolean;
  sms?: boolean;
  in_app?: boolean;
  chat?: boolean;
  push?: boolean;
};

export type PaginatedResponse<T = unknown> = {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
};

export type PreferencesResponse = {
  level: PreferenceLevel;
  enabled: boolean;
  channels: ChannelPreference;
  overrides?: IPreferenceOverride[];
  workflow?: Workflow;
};

export enum PreferenceOverrideSourceEnum {
  SUBSCRIBER = 'subscriber',
  TEMPLATE = 'template',
  WORKFLOW_OVERRIDE = 'workflowOverride',
}

export type IPreferenceOverride = {
  channel: ChannelType;
  source: PreferenceOverrideSourceEnum;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TODO = any;

export type Result<D = undefined, E = NovuError> = Promise<{
  data?: D;
  error?: E;
}>;

export type NovuOptions = {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
  // @deprecated use apiUrl instead
  backendUrl?: string;
  apiUrl?: string;
  socketUrl?: string;
  useCache?: boolean;
  /**
   * @internal Should be used internally
   */
  __userAgent?: string;
};

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
