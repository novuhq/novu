import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';
import qs from 'qs';

interface IUnifonicConfig {
  appSid: string;
  senderId: string;
}

export class UnifonicSmsProvider implements ISmsProvider {
  id = 'unifonic';
  channelType = ChannelTypeEnum.SMS as const;

  constructor(private config: IUnifonicConfig) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const data = qs.stringify({
      AppSid: this.config.appSid,
      SenderID: this.config.senderId,
      Recipient: options.to,
      Body: options.content,
      responseType: 'JSON',
      baseEncode: true,
    });

    const response = await axios.post(
      'https://el.cloud.unifonic.com/rest/SMS/messages',
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data && response.data.messageID) {
      return {
        id: response.data.messageID,
        date: new Date().toISOString(),
      };
    }

    throw new Error(
      `Unifonic SMS failed: ${JSON.stringify(response.data || {})}`
    );
  }
}
