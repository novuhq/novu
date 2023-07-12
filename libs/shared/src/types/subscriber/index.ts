export type ExternalSubscriberId = string;
export type SubscriberId = string;

export type SubscriberCustomData = { [key: string]: string | string[] | boolean | number | undefined };

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: SubscriberCustomData;
  [key: string]: string | string[] | boolean | number | SubscriberCustomData | undefined;
}

export interface ISubscribersDefine extends ISubscriberPayload {
  subscriberId: string;
}
