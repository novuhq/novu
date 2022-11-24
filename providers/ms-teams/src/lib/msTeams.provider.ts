import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class MsTeamsProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'msteams';
  private axiosInstance = axios.create();

  constructor(private config) {}

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    let response
    
    try {
      response = await this.axiosInstance.post(
        data.webhookUrl,
        JSON.parse(data.content)
      );
    } catch (err) {
      response = await this.axiosInstance.post(
        data.webhookUrl,
        {
          text: data.content
        }
      );
    }
    
    return {
      id: response.headers['request-id'],
      date: new Date().toISOString(),
    };
  }
}
