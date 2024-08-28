import { ActorTypeEnum, ChannelCTATypeEnum, ChannelTypeEnum, IEmailBlock, UrlTarget } from '../../types';
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
  lastSeenDate?: string;
  lastReadDate?: string;
  createdAt: string;
  cta?: IMessageCTA;
  _feedId?: string | null;
  _layoutId?: string;
  payload: Record<string, unknown>;
  data?: Record<string, unknown>;
  actor?: IActor;
  avatar?: string;
  subject?: string;
}

export interface IMessageCTA {
  type: ChannelCTATypeEnum;
  data: {
    url?: string;
    target?: UrlTarget;
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
  url?: string;
  target?: UrlTarget;
}

export enum MessageActionStatusEnum {
  PENDING = 'pending',
  DONE = 'done',
}

export interface IActor {
  type: ActorTypeEnum;
  data: string | null;
}
