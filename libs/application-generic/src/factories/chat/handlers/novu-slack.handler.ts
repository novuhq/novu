import { SlackProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';

import { BaseChatHandler } from './base.handler';

export class NovuSlackHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Novu, ChannelTypeEnum.CHAT);
  }

  buildProvider() {
    this.provider = new SlackProvider();
  }
}
