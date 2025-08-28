import { NovuError } from './utils/errors';

export type { FiltersCountResponse, ListNotificationsResponse, Notification } from './notifications';
export type { Preference } from './preferences/preference';
export type { NovuError } from './utils/errors';

declare global {
  /**
   * If you want to provide custom types for the notification.data object,
   * simply redeclare this rule in the global namespace.
   * Every notification object will use the provided type.
   */
  interface NotificationData {
    [k: string]: unknown;
  }
}

export enum NotificationStatus {
  READ = 'read',
  SEEN = 'seen',
  SNOOZED = 'snoozed',
  UNREAD = 'unread',
  UNSEEN = 'unseen',
  UNSNOOZED = 'unsnoozed',
}

export enum NotificationButton {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export enum NotificationActionStatus {
  PENDING = 'pending',
  DONE = 'done',
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

export enum WebSocketEvent {
  RECEIVED = 'notification_received',
  UNREAD = 'unread_count_changed',
  UNSEEN = 'unseen_count_changed',
}

export enum SocketType {
  SOCKET_IO = 'socket.io',
  PARTY_SOCKET = 'partysocket',
}

export enum SeverityLevelEnum {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export enum WorkflowCriticalityEnum {
  CRITICAL = 'critical',
  NON_CRITICAL = 'nonCritical',
  ALL = 'all',
}

export type UnreadCount = {
  total: number;
  severity: Record<SeverityLevelEnum, number>;
};

export type Session = {
  token: string;
  /** @deprecated Use unreadCount.total instead */
  totalUnreadCount: number;
  unreadCount: UnreadCount;
  removeNovuBranding: boolean;
  isDevelopmentMode: boolean;
  maxSnoozeDurationHours: number;
  applicationIdentifier?: string;
};

export type Subscriber = {
  id?: string;
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: Record<string, unknown>;
  timezone?: string;
};

export type Redirect = {
  url: string;
  target?: '_self' | '_blank' | '_parent' | '_top' | '_unfencedTop';
};

export enum ActionTypeEnum {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export type Action = {
  label: string;
  isCompleted: boolean;
  redirect?: Redirect;
};

export type Workflow = {
  id: string;
  identifier: string;
  name: string;
  critical: boolean;
  tags?: string[];
  severity: SeverityLevelEnum;
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
  channelType: ChannelType;
  tags?: string[];
  data?: NotificationData;
  redirect?: Redirect;
  workflow?: Workflow;
  severity: SeverityLevelEnum;
};

export type NotificationFilter = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
  snoozed?: boolean;
  seen?: boolean;
  data?: Record<string, unknown>;
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
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

export type TODO = any;

export type Result<D = undefined, E = NovuError> = Promise<{
  data?: D;
  error?: E;
}>;

type KeylessNovuOptions = {} & { [K in string]?: never }; // empty object,disallows all unknown keys

export type StandardNovuOptions = {
  /** @deprecated Use apiUrl instead  */
  backendUrl?: string;
  /** @internal Should be used internally for testing purposes */
  __userAgent?: string;
  applicationIdentifier: string;
  subscriberHash?: string;
  apiUrl?: string;
  socketUrl?: string;
  useCache?: boolean;
} & (
  | {
      // TODO: Backward compatibility support - remove in future versions (see NV-5801)
      /** @deprecated Use subscriber prop instead */
      subscriberId: string;
      subscriber?: never;
    }
  | {
      subscriber: Subscriber | string;
      subscriberId?: never;
    }
);

export type NovuOptions = KeylessNovuOptions | StandardNovuOptions;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
