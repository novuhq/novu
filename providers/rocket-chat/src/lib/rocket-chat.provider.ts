import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class RocketChatChatProvider implements IChatProvider {
  id = 'rocket-chat';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      token?: string;
      user?: string;
      idPath?: string;
      roomId?: string;
    }
  ) {}

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    let payload = {
      message: {
        rid: this.config.roomId,
        msg: options.content,
      },
    };
    try {
      // take whatever json payload client enters (this is for optional params)
      payload = JSON.parse(options.content);
      payload.message.rid = this.config.roomId;
    } catch (err) {}

    const headers = {
      'x-auth-token': this.config.token,
      'x-user-id': this.config.idPath,
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
