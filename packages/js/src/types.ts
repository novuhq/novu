import type { RulesLogic } from 'json-logic-js';
import type { GetToken } from './session/token-source';
import { NovuError } from './utils/errors';

export type { FiltersCountResponse, ListNotificationsResponse } from './notifications';
export type { Notification } from './notifications/notification';
export type { Preference } from './preferences/preference';
export type { Schedule } from './preferences/schedule';
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
  TOOL = 'tool',
}

export enum WebSocketEvent {
  RECEIVED = 'notification_received',
  UNREAD = 'unread_count_changed',
  UNSEEN = 'unseen_count_changed',
  AGENT_EVENT = 'agent_event',
}

export enum SocketType {
  SOCKET_IO = 'socket.io',
  PARTY_SOCKET = 'partysocket',
}

export type SocketTypeOption = 'cloud' | 'self-hosted';

export type NovuSocketOptions = {
  socketType?: SocketTypeOption;
  [key: string]: unknown;
};

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
  contextKeys?: string[];
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

export type TagsFilterOrGroup = { or: string[] };

export type TagsFilterAndForm = { and: TagsFilterOrGroup[] };

/**
 * Inbox tag filter: a **single** OR-group as `string[]` or `{ or: string[] }`, or **multiple** OR-groups (AND of OR) as `{ and: [{ or: string[] }, ...] }`.
 *
 * @example Single OR-group — match notifications tagged `promo` **or** `sale`
 * ```ts
 * const tags: TagsFilter = ['promo', 'sale'];
 * ```
 *
 * @example AND of OR-groups — match (`urgent` **or** `critical`) **and** (`billing`)
 * ```ts
 * const tags: TagsFilter = {
 *   and: [{ or: ['urgent', 'critical'] }, { or: ['billing'] }],
 * };
 * ```
 */
export type TagsFilter = string[] | TagsFilterOrGroup | TagsFilterAndForm;

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
  tags?: TagsFilter;
  read?: boolean;
  archived?: boolean;
  snoozed?: boolean;
  seen?: boolean;
  /**
   * Filter notifications by keys in their `data` object.
   *
   * Each top-level key value can be:
   *  - a scalar (exact equality)
   *  - `Scalar[]` (OR — match any of the listed values)
   *  - `{ or: Scalar[] }` (explicit OR)
   *  - `{ and: [{ or: Scalar[] }, ...] }` (AND of OR-groups)
   *  - a 1-level nested object whose sub-keys follow the same rules
   *
   * Across keys clauses are AND-ed together.
   */
  data?: Record<string, unknown>;
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
  createdGte?: number;
  createdLte?: number;
};

export type ChannelPreference = {
  email?: boolean;
  sms?: boolean;
  in_app?: boolean;
  chat?: boolean;
  push?: boolean;
  tool?: boolean;
};

export type PaginatedResponse<T = unknown> = {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
};

export type TimeRange = {
  start: string;
  end: string;
};

export type DaySchedule = {
  isEnabled: boolean;
  hours?: Array<TimeRange>;
};

export type WeeklySchedule = {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
};

export type DefaultSchedule = {
  isEnabled?: boolean;
  weeklySchedule?: WeeklySchedule;
};

export type ContextValue =
  | string
  | {
      id: string;
      data?: Record<string, unknown>;
    };

export type Context = Partial<Record<string, ContextValue>>;

export type PreferencesResponse = {
  level: PreferenceLevel;
  enabled: boolean;
  condition?: RulesLogic;
  subscriptionId?: string;
  channels: ChannelPreference;
  overrides?: IPreferenceOverride[];
  workflow?: Workflow;
  schedule?: {
    isEnabled: boolean;
    weeklySchedule?: WeeklySchedule;
  };
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

export type SubscriptionPreferenceResponse = Omit<
  PreferencesResponse,
  'subscriptionId' | 'workflow' | 'schedule' | 'level' | 'channels'
> & {
  subscriptionId: string;
  workflow: Workflow;
};

export type SubscriptionResponse = {
  id: string;
  identifier: string;
  name?: string;
  preferences?: Array<SubscriptionPreferenceResponse>;
};

export type Options = {
  refetch?: boolean;
  useCache?: boolean;
};

export type Result<D = undefined, E = NovuError> = Promise<{
  data?: D;
  error?: E;
}>;

type KeylessNovuOptions = {} & { [K in string]?: never }; // empty object,disallows all unknown keys

type CommonNovuOptions = {
  /** @deprecated Use apiUrl instead  */
  backendUrl?: string;
  apiUrl?: string;
  socketUrl?: string;
  /**
   * Custom socket configuration options. These options will be merged with the default socket configuration.
   * Use `socketType` to explicitly select the socket implementation: `'cloud'` for PartySocket or `'self-hosted'` for socket.io.
   * For socket.io-client connections, supports all socket.io-client options (e.g., `path`, `reconnectionDelay`, `timeout`, etc.).
   * For PartySocket connections, options are applied to the WebSocket instance.
   */
  socketOptions?: NovuSocketOptions;
  useCache?: boolean;
  defaultSchedule?: DefaultSchedule;
};

export type StandardNovuOptions = CommonNovuOptions & {
  applicationIdentifier: string;
  subscriberHash?: string;
  contextHash?: string;
  context?: Context;
  tokenEndpoint?: never;
  getToken?: never;
  initialToken?: never;
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

type TokenSourceOptions =
  | {
      /**
       * Your backend route that answers `POST` with `{ token }` for the signed-in user, called whenever a new token is
       * needed. Only `token` is read: its own expiry decides when it is renewed.
       *
       * The request sends the browser's cookies (`credentials: 'include'`), so an endpoint on another origin needs
       * CORS that allows credentials. If it needs a header (a CSRF token, a bearer token), use `getToken` instead.
       * A failed request surfaces as a session error.
       */
      tokenEndpoint: string;
      getToken?: never;
    }
  | {
      /**
       * Returns a subscriber token from your backend whenever one is needed. Use it when your endpoint needs custom
       * headers (CSRF, bearer).
       *
       * Return a newly minted token on every call. A cached token keeps failing with 401 once it expires, and the
       * client asks again every 10 seconds. An error thrown here surfaces as a session error.
       */
      getToken: GetToken;
      tokenEndpoint?: never;
    };

/**
 * Signs in with subscriber tokens minted by your backend, renewed before they expire.
 *
 * When getting a token fails, calls made in the next 10 seconds fail at once with a session error. The first call
 * after that tries again, so an Inbox mounted before the user finished signing in recovers on its own.
 *
 * On sign-out, drop the `Novu` instance (in React, unmount `NovuProvider` or change its `key`). The client learns of
 * a new user only at the next renewal, and until then it keeps the previous user's session.
 */
export type TokenNovuOptions = CommonNovuOptions &
  TokenSourceOptions & {
    applicationIdentifier: string;
    /** A token rendered by your server, used for the first session so the Inbox loads without a round trip. */
    initialToken?: string;
    /** Ignored with a warning: the token decides who the user is. */
    subscriber?: Subscriber | string;
    /** Ignored with a warning: the token decides who the user is. */
    subscriberId?: string;
    /** Ignored with a warning: the token decides the context. */
    context?: Context;
    /** Ignored with a warning: the token replaces HMAC hashes. */
    subscriberHash?: string;
    /** Ignored with a warning: the token replaces HMAC hashes. */
    contextHash?: string;
  };

export type NovuOptions = KeylessNovuOptions | StandardNovuOptions | TokenNovuOptions;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
