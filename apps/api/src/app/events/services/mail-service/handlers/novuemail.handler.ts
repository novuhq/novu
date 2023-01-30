import { ChannelTypeEnum } from '@novu/shared';
import { NovuEmailProvider } from '@novu/novu-email';
import { BaseHandler } from './base.handler';

export class NovuEmailHandler extends BaseHandler {
  constructor() {
    super('novu-email', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials) {
    const config: { apiKey: string | undefined; from: string; senderName: string } = {
      senderName: credentials.senderName ?? 'Novu',
      apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
      from: 'no-reply@novu.co',
    };

    this.provider = new NovuEmailProvider(config);
  }
}
