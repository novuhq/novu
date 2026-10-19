import { TelegramChatProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class TelegramHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Telegram, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new TelegramChatProvider({
      botToken: credentials.apiToken as string,
    });
  }
}
