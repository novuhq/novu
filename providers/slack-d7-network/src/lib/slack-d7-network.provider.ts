import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';

export class SlackD7NetworkChatProvider implements IChatProvider {
  id = 'slack-d7-network';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {}

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    return {
      id: 'id_returned_by_provider',
      date: 'current_time',
    };
  }
}
