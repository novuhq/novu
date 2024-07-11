import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class ZulipProvider implements IChatProvider {
  id = ChatProviderIdEnum.Zulip;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private axiosInstance = axios.create();

  constructor(private config) {}

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    await this.axiosInstance.post(data.webhookUrl, {
      text: data.content,
    });

    return {
      date: new Date().toISOString(),
    };
  }
}
