import { WebexMessagingProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class WebexMessagingHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.WebexMessaging, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new WebexMessagingProvider({
      baseUrl: credentials.baseUrl,
    });
  }
}
