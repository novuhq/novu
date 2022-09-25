import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios from 'axios';

export class WhatsappProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'whatsapp';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      phoneNumberId: string;
      token: string;
    }
  ) {}

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const url = `https://graph.facebook.com/v14.0/${this.config.phoneNumberId}/messages`;

    const headers = {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    };

    const content = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: data.to,
      type: 'text',
      text: {
        preview_url: false,
        body: data.content,
      },
    };

    const response = await this.axiosInstance.post(url, content, headers);

    return {
      id: response.data.messages.id,
      date: new Date().toISOString(),
    };
  }
}
