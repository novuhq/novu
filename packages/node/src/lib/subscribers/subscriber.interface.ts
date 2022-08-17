import { ChannelTypeEnum } from '@novu/shared';

export interface IChannelCredentials {
  webhookUrl?: string;
  notificationIdentifiers?: string[];
}

export interface ISubscribers {
  identify(subscriberId: string, data: ISubscriberPayload);
  update(subscriberId: string, data: ISubscriberPayload);
  delete(subscriberId: string);
  setCredentials(
    subscriberId: string,
    providerId: string,
    credentials: IChannelCredentials
  );
}

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  [key: string]: string | string[] | boolean | number | undefined;
}

export interface ISubscribersDefine extends ISubscriberPayload {
  subscriberId: string;
}

export interface IUpdateSubscriberPreferencePayload {
  channel?: {
    type: ChannelTypeEnum;
    enabled: boolean;
  };

  enabled?: boolean;
}

export type TriggerRecipientsTypeArray = string[] | ISubscribersDefine[];

export type TriggerRecipientsTypeSingle = string | ISubscribersDefine;

export type TriggerRecipientsType =
  | TriggerRecipientsTypeSingle
  | TriggerRecipientsTypeArray;

export interface ITriggerPayloadOptions {
  payload: ITriggerPayload;
  overrides?: ITriggerOverrides;
  to: TriggerRecipientsType;
}

export interface ITriggerPayload {
  attachments?: IAttachmentOptions[];
  [key: string]:
    | string
    | string[]
    | boolean
    | number
    | undefined
    | IAttachmentOptions
    | IAttachmentOptions[]
    | Record<string, unknown>;
}

export type ITriggerOverrides = {
  [key in
    | 'emailjs'
    | 'mailgun'
    | 'nodemailer'
    | 'plivo'
    | 'postmark'
    | 'sendgrid'
    | 'twilio']: object;
} & {
  [key in 'fcm']: ITriggerOverrideFCM;
} & {
  [key in 'apns']: ITriggerOverrideAPNS;
};

export type ITriggerOverrideFCM = {
  tag?: string;
  body?: string;
  icon?: string;
  badge?: string;
  color?: string;
  sound?: string;
  title?: string;
  bodyLocKey?: string;
  bodyLocArgs?: string;
  clickAction?: string;
  titleLocKey?: string;
  titleLocArgs?: string;
};

export type ITriggerOverrideAPNS = {
  topic?: string;
  id?: string;
  expiry?: number;
  priority?: number;
  collapseId?: string;
  pushType?: string;
  threadId?: string;
  payload?: unknown;
  aps?: {
    alert?:
      | string
      | {
          body?: string;
          'loc-key'?: string;
          'loc-args'?: unknown[];
          title?: string;
          'title-loc-key'?: string;
          'title-loc-args'?: unknown[];
          action?: string;
          'action-loc-key'?: string;
        };
    'launch-image'?: string;
    badge?: number;
    sound?: string;
    'content-available'?: undefined | 1;
    'mutable-content'?: undefined | 1;
    'url-args'?: string[];
    category?: string;
  };
  rawPayload?: unknown;
  badge?: number;
  sound?: string;
  alert?:
    | string
    | {
        title?: string;
        subtitle?: string;
        body: string;
        'title-loc-key'?: string;
        'title-loc-args'?: string[];
        'action-loc-key'?: string;
        'loc-key'?: string;
        'loc-args'?: string[];
        'launch-image'?: string;
      };
  contentAvailable?: boolean;
  mutableContent?: boolean;
  mdm?: string | Record<string, unknown>;
  urlArgs?: string[];
};
export interface IAttachmentOptions {
  mime: string;
  file: Buffer;
  name?: string;
  channels?: ChannelTypeEnum[];
}

export interface IUpdateSubscriberPreferencePayload {
  channel?: {
    type: ChannelTypeEnum;
    enabled: boolean;
  };

  enabled?: boolean;
}
