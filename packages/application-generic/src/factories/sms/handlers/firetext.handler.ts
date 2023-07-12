import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
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
