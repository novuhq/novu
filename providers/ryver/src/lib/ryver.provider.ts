import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class RyverChatProvider implements IChatProvider {
  id = 'ryver';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  public static BASE_URL = 'https://vishalkhoje.ryver.com/api/1/odata.svc';

  constructor(
    private config: {
      userId?: string;
      password?: string;
      clientId?: string;
    }
  ) {}

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const params = {
      username: this.config.userId,
      password: this.config.password,
      workrooms: this.config.clientId,
    };

    const autherisation = Buffer.from(
      `${params?.username}:${params.password}`
    ).toString('base64');

    const data = JSON.stringify({
      createSource: {
        displayName: 'Ryver API',
      },
      body: options.content ?? 'test Ryver msg',
    });

    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Basic ' + autherisation,
      },
      body: JSON.stringify(data),
    };

    const workroomsPath = `/workrooms(${params?.workrooms})/Chat.PostMessage()`;

    const url = new URL(RyverChatProvider.BASE_URL + workroomsPath);
    const response = await this.axiosInstance.post(url.toString(), opts);

    return {
      id: response.data?.d?.id,
      date: new Date().toISOString(),
    };
  }
}
