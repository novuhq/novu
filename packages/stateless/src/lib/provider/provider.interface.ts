import { ChannelTypeEnum, IAttachmentOptions } from '../template/template.interface';
import { ChannelData } from './channel-data.type';
import { CheckIntegrationResponseEnum } from './provider.enum';

export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
  verifySignature?: (params: {
    rawBody: unknown;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }) => Promise<{ success: boolean; message?: string }>;
  autoConfigureInboundWebhook?: (configurations: { webhookUrl: string }) => Promise<{
    success: boolean;
    message?: string;
    configurations?: unknown;
  }>;
}

export interface IEmailAlternative {
  contentType: string;
  content: string | Buffer;
}

export interface IEmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  alternatives?: IEmailAlternative[];
  attachments?: IAttachmentOptions[];
  id?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  payloadDetails?: any;
  notificationDetails?: any;
  ipPoolName?: string;
  customData?: Record<string, any>;
  headers?: Record<string, string>;
  senderName?: string;
  bridgeProviderData?: Record<string, unknown>;
}

export interface ISmsOptions {
  to: string;
  content: string;
  from?: string;
  attachments?: IAttachmentOptions[];
  id?: string;
  customData?: Record<string, any>;
  bridgeProviderData?: Record<string, unknown>;
}
export interface IPushOptions {
  target: string[];
  title: string;
  content: string;
  payload: object;
  /** Novu message id; used by some providers (e.g. APNS) for collapse-id when not set in overrides. */
  messageId?: string;
  overrides?: {
    type?: 'notification' | 'data';
    data?: { [key: string]: string };
    tag?: string;
    body?: string;
    icon?: string;
    badge?: number;
    color?: string;
    sound?: string;
    title?: string;
    bodyLocKey?: string;
    bodyLocArgs?: string;
    clickAction?: string;
    titleLocKey?: string;
    titleLocArgs?: string;
    ttl?: number;
    expiration?: number;
    priority?: 'default' | 'normal' | 'high';
    subtitle?: string;
    channelId?: string;
    categoryId?: string;
    mutableContent?: boolean;
    collapseId?: string;
    android?: { [key: string]: { [key: string]: string } | string };
    apns?: {
      headers?: { [key: string]: string };
      payload: {
        aps: { [key: string]: { [key: string]: string } | string };
      };
    };
    fcmOptions?: { analyticsLabel?: string };
  };
  subscriber: object;
  step: {
    digest: boolean;
    events: object[] | undefined;
    total_count: number | undefined;
  };
  bridgeProviderData?: Record<string, unknown>;
}

export interface IChatOptions {
  /**
   * @deprecated use channelData instead
   */
  phoneNumber?: string;
  channelData?: ChannelData;
  content: string;
  blocks?: IBlock[];
  customData?: Record<string, any>;
  bridgeProviderData?: Record<string, unknown>;
}

export interface IBlock {
  type: 'section' | 'header';
  text: {
    type: 'mrkdwn';
    text: string;
  };
}

export interface ISendMessageSuccessResponse {
  id?: string;
  ids?: string[];
  date?: string;
}

export enum EmailEventStatusEnum {
  OPENED = 'opened',
  REJECTED = 'rejected',
  SENT = 'sent',
  DEFERRED = 'deferred',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  DROPPED = 'dropped',
  CLICKED = 'clicked',
  BLOCKED = 'blocked',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsubscribed',
  DELAYED = 'delayed',
  COMPLAINT = 'complaint',
}

export enum PushEventStatusEnum {
  DELIVERED = 'delivered',
  OPENED = 'opened',
  DISMISSED = 'dismissed',
  CLICKED = 'clicked',
  FAILED = 'failed',
}

export enum SmsEventStatusEnum {
  CREATED = 'created',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  UNDELIVERED = 'undelivered',
  REJECTED = 'rejected',
}

export interface IEventBody {
  status: EmailEventStatusEnum | SmsEventStatusEnum | PushEventStatusEnum;
  date: string;
  externalId?: string;
  attempts?: number;
  response?: string;
  // Contains the raw content from the provider webhook
  row?: string;
}

export interface IEmailEventBody extends IEventBody {
  status: EmailEventStatusEnum;
}

export interface ISMSEventBody extends IEventBody {
  status: SmsEventStatusEnum;
}

export interface IPushEventBody extends IEventBody {
  status: PushEventStatusEnum;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(
    options: IEmailOptions,
    bridgeProviderData: Record<string, unknown>
  ): Promise<ISendMessageSuccessResponse>;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string) => IEmailEventBody | undefined;

  checkIntegration?: (options: IEmailOptions) => Promise<ICheckIntegrationResponse>;
}

export interface ISmsProvider extends IProvider {
  sendMessage(options: ISmsOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.SMS;

  getMessageId?: (body: any) => string[];

  parseEventBody?: (body: any | any[], identifier: string) => ISMSEventBody | undefined;
}

export interface IChatProvider extends IProvider {
  sendMessage(options: IChatOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;
  channelType: ChannelTypeEnum.CHAT;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string) => unknown | undefined;
}

export interface IPushProvider extends IProvider {
  isTokenInvalid?: (errorMessage: string) => boolean;

  sendMessage(options: IPushOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.PUSH;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string) => unknown | undefined;
}

export type ChannelProvider = IEmailProvider | ISmsProvider | IChatProvider | IPushProvider;

export interface ICheckIntegrationResponse {
  success: boolean;
  message: string;
  code: CheckIntegrationResponseEnum;
}
