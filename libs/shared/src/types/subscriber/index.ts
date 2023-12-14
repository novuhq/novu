import { CustomDataType } from '../shared';

export type ExternalSubscriberId = string;
export type SubscriberId = string;

export type SubscriberCustomData = CustomDataType;

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: SubscriberCustomData;
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
