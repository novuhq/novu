import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { BaseProvider } from '../../../base.provider';

export class GrafanaOnCallChatProvider
  extends BaseProvider
  implements IChatProvider
{
  id = ChatProviderIdEnum.GrafanaOnCall;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();
  constructor(
    private config: {
      alertUid?: string;
      title?: string;
      imageUrl?: string;
      state?: string;
      externalLink?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = new URL(options.webhookUrl);
    const body = this.transform(bridgeProviderData, {
      alert_uid: this.config.alertUid,
      title: this.config.title,
      image_url: this.config.imageUrl,
      state: this.config.state,
      link_to_upstream_details: this.config.externalLink,
      message: options.content,
    }).body;
    //response is just string "Ok."
    const { headers } = await this.axiosInstance.post(url.toString(), body);

    return {
      id: uuid(),
      date: (headers.Date ? new Date(headers.Date) : new Date()).toISOString(),
    };
  }
}
