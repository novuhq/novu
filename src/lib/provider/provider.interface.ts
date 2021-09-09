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

export interface ISmsOptions {
  to: string;
  content: string;
  from?: string;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(options: IEmailOptions): Promise<any>;
}

export interface ISmsProvider extends IProvider {
  sendMessage(options: ISmsOptions): Promise<any>;

  channelType: ChannelTypeEnum.SMS;
}
