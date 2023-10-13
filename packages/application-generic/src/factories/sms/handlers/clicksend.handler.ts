import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ClicksendSmsProvider } from '@novu/clicksend';
import { BaseSmsHandler } from './base.handler';

export class ClicksendSmsHandler extends BaseSmsHandler {
  constructor() {
    super('clicksend', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      username: credentials.user,
      apiKey: credentials.apiKey,
    };

    this.provider = new ClicksendSmsProvider(config);
  }
}
