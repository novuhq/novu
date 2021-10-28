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
  text?: string;
}

export interface ISmsOptions {
  to: string;
  content: string;
  from?: string;
}

export interface ISendMessageSuccessResponse {
  id: string;
  date?: string;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(options: IEmailOptions): Promise<ISendMessageSuccessResponse>;
}

export interface ISmsProvider extends IProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage(options: ISmsOptions): Promise<any>;

  channelType: ChannelTypeEnum.SMS;
}
