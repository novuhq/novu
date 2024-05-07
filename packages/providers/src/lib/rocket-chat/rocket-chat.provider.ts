import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class RocketChatProvider implements IChatProvider {
  id = 'rocket-chat';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      token: string;
      user: string;
    }
  ) {}

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const roomId = options.channel;
    const payload = {
      message: {
        rid: roomId,
        msg: options.content,
      },
    };
    const headers = {
      'x-auth-token': this.config.token,
      'x-user-id': this.config.user,
      'Content-Type': 'application/json',
    };
    const baseURL = `${options.webhookUrl.toString()}/api/v1/chat.sendMessage`;
    const { data } = await this.axiosInstance.post(baseURL, payload, {
      headers: headers,
    });

    return {
      id: data.message._id,
      date: data.message.ts,
    };
  }
}
