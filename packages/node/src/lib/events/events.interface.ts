export interface IEvents {
  trigger(workflowIdentifier: string, data: ITriggerPayloadOptions);
  broadcast(workflowIdentifier: string, data: IBroadcastPayloadOptions);
  bulkTrigger(events: IBulkEvents[]);
  cancel(transactionId: string);
}

import {
  DigestUnitEnum,
  ITriggerPayload,
  TriggerRecipientSubscriber,
  TriggerRecipientsPayload,
  ITenantDefine,
  SmsProviderIdEnum,
} from '@novu/shared';

export interface IBroadcastPayloadOptions {
  payload: ITriggerPayload;
  overrides?: ITriggerOverrides;
  tenant?: ITriggerTenant;
  transactionId?: string;
}

export interface ITriggerPayloadOptions extends IBroadcastPayloadOptions {
  to: TriggerRecipientsPayload;
  actor?: TriggerRecipientSubscriber;
}
export interface IIntegrationOverride {
  integrationIdentifier?: string;
}
export interface IEmailOverrides extends IIntegrationOverride {
  to?: string[];
  from?: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  senderName?: string;
  customData?: Record<string, any>;
}

export type ITriggerTenant = string | ITenantDefine;

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
  [key in 'expo']?: ITriggerOverrideExpo;
} & {
  [key in 'delay']?: ITriggerOverrideDelayAction;
} & {
  [key in 'layoutIdentifier']?: string;
} & {
  [key in 'email']?: IEmailOverrides;
} & {
  [key in 'sms']?: ITriggerOverrideSMS;
} & {
  [key in SmsProviderIdEnum]?: ITriggerOverrideSMS;
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
  data?: Record<string, unknown>;
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

export type ITriggerOverrideSMS = {
  to?: string;
  content?: string;
  from?: string;
  customData?: Record<string, any>;
};

export type ITriggerOverrideExpo = {
  to?: string | string[];
  data?: object;
  title?: string;
  body?: string;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  subtitle?: string;
  badge?: number;
  sound?: string;
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
};

export interface IBulkEvents extends ITriggerPayloadOptions {
  name: string;
}
