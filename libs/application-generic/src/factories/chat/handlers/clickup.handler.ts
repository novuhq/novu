import { ClickUpProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';

export class ClickUpHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.ClickUp, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new ClickUpProvider({
      apiKey: credentials.apiKey as string,
    });
  }
}
