import { ChannelTypeEnum } from '@novu/shared';
import { SlackDmChatProvider } from '@novu/slack-dm';
import { BaseChatHandler } from './base.handler';

export class SlackDmHandler extends BaseChatHandler {
  constructor() {
    super('slack-dm', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials) {
    const config: { apiKey: string } = { apiKey: credentials.apiKey };

    this.provider = new SlackDmChatProvider(config);
  }
}
