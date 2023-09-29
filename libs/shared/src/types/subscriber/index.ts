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

export enum PreferenceOverrideSourceEnum {
  SUBSCRIBER = 'subscriber',
  TEMPLATE = 'template',
}
