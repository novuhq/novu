import {
  ActorTypeEnum,
  ButtonTypeEnum,
  ChannelCTATypeEnum,
  IEmailBlock,
  ITemplateVariable,
  MessageActionStatusEnum,
  MessageTemplateContentType,
  StepTypeEnum,
  UrlTarget,
} from '../../types';

export class ChannelCTADto {
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export interface IMessageActionDto {
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

export interface IMessageCTADto {
  type: ChannelCTATypeEnum;
  data: {
    url?: string;
    target?: UrlTarget;
  };
  action?: IMessageActionDto;
}

export interface IActorDto {
  type: ActorTypeEnum;
  data: string | null;
}

export class MessageTemplateDto {
  type: StepTypeEnum;

  content: string | IEmailBlock[];

  contentType?: MessageTemplateContentType;

  cta?: IMessageCTADto;

  actor?: {
    type: ActorTypeEnum;
    data: string | null;
  };

  variables?: ITemplateVariable[];

  feedId?: string;

  layoutId?: string | null;

  name?: string;

  subject?: string;

  title?: string;

  preheader?: string;

  senderName?: string;

  _creatorId?: string;
}
