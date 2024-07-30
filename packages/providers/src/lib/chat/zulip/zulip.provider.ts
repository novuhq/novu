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

export class ZulipProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.Zulip;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private axiosInstance = axios.create();

  constructor(private config) {
    super();
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    await this.axiosInstance.post(
      data.webhookUrl,
      this.transform(bridgeProviderData, {
        text: data.content,
      }).body
    );

    return {
      date: new Date().toISOString(),
    };
  }
}
