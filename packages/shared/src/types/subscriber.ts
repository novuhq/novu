import { ChannelTypeEnum } from './channel';
import { ChatProviderIdEnum, PushProviderIdEnum } from './providers';
import { CustomDataType } from './utils';

/**
 * Per-channel policy for preferred contact hours.
 * - `respect` (default): channel is gated by the preferred hours window
 * - `always`: channel may interrupt / deliver immediately outside the window
 */
export type PreferredHoursChannelPolicy = 'respect' | 'always';

/**
 * Optional per-channel overrides. Unset channels default to `respect`.
 */
export type PreferredHoursChannelOverrides = Partial<Record<ChannelTypeEnum, PreferredHoursChannelPolicy>>;

/**
 * Daily preferred contact hours for a subscriber, evaluated in their timezone.
 * Times use 24-hour `HH:mm` (e.g. `"09:00"`, `"18:00"`).
 * When unset/null, notifications are not restricted by time of day.
 * Overnight windows are supported when `end` is earlier than `start`
 * (e.g. start `"22:00"`, end `"06:00"`).
 *
 * `channelOverrides` lets specific channels (e.g. SMS) always deliver while
 * quieter channels (e.g. email) continue to respect the window.
 */
export type PreferredHours = {
  start: string;
  end: string;
  channelOverrides?: PreferredHoursChannelOverrides;
};

export interface ISubscriber {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  subscriberId: string;
  /**
   * @deprecated: use channelEndpoint instead
   */
  channels?: IChannelSettings[];
  topics?: string[];
  _organizationId: string;
  _environmentId: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
  lastOnlineAt?: string;
  data?: SubscriberCustomData;
  timezone?: string;
  /**
   * Optional daily window when the subscriber prefers to be contacted.
   * Absence or null means no time-of-day restriction.
   */
  preferredHours?: PreferredHours | null;
  __v?: number;
}

interface IChannelBase {
  providerId: ChatProviderIdEnum | PushProviderIdEnum;
  credentials: IChannelCredentials;
}

// Database storage (required integration ID)
/**
 * @deprecated: use ChannelEndpoint instead
 */
export interface IChannelSettings extends IChannelBase {
  _integrationId: string;
}

// API requests/payloads (optional integration identifier)
/**
 * @deprecated: use ChannelEndpoint instead
 */
export interface ISubscriberChannel extends IChannelBase {
  integrationIdentifier?: string;
}

/**
 * @deprecated: use ChannelEndpoint instead
 */
export interface IChannelCredentials {
  phoneNumber?: string;
  webhookUrl?: string;
  channel?: string;
  deviceTokens?: string[];
}

export type ExternalSubscriberId = string;
export type SubscriberId = string;

export type SubscriberCustomData = CustomDataType;

export interface ISubscriberPayload {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  locale?: string | null;
  timezone?: string | null;
  preferredHours?: PreferredHours | null;
  data?: SubscriberCustomData | null;
  /**
   * @deprecated: use channelEndpoint instead
   */
  channels?: ISubscriberChannel[];
}

export interface ISubscribersDefine extends ISubscriberPayload {
  subscriberId: string;
}

export interface ISubscribersSource extends ISubscribersDefine {
  _subscriberSource: SubscriberSourceEnum;
}

export enum SubscriberSourceEnum {
  BROADCAST = 'broadcast',
  SINGLE = 'single',
  TOPIC = 'topic',
}

export enum PreferenceOverrideSourceEnum {
  SUBSCRIBER = 'subscriber',
  TEMPLATE = 'template',
  WORKFLOW_OVERRIDE = 'workflowOverride',
}
