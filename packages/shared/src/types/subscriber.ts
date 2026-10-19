import { ChatProviderIdEnum, PushProviderIdEnum } from './providers';
import { CustomDataType } from './utils';

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
