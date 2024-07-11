import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { BrevoEmailProvider } from '@novu/providers';
import { BaseHandler } from './base.handler';

export class SendinblueHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.Sendinblue, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string; senderName: string } = {
      apiKey: credentials.apiKey as string,
      from: from as string,
      senderName: credentials.senderName as string,
    };

    this.provider = new BrevoEmailProvider(config);
  }
}
