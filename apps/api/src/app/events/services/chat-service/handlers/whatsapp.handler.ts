import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { WhatsappProvider } from '@novu/whatsapp';

export class WhatsappHandler extends BaseChatHandler {
  constructor() {
    super('whatsapp', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      phoneNumberId: string;
      token: string;
    } = { phoneNumberId: credentials.phoneNumberId, token: credentials.token };

    this.provider = new WhatsappProvider(config);
  }
}
