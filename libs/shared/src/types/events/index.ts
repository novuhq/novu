import { ChannelTypeEnum } from '../channel';
import { TopicKey } from '../topic';

export interface IAttachmentOptions {
  mime: string;
  file: Buffer;
  name?: string;
  channels?: ChannelTypeEnum[];
}

export interface IEmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  attachments?: IAttachmentOptions[];
  id?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  payloadDetails?: any;
  notificationDetails?: any;
  ipPoolName?: string;
  customData?: Record<string, Record<string, unknown>>;
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

export enum TriggerRecipientsTypeEnum {
  SUBSCRIBER = 'Subscriber',
  TOPIC = 'Topic',
}

export interface ITopic {
  type: TriggerRecipientsTypeEnum.TOPIC;
  topicKey: TopicKey;
}

export type TriggerRecipientTopics = ITopic[];
