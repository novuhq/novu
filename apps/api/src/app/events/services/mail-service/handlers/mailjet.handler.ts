import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { MailjetEmailProvider } from '@notifire/mailjet';
import { BaseHandler } from './base.handler';

export class MailjetHandler extends BaseHandler {
  constructor() {
    super('mailjet', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: { apiKey: string; apiSecret: string; from: string } = {
      from,
      apiKey: credentials.apiKey,
      apiSecret: credentials.secretKey,
    };

    this.provider = new MailjetEmailProvider(config);
  }
}
