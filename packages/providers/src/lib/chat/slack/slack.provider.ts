import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider } from '../../../base.provider';
import { deepmerge } from '../../../utils/deepmerge.utils';
import { WithPassthrough } from '../../../utils/types';

export class SlackProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.Slack;
  private axiosInstance = axios.create();

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(
      data.webhookUrl,
      deepmerge(
        {
          text: data.content,
          blocks: data.blocks,
          ...(data.customData || {}),
        },
        this.transform(bridgeProviderData).body
      )
    );

    return {
      id: response.headers['x-slack-req-id'],
      date: new Date().toISOString(),
    };
  }
}
