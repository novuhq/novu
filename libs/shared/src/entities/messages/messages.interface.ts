import { ChannelCTATypeEnum, ChannelTypeEnum, IEmailBlock, AvatarTypeEnum } from '../message-template';
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
  templateIdentifier?: string;
  content: string | IEmailBlock[];
  channel: ChannelTypeEnum;
  seen: boolean;
  read: boolean;
  lastSeenDate: string;
  lastReadDate: string;
  createdAt: string;
  cta: IMessageCTA;
  _feedId: string;
  payload: Record<string, unknown>;
  avatarDetails?: IAvatarDetails;
}

export interface IMessageCTA {
  type: ChannelCTATypeEnum;
  data: {
    url?: string;
  };
  action?: IMessageAction;
}

export interface IMessageAction {
  status?: MessageActionStatusEnum;
  buttons?: IMessageButton[];
  result: {
    payload?: Record<string, unknown>;
    type?: ButtonTypeEnum;
  };
}

export interface IMessageButton {
  type: ButtonTypeEnum;
  content: string;
  resultContent?: string;
}

export enum MessageActionStatusEnum {
  PENDING = 'pending',
  DONE = 'done',
}

export interface IAvatarDetails {
  type: AvatarTypeEnum;
  data: string | null;
}
