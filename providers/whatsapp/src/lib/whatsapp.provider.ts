import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class WhatsappChatProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'whatsapp';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      method: 'post',
      url: 'https://api.d7networks.com/whatsapp/v1/send',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer {{api_access_token}}'
      }
    }
  ) {
  }

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {


    return {
      id: 'id_returned_by_provider',
      date: 'current_time'
    };
  }
}
