import {
  ChannelTypeEnum,
  IAttachmentOptions,
} from '../template/template.interface';
import { CheckIntegrationResponseEnum } from './provider.enum';

export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
}

export interface IEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  attachments?: IAttachmentOptions[];
  id?: string;
}

export interface ISmsOptions {
  to: string;
  content: string;
  from?: string;
  attachments?: IAttachmentOptions[];
  id?: string;
}
export interface IPushOptions {
  target: string[];
  title: string;
  content: string;
  payload: object;
  overrides?: {
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
  };
}

export interface IChatOptions {
  webhookUrl: string;
  content: string;
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
}

export interface IEventBody {
  status: EmailEventStatusEnum | SmsEventStatusEnum;
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

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(options: IEmailOptions): Promise<ISendMessageSuccessResponse>;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (
    body: any | any[],
    identifier: string
  ) => IEmailEventBody | undefined;

  checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse>;
}

export interface ISmsProvider extends IProvider {
  sendMessage(options: ISmsOptions): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.SMS;

  getMessageId?: (body: any) => string[];

  parseEventBody?: (
    body: any | any[],
    identifier: string
  ) => ISMSEventBody | undefined;
}

export interface IChatProvider extends IProvider {
  sendMessage(options: IChatOptions): Promise<ISendMessageSuccessResponse>;
  channelType: ChannelTypeEnum.CHAT;
}

export interface IPushProvider extends IProvider {
  sendMessage(options: IPushOptions): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.PUSH;
}

export interface ICheckIntegrationResponse {
  success: boolean;
  message: string;
  code: CheckIntegrationResponseEnum;
}
