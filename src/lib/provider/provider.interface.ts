import {
  ChannelTypeEnum,
  ITriggerPayload,
} from '../template/template.interface';

export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(
    to: string,
    subject: string,
    html: string,
    attributes: ITriggerPayload
  ): Promise<any>;
}

export interface ISmsProvider extends IProvider {
  sendMessage(to: string, content: string): Promise<any>;

  channelType: ChannelTypeEnum.SMS;
}
