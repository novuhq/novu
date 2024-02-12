import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class KannelSmsProvider implements ISmsProvider {
  id = 'kannel';
  apiBaseUrl: string;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      host: string;
      port: string;
      from: string;
      username?: string;
      password?: string;
    }
  ) {
    this.apiBaseUrl = `http://${config.host}:${config.port}/cgi-bin`;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = this.apiBaseUrl + '/sendsms';
    const queryParameters = {
      username: this.config.username,
      password: this.config.password,
      from: options.from || this.config.from,
      to: options.to,
      text: options.content,
    };

    const result = await axios.get(url, {
      params: queryParameters,
    });

    return {
      id: options.id,
      date: new Date().toDateString(),
    };
  }
}
