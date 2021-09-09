import { ChannelTypeEnum } from '../template/template.interface';

export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
}

export interface IEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(options: IEmailOptions): Promise<any>;
}

export interface ISmsProvider extends IProvider {
  sendMessage(to: string, content: string): Promise<any>;

  channelType: ChannelTypeEnum.SMS;
}
