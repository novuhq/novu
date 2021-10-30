import { ChannelCTATypeEnum, ChannelTypeEnum } from './channel.enum';

export interface IEmailBlock {
  subject?: string;
  type: 'text' | 'button';
  content: string;
  url?: string;
  styles?: {
    textDirection?: 'ltr' | 'rtl';
  };
}

export interface IMessageTemplate {
  _id?: string;
  subject?: string;
  name?: string;
  type: ChannelTypeEnum;
  contentType?: 'editor' | 'customHtml';
  content: string | IEmailBlock[];
  cta?: {
    type: ChannelCTATypeEnum;
    data: any;
  };
}
