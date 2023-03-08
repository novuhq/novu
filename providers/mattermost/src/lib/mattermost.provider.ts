import axios from 'axios';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';

interface IMattermostPayload {
  channel?: string;
  text: string;
}

export class MattermostProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'mattermost';
  private axiosInstance = axios.create();

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const payload: IMattermostPayload = { text: data.content };

    if (data.channel) {
      payload.channel = data.channel;
    }
    const response = await this.axiosInstance.post(data.webhookUrl, payload);

    return {
      id: response.headers['x-request-id'],
      date: response.headers.date,
    };
  }
}
