import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class WhatsappChatProvider implements IChatProvider {
  public id = 'whatsapp';
  private axiosInstance = axios.create();
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = 'https://api.d7networks.com/whatsapp/v1/send';
    const data = {
      message: [
        {
          originator: options.from,
          recipients: [options.to],
          content: {
            message_type: 'TEXT',
            text: options.content,
          },
        },
      ],
    };

    const config = {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    };

    const chatResponse = await this.axiosInstance.post(url, data, config);

    return {
      id: chatResponse.data.id,
      date: new Date().toISOString(),
    };
  }
}
