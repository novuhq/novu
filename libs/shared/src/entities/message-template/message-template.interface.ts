import { ChannelCTATypeEnum, ChannelTypeEnum } from './channel.enum';

export interface IEmailBlock {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  };
  active?: boolean;
}
