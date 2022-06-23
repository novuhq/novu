import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { MailjetEmailProvider, MailjetConfig } from '@novu/mailjet';
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
