import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class RyverChatProvider extends BaseProvider implements IChatProvider {
  public id = ChatProviderIdEnum.Ryver;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = new URL(options.webhookUrl);
    const response = await this.axiosInstance.post(
      url.toString(),
      this.transform(bridgeProviderData, {
        content: options.content,
      }).body
    );

    return {
      id: `${response.status}`,
      date: new Date().toISOString(),
    };
  }
}
