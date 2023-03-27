import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { FiretextSmsProvider } from '@novu/firetext';

import { BaseSmsHandler } from './base.handler';

export class FiretextSmsHandler extends BaseSmsHandler {
  constructor() {
    super('firetext', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new FiretextSmsProvider({ apiKey: credentials.apiKey, from: credentials.from });
  }
}
