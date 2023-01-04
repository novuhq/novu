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
      apiKey: credentials.apiKey as string,
      senderName: credentials.senderName as string,
      from: from as string,
    };

    this.provider = new SendinblueEmailProvider(config);
  }
}
