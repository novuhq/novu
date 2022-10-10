import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class WhatsappProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public id = 'whatsapp';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      accountSid: string;
      token: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = `https://graph.facebook.com/v14.0/${this.config.accountSid}/messages`;

    const headers = {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    };

    const content = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.to,
      type: 'text',
      text: {
        preview_url: false,
        body: options.content,
      },
    };

    const response = await this.axiosInstance.post(url, content, headers);

    return {
      id: response.data.messages[0].id,
      date: new Date().toISOString(),
    };
  }
}
