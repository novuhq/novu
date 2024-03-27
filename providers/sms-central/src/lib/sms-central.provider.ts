import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class SmsCentralSmsProvider implements ISmsProvider {
  public readonly DEFAULT_BASE_URL = 'https://my.smscentral.com.au/api/v3.2';
  id = 'sms-central';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      username: string;
      password: string;
      from: string;
      baseUrl?: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const data = {
      ACTION: 'send',
      ORIGINATOR: options.from || this.config.from,
      USERNAME: this.config.username,
      PASSWORD: this.config.password,
      RECIPIENT: options.to,
      MESSAGE_TEXT: options.content,
    };

    const url = this.config.baseUrl || this.DEFAULT_BASE_URL;
    await axios.post(url, data);

    return {
      id: options.id,
      date: new Date().toISOString(),
    };
  }
}
