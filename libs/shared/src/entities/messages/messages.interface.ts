import { ChannelCTATypeEnum, ChannelTypeEnum, IEmailBlock } from '../message-template';
import { INotificationTemplate } from '../notification-template';
import { ButtonTypeEnum } from './action.enum';

export interface IMessage {
  _id: string;
  _templateId: string;
  _environmentId: string;
  _organizationId: string;
  _notificationId: string;
  _subscriberId: string;
  template?: INotificationTemplate;
  content: string | IEmailBlock[];
  channel: ChannelTypeEnum;
  seen: boolean;
  lastSeenDate: string;
  createdAt: string;
  cta: {
    type: ChannelCTATypeEnum;
    data: {
      url?: string;
    };
    actions?: IMessageAction[];
  };
  payload: Record<string, unknown>;
}

export interface IMessageAction {
  type: ButtonTypeEnum;
  content: { text: string };
}
