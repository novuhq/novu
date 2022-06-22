import { MailgunConfig } from '@novu/mailgun/build/main/lib/mailgun.config';
import { MailgunEmailProvider } from '@novu/mailgun';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseHandler } from './base.handler';

export class MailgunHandler extends BaseHandler {
  constructor() {
    super('mailgun', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from: string) {
    const config: MailgunConfig = { apiKey: credentials.apiKey, username: credentials.user, domain: credentials.domain, from };

    this.provider = new MailgunEmailProvider(config);
  }
}
