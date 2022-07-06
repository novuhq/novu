import { ChannelCTATypeEnum, ChannelTypeEnum, IEmailBlock } from '../message-template';
import { INotificationTemplate } from '../notification-template';

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
  };
  _feedId: string;
  payload: Record<string, unknown>;
}
