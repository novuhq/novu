import { MailgunEmailProvider } from '@notifire/mailgun';
import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { BaseHandler } from './base.handler';

export class MailgunHandler extends BaseHandler {
  constructor() {
    super('mailgun', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from: string) {
    const config: {
      apiKey: string;
      username: string;
      domain: string;
      from: string;
    } = { apiKey: credentials.apiKey, username: null, domain: credentials.domain, from };

    this.provider = new MailgunEmailProvider(config);
  }
}
