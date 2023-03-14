import { DigestUnitEnum, ISubscribersDefine } from '@novu/shared';

import { IAttachmentOptions } from '../novu.interface';
import { ITopic } from '../topics/topic.interface';

export type TriggerRecipientSubscriber = string | ISubscribersDefine;
export type TriggerRecipientTopics = ITopic[];

export type TriggerRecipient = TriggerRecipientSubscriber | ITopic;

export type TriggerRecipients = TriggerRecipient[];

// string | ISubscribersDefine | (string | ISubscribersDefine | ITopic)[]
export type TriggerRecipientsPayload =
  | TriggerRecipientSubscriber
  | TriggerRecipients;

export interface IBroadcastPayloadOptions {
  payload: ITriggerPayload;
  overrides?: ITriggerOverrides;
}

export interface ITriggerPayloadOptions extends IBroadcastPayloadOptions {
  to: TriggerRecipientsPayload;
  actor?: TriggerRecipientSubscriber;
  transactionId?: string;
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

export interface IEmailOverrides {
  to?: string[];
  from?: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export type ITriggerOverrides = {
  [key in
    | 'mailgun'
    | 'nodemailer'
    | 'plivo'
    | 'postmark'
    | 'sendgrid'
    | 'twilio']?: object;
} & {
  [key in 'fcm']?: ITriggerOverrideFCM;
} & {
  [key in 'apns']?: ITriggerOverrideAPNS;
} & {
  [key in 'delay']?: ITriggerOverrideDelayAction;
} & {
  [key in 'email']?: IEmailOverrides;
};

export type ITriggerOverrideDelayAction = {
  unit: DigestUnitEnum;
  amount: number;
};

export type ITriggerOverrideFCM = {
  type?: 'notification' | 'data';
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
  data?: Record<string, any>;
};

export type IAPNSAlert = {
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
    alert?: string | IAPNSAlert;
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
  alert?: string | IAPNSAlert;
  contentAvailable?: boolean;
  mutableContent?: boolean;
  mdm?: string | Record<string, unknown>;
  urlArgs?: string[];
};

export interface IBulkEvents extends ITriggerPayloadOptions {
  name: string;
}
