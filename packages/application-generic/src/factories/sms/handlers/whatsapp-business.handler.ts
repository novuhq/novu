import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { WhatsappBusinessSmsProvider } from '@novu/whatsapp-business';
import { BaseSmsHandler } from './base.handler';

export class WhatsAppBusinessHandler extends BaseSmsHandler {
  constructor() {
    super('whatsapp-business', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new WhatsappBusinessSmsProvider({
      accessToken: credentials.apiToken,
      phoneNumberIdentification: credentials.phoneNumberIdentification,
    });
  }
}
