import { ChannelTypeEnum } from '../../types';
import { ISubscriberResponseDto } from '../subscriber';
import { IActor, IMessageCTA } from '../../entities/messages';

export interface INotificationDto {
  _id: string;
  _templateId: string;
  _environmentId: string;
  _messageTemplateId: string;
  _organizationId: string;
  _notificationId: string;
  _subscriberId: string;
  _feedId?: string | null;
  _jobId: string;
  createdAt: string;
  updatedAt: string;
  expireAt: string;
  lastSeenDate?: string;
  lastReadDate?: string;
  actor?: IActor;
  subscriber?: ISubscriberResponseDto;
  transactionId: string;
  templateIdentifier: string;
  providerId: string;
  content: string;
  channel: ChannelTypeEnum;
  read: boolean;
  seen: boolean;
  deleted: boolean;
  deviceTokens?: string[];
  cta: IMessageCTA;
  status: 'sent' | 'error' | 'warning';
  payload: Record<string, unknown>;
  overrides: Record<string, unknown>;
}
