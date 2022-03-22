import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { SendinblueEmailProvider } from '@notifire/sendinblue';
import { BaseHandler } from './base.handler';

export class SendinblueHandler extends BaseHandler {
  constructor() {
    super('sendinblue', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: { apiKey: string } = { apiKey: credentials.apiKey };

    this.provider = new SendinblueEmailProvider(config);
  }
}
