import { EmailJsConfig } from '@notifire/emailjs/build/main/lib/emailjs.config';
import { EmailJsProvider } from '@notifire/emailjs';
import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { BaseHandler } from './base.handler';

export class EmailJsHandler extends BaseHandler {
  constructor() {
    super('emailjs', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: EmailJsConfig = {
      from,
      host: credentials.host,
      port: Number(credentials.port),
      secure: credentials.secure,
      user: null,
      password: credentials.password,
    };

    this.provider = new EmailJsProvider(config);
  }
}
