import {
  DigestUnitEnum,
  ITriggerPayload,
  TriggerRecipientSubscriber,
  TriggerRecipientsPayload,
  ITenantDefine,
  SmsProviderIdEnum,
} from '@novu/shared';

export interface IEvents {
  trigger(workflowIdentifier: string, data: ITriggerPayloadOptions);
  broadcast(workflowIdentifier: string, data: IBroadcastPayloadOptions);
  bulkTrigger(events: IBulkEvents[]);
  cancel(transactionId: string);
}

export interface IBroadcastPayloadOptions {
  payload?: ITriggerPayload;
  overrides?: ITriggerOverrides;
  tenant?: ITriggerTenant;
  transactionId?: string;
}

export interface ITriggerPayloadOptions extends IBroadcastPayloadOptions {
  to: TriggerRecipientsPayload;
  actor?: TriggerRecipientSubscriber;
  bridgeUrl?: string;
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
  headers?: Record<string, string>;
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
} & {
  [key in 'whatsapp']?: IWhatsappOverrides;
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
} & IIntegrationOverride;

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

export type IWhatsappOverrides = {
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: IWhatsappComponent[];
  };
} & {
  [key in
    | 'audio'
    | 'document'
    | 'image'
    | 'sticker'
    | 'video']?: IWhatsappMedia;
} & {
  interactive?: {
    type:
      | 'button'
      | 'catalog_message'
      | 'list'
      | 'product'
      | 'product_list'
      | 'flow';
    action: {
      button?: string;
      buttons?: {
        type: 'reply';
        title: string;
        id: string;
      }[];
      catalog_id?: string;
      product_retailer_id?: string;
      sections?: IWhatsappSections[];
      mode?: 'draft' | 'published';
      flow_message_version?: '3';
      flow_token?: string;
      flow_id?: string;
      flow_cta?: string;
      flow_action?: string;
      flow_action_payload?: {
        screen: string;
        data?: {
          [key: string]: string;
        };
      };
    };
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      document?: IWhatsappMedia;
      image?: IWhatsappMedia;
      text?: string;
      video?: IWhatsappMedia;
    };
    body?: {
      text: string;
    };
    footer?: {
      text: string;
    };
  };
};

export type IWhatsappMedia = {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
};

export interface IWhatsappSections {
  product_items?: { product_retailer_id: string }[];
  rows?: { id: string; title: string; description: string }[];
  title?: string;
}

export interface IWhatsappComponent {
  type: 'body' | 'header' | 'button';
  sub_type?: 'quick_reply' | 'url' | 'catalog';
  parameters: {
    type: 'currency' | 'date_time' | 'document' | 'image' | 'text' | 'video';
    text?: string;
    currency?: {
      fallback_value: string;
      code: string;
      amount_1000: number;
    };
    date_time?: {
      fallback_value: string;
    };
    image?: IWhatsappMedia;
    document?: IWhatsappMedia;
    video?: IWhatsappMedia;
  }[];
  index?: number;
}

export interface IBulkEvents extends ITriggerPayloadOptions {
  name: string;
}
