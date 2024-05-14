import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { WhatsappBusinessChatProvider } from '@novu/providers';
import { BaseChatHandler } from './base.handler';

export class WhatsAppBusinessHandler extends BaseChatHandler {
  constructor() {
    super('whatsapp-business', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new WhatsappBusinessChatProvider({
      accessToken: credentials.apiToken,
      phoneNumberIdentification: credentials.phoneNumberIdentification,
    });
  }
}
