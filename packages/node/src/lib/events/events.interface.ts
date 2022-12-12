import { DigestUnitEnum } from '@novu/shared';

import { IAttachmentOptions } from '../novu.interface';
import { ITopic } from '../topics/topic.interface';
import { ISubscribersDefine } from '../subscribers/subscriber.interface';

/**
 * RETRO COMPATIBLE TYPES
 * TODO
 */
export type TriggerRecipientsSubscriber = string | ISubscribersDefine;
export type TriggerRecipientsSubscriberMany = TriggerRecipientsSubscriber[];
export type TriggerRecipientsSubscribers =
  | TriggerRecipientsSubscriber
  | TriggerRecipientsSubscriberMany;
export type TriggerRecipientsTopics = ITopic | ITopic[];

export type TriggerRecipientsType =
  | TriggerRecipientsSubscribers
  | TriggerRecipientsTopics;

export interface ITriggerPayloadOptions extends IBroadcastPayloadOptions {
  to: TriggerRecipientsSubscribers;
  actor?: TriggerRecipientsSubscriber;
}
////////

/**
 * NEW INTEGRATION TYPES
 * TODO
 */
export type TriggerRecipientSubscriber = string | ISubscribersDefine;
export type TriggerRecipientTopics = ITopic[];
export type TriggerRecipient = TriggerRecipientSubscriber | ITopic;
export type TriggerRecipients = TriggerRecipient[];
// string | ISubscribersDefine | string[] | ISubscribersDefine[] | ITopic[]
export type TriggerRecipientsPayload =
  | TriggerRecipientSubscriber
  | TriggerRecipients;
//////////////////

export interface IBroadcastPayloadOptions {
  payload: ITriggerPayload;
  overrides?: ITriggerOverrides;
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
} & {
  [key in 'delay']: ITriggerOverrideDelayAction;
};

export type ITriggerOverrideDelayAction = {
  unit: DigestUnitEnum;
  amount: number;
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
