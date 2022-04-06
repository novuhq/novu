import { ChannelCTATypeEnum, ChannelTypeEnum } from '@novu/shared';
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

  _subscriberId: string;

  subscriber?: SubscriberEntity;

  template?: NotificationTemplateEntity;

  createdAt?: string;

  content: string | IEmailBlock[];

  transactionId: string;

  channel: ChannelTypeEnum;

  seen: boolean;

  email?: string;

  phone?: string;

  lastSeenDate: string;

  cta: {
    type: ChannelCTATypeEnum;
    data: {
      url?: string;
    };
  };

  status: 'sent' | 'error' | 'warning';

  errorId: string;

  errorText: string;

  @Exclude()
  providerResponse: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
