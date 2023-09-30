import { MailgunEmailProvider } from '@novu/mailgun';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseHandler } from './base.handler';

export class MailgunHandler extends BaseHandler {
  constructor() {
    super('mailgun', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: {
      apiKey: string;
      username: string;
      domain: string;
      from: string;
      baseUrl?: string;
    } = {
      apiKey: credentials.apiKey,
      username: credentials.user,
      domain: credentials.domain,
      baseUrl: credentials.baseUrl,
      from: from as string,
    };

    this.provider = new MailgunEmailProvider(config);
  }
}
