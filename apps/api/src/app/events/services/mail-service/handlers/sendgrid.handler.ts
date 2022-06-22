import { SendgridConfig } from '@novu/sendgrid/build/main/lib/sendgrid.config';
import { ChannelTypeEnum } from '@novu/shared';
import { SendgridEmailProvider } from '@novu/sendgrid';
import { BaseHandler } from './base.handler';

export class SendgridHandler extends BaseHandler {
  constructor() {
    super('sendgrid', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials, from: string) {
    const config: SendgridConfig = { apiKey: credentials.apiKey, from };

    this.provider = new SendgridEmailProvider(config);
  }
}
