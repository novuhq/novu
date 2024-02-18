import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SimpletextingSmsProvider } from '@novu/simpletexting';
import { BaseSmsHandler } from './base.handler';

export class SimpletextingSmsHandler extends BaseSmsHandler {
  constructor() {
    super('simpletexting', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      apiKey: credentials.apiKey,
      accountPhone: credentials.from,
    };

    this.provider = new SimpletextingSmsProvider(config);
  }
}
