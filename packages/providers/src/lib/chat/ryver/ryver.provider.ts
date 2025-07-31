import { ChatProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, IChatOptions, IChatProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class RyverChatProvider extends BaseProvider implements IChatProvider {
  public id = ChatProviderIdEnum.Ryver;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
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
