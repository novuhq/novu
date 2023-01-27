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
      from: from as string,
      host: credentials.host as string,
      port: Number(credentials.port),
      secure: credentials.secure as boolean,
      user: credentials.user as string,
      password: credentials.password as string,
    };

    this.provider = new EmailJsProvider(config);
  }
}
