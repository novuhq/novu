import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class WhatsappBusinessChatProvider implements IChatProvider {
  public readonly BASE_URL = 'https://graph.facebook.com/';
  id = 'whatsapp-business';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  constructor(
    private config: {
      apiKey: string;
      apiVersion: string;
      applicationId: string;
    }
  ) {}

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.channel,
      type: 'template',
      template: JSON.parse(options.content),
    };

    const url = `${this.BASE_URL}/${this.config.apiVersion}/${this.config.applicationId}/`;
    const response = await axios.post(url, data);

    return {
      id: response.headers['x-fb-request-id'],
      date: new Date().toISOString(),
    };
  }
}
