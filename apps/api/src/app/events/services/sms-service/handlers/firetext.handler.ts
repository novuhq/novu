import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
import { FiretextSmsProvider } from '@novu/firetext';

export class FiretextSmsHandler extends BaseSmsHandler {
  constructor() {
    super('firetext', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      from: string;
    } = { apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new FiretextSmsProvider(config);
  }
}
