import { MessageTemplateContentType } from '../../entities/message-template';
import { IMessageCTA } from '../../entities/messages';

import { ActorTypeEnum, ChannelCTATypeEnum, IEmailBlock, StepTypeEnum } from '../../types';

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

  actor?: {
    type: ActorTypeEnum;
    data: string | null;
  };
}
