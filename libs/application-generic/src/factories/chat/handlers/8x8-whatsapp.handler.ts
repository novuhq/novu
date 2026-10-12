import { EightByEightWhatsAppChatProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class EightByEightWhatsAppHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.EightByEightWhatsApp, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new EightByEightWhatsAppChatProvider({
      apiKey: credentials.apiKey,
      subAccountId: credentials.subAccountId,
    });
  }
}
