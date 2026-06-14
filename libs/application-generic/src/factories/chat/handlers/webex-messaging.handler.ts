import { WebexMessagingProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class WebexMessagingHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.WebexMessaging, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.token) {
      throw Error('Invalid credentials');
    }

    this.provider = new WebexMessagingProvider({
      token: credentials.token,
      baseUrl: credentials.baseUrl,
    });
  }
}
