import { ChannelCTATypeEnum, ChannelTypeEnum, IEmailBlock } from '../../entities/message-template';

export class ChannelCTADto {
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class NotificationMessageDto {
  type: ChannelTypeEnum;

  content: string | IEmailBlock[];

  contentType?: 'editor' | 'customHtml';

  cta?: ChannelCTADto;
}
