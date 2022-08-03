import {
  ChannelTypeEnum,
  IDirectOptions,
  IDirectProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios from 'axios';

export class SlackProvider implements IDirectProvider {
  channelType = ChannelTypeEnum.DIRECT as ChannelTypeEnum.DIRECT;
  public id = 'slack';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      applicationId: string;
      clientId: string;
      secretKey: string;
    }
  ) {}

  async sendMessage(
    data: IDirectOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(data.webhookUrl, {
      text: data.content,
    });

    return {
      id: response.headers['x-slack-req-id'],
      date: new Date().toISOString(),
    };
  }
}
