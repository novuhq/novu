import { ChannelTypeEnum, IMessageCTA, IActor } from '@novu/shared';
import { Exclude } from 'class-transformer';
import { IEmailBlock } from '../message-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationTemplateEntity } from '../notification-template';

export class MessageEntity {
  _id?: string;

  _templateId: string;

  _environmentId: string;

  _messageTemplateId: string;

  _organizationId: string;

  _notificationId: string;

  _jobId?: string;

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
