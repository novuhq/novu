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
  cta: ICta;
  payload: Record<string, unknown>;
}

export interface ICta {
  type: ChannelCTATypeEnum;
  data: {
    url?: string;
  };
  action?: IMessageAction;
}

export interface IMessageAction {
  status?: MessageActionStatusEnum;
  buttons?: IMessageButton[];
}

export interface IMessageButton {
  type: ButtonTypeEnum;
  content: string;
}

export enum MessageActionStatusEnum {
  PENDING = 'pending',
  DONE = 'done',
}
