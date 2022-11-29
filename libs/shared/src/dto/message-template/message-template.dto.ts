import {
  ChannelCTATypeEnum,
  MessageTemplateContentType,
  StepTypeEnum,
  IEmailBlock,
} from '../../entities/message-template';
import { IMessageCTA } from '../../entities/messages';

export class ChannelCTADto {
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class MessageTemplateDto {
  type: StepTypeEnum;

  content: string | IEmailBlock[];

  contentType?: MessageTemplateContentType;

  cta?: IMessageCTA;
}
