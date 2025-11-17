import { TelegramChatProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';

export class TelegramHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Telegram, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: { token: string } = { token: credentials.token as string };
    this.provider = new TelegramChatProvider(config);
  }
}
