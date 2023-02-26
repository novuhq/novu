import { ChannelTypeEnum } from '@novu/shared';
import { SendgridEmailProvider } from '@novu/sendgrid';
import { BaseHandler } from './base.handler';

export class SendgridHandler extends BaseHandler {
  constructor() {
    super('sendgrid', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials, from?: string) {
    const config: {
      apiKey: string;
      from: string;
      senderName: string;
      ipPoolName?: string;
    } = {
      apiKey: credentials.apiKey,
      from: from as string,
      senderName: credentials.senderName,
      ipPoolName: credentials.ipPoolName,
    };

    this.provider = new SendgridEmailProvider(config);
  }
}
