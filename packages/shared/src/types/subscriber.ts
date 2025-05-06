import { CustomDataType } from './utils';
import { ChatProviderIdEnum, PushProviderIdEnum } from './providers';

export interface IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}

export type ExternalSubscriberId = string;
export type SubscriberId = string;

export type SubscriberCustomData = CustomDataType;

export interface ISubscriberChannel {
  providerId: ChatProviderIdEnum | PushProviderIdEnum;
  integrationIdentifier?: string;
  credentials: IChannelCredentials;
}

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: SubscriberCustomData;
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
