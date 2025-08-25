/**
 * ==========
 * | NOTICE |
 * ==========
 *
 * This file contains copied code from @novu/shared in order to temporarily eliminate the dependency of
 * framework on the shared package.
 *
 * The shared package, doesn't support ESM/CJS with strict TS yet.
 * So we sacrificed a bit code duplication in order to address ESM/CJS issues reported on the @novu/framework
 * caused by its @novu/shared dependency.
 *
 * Treat this as a temporary solution until the shared package is updated with the above.
 *
 */

export interface IResponseError {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Validate (type-guard) that an error response matches our IResponseError interface.
 */
export function checkIsResponseError(err: unknown): err is IResponseError {
  return !!err && typeof err === 'object' && 'error' in err && 'message' in err && 'statusCode' in err;
}

export enum ChannelTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
}

export interface IAttachmentOptions {
  mime: string;
  file: Buffer;
  name?: string;
  channels?: ChannelTypeEnum[];
  cid?: string;
  disposition?: string;
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

export interface ISubscriberPayload {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: Record<string, unknown>;
  channels?: ISubscriberChannel[];
}

export interface ISubscriberChannel {
  providerId: ChatProviderIdEnum | PushProviderIdEnum;
  integrationIdentifier?: string;
  credentials: IChannelCredentials;
}

export interface IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}

export interface ITopic {
  type: 'Topic';
  topicKey: string;
}

export type TriggerRecipientsPayload = string | ISubscriberPayload | ITopic | ISubscriberPayload[] | ITopic[];

export enum TriggerEventStatusEnum {
  ERROR = 'error',
  NOT_ACTIVE = 'trigger_not_active',
  NO_WORKFLOW_ACTIVE_STEPS = 'no_workflow_active_steps_defined',
  NO_WORKFLOW_STEPS = 'no_workflow_steps_defined',
  PROCESSED = 'processed',
  // TODO: Seems not used. Remove.
  SUBSCRIBER_MISSING = 'subscriber_id_missing',
  TENANT_MISSING = 'no_tenant_found',
}

export enum EmailProviderIdEnum {
  EmailJS = 'emailjs',
  Mailgun = 'mailgun',
  Mailjet = 'mailjet',
  Mandrill = 'mandrill',
  CustomSMTP = 'nodemailer',
  Postmark = 'postmark',
  SendGrid = 'sendgrid',
  Sendinblue = 'sendinblue',
  SES = 'ses',
  NetCore = 'netcore',
  Infobip = 'infobip-email',
  Resend = 'resend',
  Plunk = 'plunk',
  MailerSend = 'mailersend',
  Mailtrap = 'mailtrap',
  Clickatell = 'clickatell',
  Outlook365 = 'outlook365',
  Novu = 'novu-email',
  SparkPost = 'sparkpost',
  EmailWebhook = 'email-webhook',
  Braze = 'braze',
}

export enum SmsProviderIdEnum {
  Nexmo = 'nexmo',
  Plivo = 'plivo',
  Sms77 = 'sms77',
  SmsCentral = 'sms-central',
  SNS = 'sns',
  Telnyx = 'telnyx',
  Twilio = 'twilio',
  Gupshup = 'gupshup',
  Firetext = 'firetext',
  Infobip = 'infobip-sms',
  BurstSms = 'burst-sms',
  BulkSms = 'bulk-sms',
  ISendSms = 'isend-sms',
  Clickatell = 'clickatell',
  FortySixElks = 'forty-six-elks',
  Kannel = 'kannel',
  Maqsam = 'maqsam',
  Termii = 'termii',
  AfricasTalking = 'africas-talking',
  Novu = 'novu-sms',
  Sendchamp = 'sendchamp',
  GenericSms = 'generic-sms',
  Clicksend = 'clicksend',
  Bandwidth = 'bandwidth',
  MessageBird = 'messagebird',
  Simpletexting = 'simpletexting',
  AzureSms = 'azure-sms',
  RingCentral = 'ring-central',
  BrevoSms = 'brevo-sms',
  EazySms = 'eazy-sms',
  Mobishastra = 'mobishastra',
  AfroSms = 'afro-message',
  Unifonic = 'unifonic',
  Smsmode = 'smsmode',
  IMedia = 'imedia',
}

export enum ChatProviderIdEnum {
  Slack = 'slack',
  Discord = 'discord',
  MsTeams = 'msteams',
  Mattermost = 'mattermost',
  Ryver = 'ryver',
  Zulip = 'zulip',
  GrafanaOnCall = 'grafana-on-call',
  GetStream = 'getstream',
  RocketChat = 'rocket-chat',
  WhatsAppBusiness = 'whatsapp-business',
  ChatWebhook = 'chat-webhook',
}

export enum PushProviderIdEnum {
  FCM = 'fcm',
  APNS = 'apns',
  EXPO = 'expo',
  OneSignal = 'one-signal',
  Pushpad = 'pushpad',
  PushWebhook = 'push-webhook',
  PusherBeams = 'pusher-beams',
}

export enum InAppProviderIdEnum {
  Novu = 'novu',
}

/**
 * A preference for a notification delivery workflow.
 *
 * This provides a shortcut to setting all channels to the same preference.
 */
export type WorkflowPreference = {
  /**
   * A flag specifying if notification delivery is enabled for the workflow.
   *
   * If `true`, notification delivery is enabled by default for all channels.
   *
   * This setting can be overridden by the channel preferences.
   *
   * @default true
   */
  enabled: boolean;
  /**
   * A flag specifying if the preference is read-only.
   *
   * If `true`, the preference cannot be changed by the Subscriber.
   *
   * @default false
   */
  readOnly: boolean;
};

/** A preference for a notification delivery channel. */
export type ChannelPreference = {
  /**
   * A flag specifying if notification delivery is enabled for the channel.
   *
   * If `true`, notification delivery is enabled.
   *
   * @default true
   */
  enabled: boolean;
};

export type WorkflowPreferences = {
  /**
   * A preference for the workflow.
   *
   * The values specified here will be used if no preference is specified for a channel.
   */
  all: WorkflowPreference;
  /**
   * A preference for each notification delivery channel.
   *
   * If no preference is specified for a channel, the `all` preference will be used.
   */
  channels: Record<ChannelTypeEnum, ChannelPreference>;
};

/**
 * Recursively make all properties of type `T` optional.
 */
// TODO: This utility also exists in src/types/util.types.ts. They should be consolidated.
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/** A partial set of workflow preferences. */
export type WorkflowPreferencesPartial = DeepPartial<WorkflowPreferences>;
