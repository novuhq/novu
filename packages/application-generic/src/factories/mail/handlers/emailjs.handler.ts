import { IEmailJsConfig } from '@novu/emailjs/build/main/lib/emailjs.config';
import { EmailJsProvider } from '@novu/emailjs';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseHandler } from './base.handler';

export class EmailJsHandler extends BaseHandler {
  constructor() {
    super('emailjs', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: IEmailJsConfig = {
      from,
      host: credentials.host,
      port: Number(credentials.port),
      secure: credentials.secure,
      user: credentials.user,
      password: credentials.password,
    };

    this.provider = new EmailJsProvider(config);
  }
}
