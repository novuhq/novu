import { ChannelTypeEnum, IEmailBlock, ChannelCTATypeEnum } from '../../types';
import { ISubscriberResponseDto } from '../subscriber';
import { INotificationTemplate } from '../../entities/notification-template';
import { ButtonTypeEnum, MessageActionStatusEnum } from '../../entities/messages';

interface IMessageActionResult {
  payload?: Record<string, unknown>;
  type?: ButtonTypeEnum;
}

interface IMessageButton {
  type: ButtonTypeEnum;
  content: string;
  resultContent?: string;
}

interface IMessageAction {
  status?: MessageActionStatusEnum;
  buttons?: IMessageButton[];
  result?: IMessageActionResult;
}

interface IMessageCTAData {
  url?: string;
}

interface IMessageCTA {
  type?: ChannelCTATypeEnum;
  data: IMessageCTAData;
  action?: IMessageAction;
}

export interface INotificationDto {
  _id?: string;
  _templateId: string;
  _environmentId: string;
  _messageTemplateId: string;
  _organizationId: string;
  _notificationId: string;
  _subscriberId: string;
  subscriber?: ISubscriberResponseDto;
  template?: INotificationTemplate;
  templateIdentifier?: string;
  createdAt?: string;
  content: string | IEmailBlock[];
  transactionId: string;
  subject?: string;
  channel: ChannelTypeEnum;
  seen: boolean;
  email?: string;
  phone?: string;
  directWebhookUrl?: string;
  providerId?: string;
  deviceTokens?: string[];
  title?: string;
  lastSeenDate: string;
  cta: IMessageCTA;
  _feedId?: string;
  status: 'sent' | 'error' | 'warning';
  errorId: string;
  errorText: string;
  payload: Record<string, unknown>;
  overrides: Record<string, unknown>;
}
