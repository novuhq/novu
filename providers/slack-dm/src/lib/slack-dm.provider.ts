import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
// import { WebClient } from '@slack/web-api';
import { getSlackWebClientInstance } from '../services/SlackWebClientService';

export class SlackDmChatProvider implements IChatProvider {
  id = 'slack-dm';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {}

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const slackWebClient = getSlackWebClientInstance(this.config.apiKey);
    await slackWebClient.chat.postMessage({
      channel: options.webhookUrl, //webhookUrl is Slack Member ID
      text: options.content,
    });

    return {
      id: 'id_returned_by_provider',
      date: 'current_time',
    };
  }
}
