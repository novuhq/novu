import { ChannelCTATypeEnum, ChannelTypeEnum, IEmailBlock } from '../../entities/message-template';
import { ICta } from '../../entities/messages';

export class ChannelCTADto {
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class MessageTemplateDto {
  type: ChannelTypeEnum;

  content: string | IEmailBlock[];

  contentType?: 'editor' | 'customHtml';

  cta?: ICta;
}
