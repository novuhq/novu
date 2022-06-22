import { MailjetConfig } from '@novu/mailjet/build/main/lib/mailjet.config';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { MailjetEmailProvider } from '@novu/mailjet';
import { BaseHandler } from './base.handler';

export class MailjetHandler extends BaseHandler {
  constructor() {
    super('mailjet', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: MailjetConfig = {
      from,
      apiKey: credentials.apiKey,
      apiSecret: credentials.secretKey,
    };

    this.provider = new MailjetEmailProvider(config);
  }
}
