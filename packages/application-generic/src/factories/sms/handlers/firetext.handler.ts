import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { FiretextSmsProvider } from '@novu/firetext';

export class FiretextSmsHandler extends BaseSmsHandler {
  constructor() {
    super('firetext', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new FiretextSmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
