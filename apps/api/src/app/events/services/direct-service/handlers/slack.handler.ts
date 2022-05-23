import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum, IDirectOptions, IDirectProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import { BaseDirectHandler } from './base.handler';
import axios from 'axios';

export class SlackHandler extends BaseDirectHandler {
  constructor() {
    super('slack', ChannelTypeEnum.DIRECT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      applicationId: string;
    } = { applicationId: credentials.applicationId };

    this.provider = new SlackProvider(config);
  }
}

export class SlackProvider implements IDirectProvider {
  channelType = ChannelTypeEnum.DIRECT as ChannelTypeEnum.DIRECT;
  public id = 'slack';
  private urlPostMessage = 'https://slack.com/api/chat.postMessage';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      applicationId: string;
    }
  ) {}

  async sendMessage(data: IDirectOptions): Promise<ISendMessageSuccessResponse> {
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
