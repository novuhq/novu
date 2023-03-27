import { MailgunEmailProvider } from '@novu/mailgun';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
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
    } = {
      apiKey: credentials.apiKey as string,
      username: credentials.user as string,
      domain: credentials.domain as string,
      from: from as string,
    };

    this.provider = new MailgunEmailProvider(config);
  }
}
