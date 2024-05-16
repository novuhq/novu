import axios from 'axios';
import {
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  ChannelTypeEnum,
} from '@novu/stateless';

export class UnifonicSmsProvider implements ISmsProvider {
  public readonly DEFAULT_BASE_URL =
    'https://el.cloud.unifonic.com/rest/SMS/messages';
  id = 'unifonic-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      appSid: string;
      senderId: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const data = {
      AppSid: this.config.appSid,
      SenderID: this.config.senderId,
      Recipient: options.to,
      Body: options.content,
    };

    const url = this.DEFAULT_BASE_URL;
    const result = await axios.post(url, data);

    return {
      id: result.data?.data?.MessageID,
      date: result.data?.data?.TimeCreated,
    };
  }
}
