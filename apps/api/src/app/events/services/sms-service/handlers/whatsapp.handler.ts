import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseSmsHandler } from './base.handler';
import { WhatsappProvider } from '@novu/whatsapp';

export class WhatsappHandler extends BaseSmsHandler {
  constructor() {
    super('whatsapp', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      accountSid: string;
      token: string;
    } = { accountSid: credentials.accountSid, token: credentials.token };

    this.provider = new WhatsappProvider(config);
  }
}
