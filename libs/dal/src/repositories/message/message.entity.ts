import { Exclude } from 'class-transformer';
import { Types } from 'mongoose';
import { ChannelTypeEnum, IMessageCTA, IActor } from '@novu/shared';

import { IEmailBlock } from '../message-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationTemplateEntity } from '../notification-template';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';

export class MessageEntity {
  _id: string;

  _templateId: string;

  _environmentId: string;

  _messageTemplateId: EnvironmentId;

  _organizationId: OrganizationId;

  _notificationId: string;

  _jobId: string;

  _subscriberId: string;

  subscriber?: SubscriberEntity;

  template?: NotificationTemplateEntity;

  templateIdentifier?: string;

  createdAt?: string;

  content: string | IEmailBlock[];

  transactionId: string;

  subject?: string;

  channel: ChannelTypeEnum;

  seen: boolean;

  read: boolean;

  email?: string;

  phone?: string;

  chatWebhookUrl?: string;

  directWebhookUrl?: string;

  providerId?: string;

  deviceTokens?: string[];

  title?: string;

  lastSeenDate: string;

  lastReadDate: string;

  cta: IMessageCTA;

  _feedId: string;

  status: 'sent' | 'error' | 'warning';

  errorId: string;

  errorText: string;

  @Exclude()
  providerResponse: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  payload: Record<string, unknown>;

  overrides: Record<string, unknown>;

  identifier?: string;

  actor?: IActor;
}

export type MessageDBModel = Omit<
  MessageEntity,
  | '_templateId'
  | '_environmentId'
  | '_messageTemplateId'
  | '_organizationId'
  | '_notificationId'
  | '_jobId'
  | '_subscriberId'
  | 'createdAt'
  | '_feedId'
> & {
  _templateId: Types.ObjectId;

  _environmentId: Types.ObjectId;

  _messageTemplateId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _notificationId: Types.ObjectId;

  _jobId: Types.ObjectId;

  _subscriberId: Types.ObjectId;

  createdAt?: Date;

  _feedId: Types.ObjectId;
};
