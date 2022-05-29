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
  private urlPostMessage = 'https://slack.com/api/chat.postMessage';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      applicationId: string;
      clientID: string;
      secretKey: string;
    }
  ) {}

  async sendMessage(
    data: IDirectOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(
      this.urlPostMessage,
      {
        channel: data.channelId,
        text: data.content,
      },
      { headers: { authorization: `Bearer ${data.accessToken}` } }
    );

    return {
      id: response.headers['x-slack-req-id'],
      date: new Date().toISOString(),
    };
  }
}
