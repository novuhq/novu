import {
  ChannelEndpointByType,
  ChannelEndpointType,
  ChannelTypeEnum,
  IActor,
  IMessageCTA,
  SeverityLevelEnum,
} from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import { IEmailBlock } from '../message-template';
import { NotificationTemplateEntity } from '../notification-template';
import type { OrganizationId } from '../organization';
import { SubscriberEntity } from '../subscriber';

export type MessageChannelData<T extends ChannelEndpointType = ChannelEndpointType> = {
  identifier: string;
  type: T;
  endpoint: ChannelEndpointByType[T];
  token?: string;
};

export class MessageEntity {
  _id: string;

  // WorkflowEntity._id
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

  stepId?: string;

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

  /**
   * @deprecated use channelData instead
   */
  phone?: string;

  /**
   * @deprecated use channelData instead
   */
  chatWebhookUrl?: string;

  /**
   * @deprecated use channelData instead
   */
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

  channelData?: MessageChannelData[];

  contextKeys?: string[];
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
