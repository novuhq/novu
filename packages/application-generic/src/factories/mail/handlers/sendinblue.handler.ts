import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { SendinblueEmailProvider } from '@novu/sendinblue';
import { BaseHandler } from './base.handler';

export class SendinblueHandler extends BaseHandler {
  constructor() {
    super('sendinblue', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; senderName: string; from: string } = {
      apiKey: credentials.apiKey,
      senderName: credentials.senderName,
      from: from,
    };

    this.provider = new SendinblueEmailProvider(config);
  }
}
