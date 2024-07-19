import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { Outlook365Provider } from '@novu/providers';
import { BaseHandler } from './base.handler';

export class Outlook365Handler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.Outlook365, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      from: string;
      senderName: string;
      password: string;
    } = {
      from: credentials.from as string,
      senderName: credentials.senderName as string,
      password: credentials.password as string,
    };
    this.provider = new Outlook365Provider(config);
  }
}
