import { ChannelTypeEnum, IActor, IMessageCTA, SeverityLevelEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import { IEmailBlock } from '../message-template';
import { NotificationTemplateEntity } from '../notification-template';
import type { OrganizationId } from '../organization';
import { SubscriberEntity } from '../subscriber';

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

  actorSubscriber?: SubscriberEntity;

  template?: NotificationTemplateEntity;

  templateIdentifier: string;

  createdAt: string;

  updatedAt: string;

  archivedAt?: string;

  content: string | IEmailBlock[];

  transactionId: string;

  subject?: string;

  channel: ChannelTypeEnum;

  seen: boolean;

  read: boolean;

  snoozedUntil?: string;

  deliveredAt?: string[];

  archived: boolean;

  /**
   * todo: remove deleted field after all the soft deletes are removed task nv-5688
   */
  deleted: boolean;

  email?: string;

  phone?: string;

  chatWebhookUrl?: string;

  directWebhookUrl?: string;

  providerId: string;

  deviceTokens?: string[];

  title?: string;

  lastSeenDate: string;

  firstSeenDate: string;

  lastReadDate: string;

  cta: IMessageCTA;

  _feedId?: string;

  status: 'sent' | 'error' | 'warning';

  errorId: string;

  errorText: string;

  payload: Record<string, unknown>;

  data?: Record<string, unknown>;

  overrides: Record<string, unknown>;

  identifier?: string;

  actor?: IActor;

  _actorId?: string;

  tags?: string[];

  avatar?: string;

  severity?: SeverityLevelEnum;
}

export type MessageDBModel = ChangePropsValueType<
  MessageEntity,
  | '_templateId'
  | '_environmentId'
  | '_messageTemplateId'
  | '_organizationId'
  | '_notificationId'
  | '_jobId'
  | '_subscriberId'
  | '_feedId'
  | '_actorId'
>;
